# Type-Driven Rebuild Plan for `metagraph.js`

The objective is to author the entire library through TypeScript type metadata. Users (including us) will describe patterns, graphs, and dataflows as compile-time structures; the runtime API is then a generated artifact that mirrors those types. This document captures enough structure that an LLM—or a human—could perform the rewrite in a single coherent pass.

---

## 0. Guiding Principles
- **Types are the source of truth**: Every datum currently assembled at runtime (`PatternDefinition`, dataflow specs, interface wiring) must originate from type literals. The runtime implementations simply interpret the metadata.
- **Payload-aware safety**: Node and edge payload types participate in the type system. Method signatures (`node().value()`, `edge().source()`) reflect the declared payloads and accessors.
- **Strict validation**: Ill-formed specs (missing dependencies, cycles, mismatched accessors) should fail to compile. Runtime checks become last-resort assertions.
- **Direct user exposure**: `graph_pattern` and `subgraph_pattern` remain part of the public API but now accept typed specs or provide typed defaults.
- **Modern TypeScript**: Assume TS ≥ 5.3 with `satisfies`, const contexts, template literal inference, conditional type tail recursion, and `noUncheckedIndexedAccess` enabled.

---

## 1. From Runtime Metadata to Type Metadata

Today the library constructs a web of metadata objects at runtime:

- `graph_pattern` / `subgraph_pattern` return plain objects describing dataflow nodes (`node`, `refs`, `ins`) and interface edges (`createable`, `lookupArg`, etc.).
- `pattern()` consumes that object, builds a `PatternDefinition`, and wires closures for method implementations and dataflow execution.
- `compose()` topologically sorts pattern nodes, rewrites `refs`, and merges the specs.

In the type-driven design we treat the runtime metadata as an **interpretation** of static type information. We first write the pattern as a type literal (possibly backed by a `const` value for runtime use), then provide a thin interpreter that turns that metadata into the imperative API.

### Example Translation

Runtime (current):
```ts
const spec = {
  dataflow: {
    incidences: {
      node_by_key: { node: map(), refs: 'Node', ins: 'nodes' },
      // …
    }
  },
  interface: {
    nodes: {
      Graph: createable('graph'),
      Node: [call('key')(options.nodeKey!), call('value')(options.nodeValue!)],
    },
    edges: {
      graph_node: {
        name: 'node',
        source: 'Graph',
        target: 'Node',
        deps: 'node_by_key',
        member: lookupArg(),
      },
      // …
    }
  }
};
```

Type-first design:
```ts
type GraphPatternSpec<PNode, PEdge> = PatternSpec<
  {
    Graph: Createable<'graph', GraphInstance<PNode, PEdge>>;
    Node: [
      Call<'key', NodeKeyAccessor<PNode>>,
      Call<'value', NodeValueAccessor<PNode>>
    ];
    Edge: [
      Call<'key', EdgeKeyAccessor<PEdge>>,
      Call<'value', EdgeValueAccessor<PEdge>>
    ];
  },
  {
    graph_node: Member<'Graph', 'Node', LookupArg<'node_by_key'>>;
    // …
  },
  {
    node_by_key: MapNode<'Node', 'nodes'>;
    // …
  }
>;

const graphPatternSpec = GraphPattern({
  interface: { /* const data matching the type literal above */ },
  dataflow: { /* const data matching the type literal above */ }
}) satisfies GraphPatternSpec<NodePayload, EdgePayload>;

export const graph_pattern = GraphPatternFactory(graphPatternSpec);
```

`GraphPatternFactory` interprets the metadata to produce the runtime object. The type alias `GraphPatternSpec` enforces that:
- `MapNode<'Node', 'nodes'>` refers to a declared interface node `Node` and dataflow dependency `nodes`.
- `Member<'Graph', 'Node', LookupArg<'node_by_key'>>` references an existing dataflow node `node_by_key`.
- The topological order derived from `interface` edges is acyclic.

This section exists to emphasize that **the runtime API is generated from the types**. Instead of copying runtime structures into types, we will design types that describe everything the runtime needs, then generate the runtime structures from those types.

---

## 2. Type Constructor Design (with Examples)

### 2.1 Core Building Blocks
- `KV<Key, Value>`: typed mirror of `KeyValue`, preserving literal keys.
- `GraphOptions<NodeKV, EdgeKV>`: generics capturing key/value/source/target accessors with precise input/output types.
- `DeepReadonly<T>`, `TupleToObject<T>`, `StringLiteralSet<T>`: utilities for canonicalizing specs and enforcing immutability.
- `QualifiedKey<Namespace, Name>`: branded string for dotted identifiers (`'graph.Graph'`) used in composition.

### 2.2 Dataflow Node Constructors (`src/dataflow_calcs.ts`)
For each runtime helper we supply:

```ts
type InputNode<Path extends string> = {
  kind: 'input';
  path: Path; // e.g., 'data.nodes' or 'parent.nodes'
  produces: Path extends `${infer NS}.${infer Field}`
    ? DataflowValue<NS, Field>
    : DataflowValue<'data', Path>;
};

type MapNode<Ref extends string, From extends string> = {
  kind: 'map';
  refs: Ref;
  ins: [From];
  produces: Record<NodeKeyOf<Ref>, WrappedNode<Ref>>;
};
```

Runtime counterpart:
```ts
const map = () => ({
  kind: 'map',
  calc: /* existing function */,
});
```

Other constructors follow the same pattern:

| Constructor | Sample Type | Produced Type |
|-------------|-------------|---------------|
| `SingletonNode` | `SingletonNode<'graph'>` | `never` (until initialized by interface) |
| `ListNode` | `ListNode<'Node', ['nodes', 'node_by_key']>` | `readonly WrappedNode<'Node'>[]` |
| `MapOfListsNode` | `MapOfListsNode<'Node', 'edges', EdgeSourceAccessor>` | `Record<NodeKey, readonly WrappedEdge[]>` |
| `SubsetNode` | `SubsetNode<'child.Node', ['parent_nodes', 'node_keys']>` | Filtered array typed by `WrappedNode<'child.Node'>` |
| `OutputNode` | `OutputNode<'subset_nodes'>` | Forwards value from dependency |

Each constructor encodes:
1. **Dependencies** (`ins`), validated against declared keys.
2. **Reference Target** (`refs`), validated against interface nodes.
3. **Output Type**, ensuring calculators’ runtime signatures line up with expected results.

### 2.3 Interface Member Constructors (`src/interface.ts`)
We define typed descriptors for every helper, e.g.:

```ts
type Createable<
  FlowKey extends string,
  Instance extends GraphInstance<any, any>
> = {
  kind: 'createable';
  flowKey: FlowKey;
  produces: Instance;
  method: {
    create(data: GraphInput<Instance>): Instance;
  };
};

type LookupArg<
  Dep extends string,
  Transform extends (arg: any) => string = (arg: any) => string
> = {
  kind: 'lookupArg';
  dep: Dep;
  transform: Transform;
  method: <MapVal>(
    map: Record<string, MapVal>
  ) => (arg: Parameters<Transform>[0]) => MapVal;
};
```

Examples:
- `Member<'Graph', 'Node', LookupArg<'node_by_key'>>` ensures the interface edge from `Graph` to `Node` depends on the `node_by_key` dataflow node and exposes `graph.node(key)`.
- `Member<'Node', 'Graph', Fetch>` exposes `node.graph()` returning the owning graph instance.
- `Member<'Edge', 'Node', LookupFVal<EdgeSourceAccessor>>` ensures the accessor’s return type matches the graph’s node instance.
- `SubgraphMember<'ParentGraph', 'ChildGraph', SubgraphSpec>` encodes method signatures for `subgraph` operations with typed `nodeKeys`, `edgeKeys`, and child payloads.

### 2.4 Pattern Specification Container
Define a higher-order type that binds interface nodes, interface edges, and dataflow nodes:

```ts
type PatternSpec<
  Nodes extends Record<string, PatternNode>,
  Edges extends Record<string, PatternEdge>,
  Dataflow extends Record<string, DataflowNode>
> = ValidateNoCycles<Edges> &
    ValidateRefs<Nodes, Edges, Dataflow> &
    {
      nodes: Nodes;
      edges: Edges;
      dataflow: Dataflow;
    };
```

`graph_pattern` and `subgraph_pattern` will export pre-built specs conforming to these types while allowing user-specified payload generics. Consumers can also author custom specs using the same constructors.

---

## 3. Compile-Time Validation Infrastructure

### 3.1 Topological Sort and Cycle Detection
Adapt `experiment/type-toposort.ts` to support:
- Nodes identified by strings or dotted names.
- Edge definitions referencing `source` and `target` keys from interface specs.
- Output type `TopoSort<Spec>` returning a readonly tuple in valid order or `never` on cycles.

Integrate with `PatternSpec` so invalid specs yield an error:
```ts
type ValidateNoCycles<E extends Record<string, PatternEdge>> =
  TopoSort<{ nodes: EdgeNodes<E>; edges: EdgePairs<E> }> extends never
    ? ["Error: pattern contains a cycle", E]
    : unknown;
```

### 3.2 Dependency & Reference Checking
- `EnsureRefsExist<DataflowNode, Nodes>`: verify `refs` points at interface nodes.
- `EnsureDepsExist<Member, Dataflow>`: verify `deps` references declared dataflow keys.
- `EnsureInputsMatch<DataflowNode>`: confirm calculators’ expected input types correspond to the `ins` entries.
- `EnsureAccessorsMatch<NodeSpec>`: ensures `call('value')(...)` return types align with node payload generics.

### 3.3 Payload Propagation
- Define `NodePayload<NodeKey>` and `EdgePayload<EdgeKey>` derived from the spec.
- Ensure methods like `graph.node(k).value()` return the correct payload type.
- In subgraph specs, ensure parent and child graph payloads align (or provide mapping utilities if conversions are allowed).

### 3.4 Namespacing and Composition
When composing patterns:
- Extend validation to handle namespace prefixes (`graph.`, `sg.`, etc.).
- Ensure re-mapped refs still point to valid nodes after namespace rewriting.
- Validate cross-pattern dependencies before runtime composition.

---

## 4. Implementation Roadmap (Zero Back-Compat Constraints)

1. **Type Foundations**
   - Create utility modules: `src/types/utils.ts`, `src/types/dataflow.ts`, `src/types/interface.ts`.
   - Encode constructors for dataflow nodes and interface members with runtime companions.
   - Provide illustrative specs (e.g., `GraphPatternExample`) to confirm expressiveness.

2. **Typed Pattern Builders**
   - Rework `graph_pattern` & `subgraph_pattern` to emit typed metadata (both type aliases and runtime functions).
   - Export helpers so users can customize payload types via generics.

3. **Pattern Engine**
   - Rewrite `pattern()` to accept typed specs and generate runtime structures by interpreting metadata.
   - Update `define_dataflow` and related helpers to honor typed calculators and their signatures.

4. **Composition & Validation**
   - Implement type-level topo sort, dependency checks, and namespacing logic.
   - Update `compose()` to operate on typed specs, reusing the runtime interpreter.

5. **Runtime Classes**
   - Update `graph`, `graph_incidence`, `dataflow` implementa- tions to leverage typed specs for payload inference.
   - Remove dynamic metadata assembly that is now redundant, keeping runtime logic focused on execution.

6. **Testing & Documentation**
   - Add type tests that validate both success cases and intentional failures.
   - Update README/docs with examples of authoring patterns purely via types.

---

## 5. Testing & Tooling Strategy

### 5.1 Type Tests
- Introduce `tests/types/graph-pattern.test-d.ts` (or similar) using `tsd` or `vitest` + `expectTypeOf`.
- Cover scenarios:
  - Correctly typed graph pattern infers method signatures.
  - Subgraph pattern enforces matching payloads.
  - Invalid specs (e.g., missing `node_by_key`, cyclic dependencies) fail to compile.
  - Composition merges namespaces correctly.

### 5.2 Runtime Tests
- Retain and adapt existing Vitest suites; replace direct calls to untyped constructors with typed versions.
- Add regression tests ensuring runtime APIs produced from type metadata behave identically to previous version (nodes, edges, subgraphs, dataflow calculations).

### 5.3 Build & Lint
- Ensure `tsconfig.json` enables strict options and preserves literal types (`"exactOptionalPropertyTypes": true`, `"noUncheckedIndexedAccess": true`).
- Consider adding a `tsconfig.type-tests.json` if we adopt `tsd`.

---

## 6. File-by-File Refactor Notes

- `src/types.ts`: Split into specialized modules (`types/utils`, `types/graph`, `types/pattern`). Runtime type guards move to `src/runtime/type-guards.ts` if still required.
- `src/core.ts`: Keep helper functions but upgrade typings to leverage new payload generics.
- `src/graph.ts`: Parameterize `GraphImpl` with typed specs; expose `GraphInstance<Spec>` alias for consumers.
- `src/dataflow_calcs.ts`: Export paired type + runtime constructors (e.g., `export const MapNode = Object.assign(map, { type: <...> })` or provide namespace with `type` + `runtime` keys).
- `src/interface.ts`: Mirror the same pattern for interface helpers; ensure returned closures are generically typed.
- `src/pattern.ts`: Become the interpreter from type metadata to runtime API. Handle namespace-aware lookups and enforce typed dependencies.
- `src/compose.ts`: Use typed topo sort to validate and merge specs; produce both combined type metadata and runtime interpreter output.
- `src/dataflow.ts`: Tie into typed graph spec to derive node/edge calculation signatures.
- `src/index.ts`: Export all constructors (`Input`, `MapNode`, `Createable`, etc.) along with ready-made patterns (`graph_pattern`, `subgraph_pattern`).

---

## 7. Deliverables Checklist

1. Utility type modules with constructors for dataflow and interface metadata.
2. Typed `graph_pattern` and `subgraph_pattern` specs with runtime factories derived from them.
3. Rewritten `pattern()` that interprets typed metadata and enforces validation rules.
4. Type-level topo sort and dependency validation integrated into pattern composition.
5. Updated runtime graph/dataflow implementations leveraging the typed metadata.
6. Type and runtime test suites exercising the new system.
7. Documentation updates illustrating how to author patterns purely via types.

---

## 8. Open Questions

1. Should we expose ready-made helper types like `GraphPattern<NodePayload, EdgePayload>` vs. requiring consumers to assemble the metadata manually?
2. Do we want to publish diagnostic types (e.g., `PatternError<...>`) that produce readable compile-time error messages for bad specs?
3. Are there additional graph operations (beyond subgraphs) we should design for while reorganizing the type system?

Clarifying these will shape the ergonomics of the final API and the amount of scaffolding we place in `src/index.ts`.

