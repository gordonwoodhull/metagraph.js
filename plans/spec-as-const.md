# Spec-as-Const Rewrite Roadmap

This document explains how the current `metagraph.js` system operates and lays out a one-shot transformation plan to rebuild it around a single `as const` pattern specification that drives both compile-time typing and runtime behaviour. The steps assume the engineer has read every source file under `src/` and every test under `tests/`; any unfamiliar module should be revisited before coding begins.

---

## 1. Current Architecture (Read Before Refactoring)

### 1.1 Graph Core
- `src/core.ts` provides helpers such as `as_array` and `as_keyvalue` that normalise input collections.
- `src/types.ts` defines runtime-facing interfaces (`Graph`, `Node`, `Edge`, `Dataflow`, `PatternSpec`, etc.) and type guards. These interfaces are loosely typed (`any`) and describe structures assembled at runtime.
- `src/graph.ts` builds adjacency graphs. `graph()` accepts node/edge collections and lazily materialises `GraphImpl`; `graph_incidence()` derives edges from incidence data; `graph_detect()` auto-selects between adjacency/incidence formats. Key references:
  - Graph options & accessors: `src/graph.ts:4-34`
  - `GraphImpl` class wiring nodes/edges/ins/outs: `src/graph.ts:73-161`
  - Public constructors: `src/graph.ts:165-239`

### 1.2 Dataflow Engine
- `src/dataflow.ts` wraps a graph spec in a lazy evaluation engine. `DataflowInstanceImpl.calc` recursively traverses edges to compute node values (`src/dataflow.ts:13-26`), while `input(namespace, field)` fetches from the instantiation inputs, delegating to other `DataflowInstance`s if necessary (`src/dataflow.ts:28-35`).
- `src/dataflow_calcs.ts` exports factories used inside pattern specs:
  - `input`, `output`, `map`, `singleton`, `list`, `map_of_lists`, `subset` (`src/dataflow_calcs.ts:19-143`). Each returns an object with a `calc` closure that captures pattern definition details via `refs` and `ins`.

### 1.3 Interface & Pattern Assembly
- `src/interface.ts` defines runtime helpers (`createable`, `call`, `lookupArg`, `lookupFVal`, `lookupKVal`, `fetch`, `subgraph`). Each returns descriptors consumed by the pattern interpreter, embedding closures that reference dataflow graphs and pattern definitions.
  - Example: `createable` sets up `create(data)` to instantiate a dataflow graph & wrap node values (`src/interface.ts:18-33`).
  - `lookupArg` & friends shape method implementations via nested closures (`src/interface.ts:48-152`).
- `src/pattern.ts` interprets pattern specs:
  - Converts `spec.dataflow` and `spec.interface` into graphs via `graph_detect` (`src/pattern.ts:23-26`).
  - Builds `defn.node[...]` records for members/class_members and their wrappers (`src/pattern.ts:28-41`).
  - Resolves edge metadata (`member.funfun`, `deps`) into callable methods (`src/pattern.ts:43-69`).
  - Iterates interface nodes again to wire class & instance members (`src/pattern.ts:71-88`).
  - Rebuilds a runtime interface graph used as the public API (`src/pattern.ts:90-108`).
  - Exposes `define_dataflow` to convert dataflow graph nodes into `Dataflow` instances (`src/pattern.ts:110-121`).

### 1.4 Built-in Patterns & Composition
- `src/graph_pattern.ts` and `src/subgraph_pattern.ts` supply runtime specs using the helpers above. Both accept `opts` objects to configure accessors, and they construct nested object literals referencing runtime functions (`createable`, `map`, `lookupArg`, etc.).
- `src/compose.ts` composes pattern graphs:
  - Topologically sorts pattern nodes (`src/compose.ts:28-48`).
  - Rewrites dataflow `refs` with namespace prefixes.
  - Merges interface nodes/edges, remapping references via `lookup` (`src/compose.ts:62-99`).
  - Returns a combined pattern via `pattern(...)`.

### 1.5 Public Surface & Tests
- `src/index.ts` re-exports core functions, patterns, and helper aliases (`key`, `value`).
- Tests under `tests/` validate behaviour:
  - Graph basics (`tests/graph.test.ts`, `tests/incidence.test.ts`).
  - Pattern instantiation & laziness (`tests/graph-pattern.test.ts`).
  - Composition & subgraphs (`tests/subgraph.test.ts`).
  - Dataflow correctness (`tests/dataflow.test.ts`).
  - Topological sort (`tests/topological-sort.test.ts`).

---

## 2. Rewrite Goals (Spec-as-Const)

We will express each pattern/pipeline as a single `const spec = {...} as const` literal validated by TypeScript. The literal defines:

1. **Payload buckets** — named collections of runtime data with their structural types (e.g., `nodes`, `edges`, `ports`). These drive what `create` expects.
2. **Accessor slots** — named functions required at runtime (e.g., `nodeKey`, `edgeSource`, `groupByOwner`). The spec references them symbolically; the runtime builder receives concrete implementations.
3. **Interface graph** — nodes, edges, member definitions expressed via type constructors referencing payload buckets and accessors by name.
4. **Dataflow graph** — nodes describing calculators and wiring (`refs`, `ins`) using the same names.

The runtime library becomes an interpreter that reads the frozen spec, substitutes runtime accessors and input data, and produces the existing API. Types become the single source of truth; there is no manual duplication.

---

## 3. One-Shot Transformation Plan

### Step 0: Preparation
- Re-read every file in `src/` and `tests/` immediately before coding to refresh behaviour details. Pay attention to cross-file contracts (e.g., `pattern.ts`’s expectation of member descriptors from `interface.ts`).
- Document any assumptions or implicit invariants discovered during the read-through so they can be reified in the type system.

### Step 1: Design the Spec Schema
- Create a new module `src/spec.ts` (or similar) defining type constructors and runtime tags for:
  - Payload declarations (map of named buckets to value shapes).
  - Accessor declarations (map of names to function signatures).
  - Interface nodes (e.g., `Createable`, `Member`, `Call`, `Subgraph`).
  - Dataflow nodes (e.g., `Input`, `Map`, `List`, `MapOfLists`, `Subset`, `Singleton`, `Output`).
  - Dependency references (validated string literal keys).
- Define the **accessor handshake** explicitly:
  - The spec declares an `accessors` map type (e.g., `{ edgeSource: EdgeAccessor; groupByOwner: PortAccessor; }`).
  - At runtime, patterns receive an object `const accessors: AccessorMap = { ... }` whose keys match the spec; missing keys should result in a descriptive runtime error.
  - The interpreter resolves symbolic references (e.g., `LookupFVal<'edgeSource'>`) by looking up `accessors.edgeSource`.
- Ensure the schema handles arbitrary names, not just `nodes`/`edges`.
- Provide utility types to:
  - Extract payload types (`PayloadOf<'nodes'>`), keys, wrappers.
  - Extract accessor types (`AccessorOf<'edgeSource'>`).
  - Validate dependencies (`EnsureRefExists<'foo', Spec>`).
- Capture the shape of `PatternSpec` generically (`Spec<Payloads, Accessors, Interface, Dataflow>`).

### Step 2: Build Runtime Interpreters
- Implement `interpretPattern` (replacement for `pattern()`), which:
  1. Takes a frozen spec literal (`as const`) plus a runtime `accessors` object matching the spec’s accessor map.
  2. Materialises dataflow graphs by invoking runtime calculators corresponding to type constructors (retain the existing `calc` closures from `src/dataflow_calcs.ts`; they still execute at runtime using the resolved `defn` state).
  3. Materialises interface graphs by invoking runtime helpers (`createable`, `lookupArg`, etc.) using the supplied accessors.
  4. Produces a runtime interface graph (e.g., `Graph`) whose methods are typed according to the spec.
- Implement `interpretCompose` (replacement for `compose()`) that operates on spec literals:
  - Perform compile-time validated topological sort using the spec’s interface graph.
  - Rewrite namespace-qualified keys in dataflow and interface sections.
  - Emit a merged spec literal for further interpretation.
- Ensure interpreters rely solely on the spec literal and runtime accessors/data, not on ad-hoc mutations.

### Step 3: Reconstruct Helper Modules
- Update `src/dataflow_calcs.ts` and `src/interface.ts` to export paired type/runtime constructors aligned with the new spec schema.
  - Each helper should return a tagged object the interpreter can recognise.
  - Provide type aliases for authoring (e.g., `MapNode<'Node', 'nodes'>`) alongside runtime constructors used by interpreters.
- Audit both modules for lingering `any` usage before rewriting; document each case and eliminate it as part of the conversion.
- Replace ad-hoc `any` typings with precise generics tied to payload buckets and accessors.

### Step 4: Rewrite Built-in Specs
- Replace `graph_pattern` and `subgraph_pattern` with const-based specs:
  - Write `const graphPatternSpec = { ... } as const` using the new constructors (keep the literal readable; apply `as const` once at the end rather than sprinkling `readonly`).
  - Provide a factory function that accepts concrete accessors and returns an interpreter-produced runtime pattern.
  - For `subgraph_pattern`, ensure parent/child payload alignment is described by the spec, including any additional accessor slots needed.
- Update `src/index.ts` exports to expose the new spec literals and factory functions.
- Document the factory signature to preserve payload inference:
  - Pattern factories should be generic over the input data (`create<TData extends PayloadInput<Spec>>(data: TData): GraphInstance<InferPayloads<Spec, TData>>`).
  - Ensure TypeScript infers payload shapes from `data` so consumers do not need to annotate node/edge types manually.

### Step 5: Update Graph/Dataflow Runtimes
- Audit `src/graph.ts` and `src/dataflow.ts` up front, listing every remaining `any`/`unknown` fallback (e.g., default generics on `GraphImpl`, casts inside `DataflowInstanceImpl`).
- Parameterise both modules with types derived from the spec:
  - Ensure `graph()`/`graph_incidence()` accept data matching the declared payload buckets.
  - Wire runtime logic to pull accessor functions from the spec’s accessor map instead of ad-hoc `opts` objects.
- Remove runtime metadata now subsumed by the spec once typings align.

### Step 6: Compose Typed Patterns
- Refactor `src/compose.ts` to work entirely with spec literals:
  - Accept a spec-based composition graph.
  - Perform namespace remapping and produce a new const spec.
  - Pass the merged spec to the interpreter to obtain runtime behaviour.
- Ensure type-level validation catches cycles or missing dependencies before runtime (leveraging compile-time topo sort).

### Step 7: Tests & Validation
- Update existing tests under `tests/` to use the new API:
  - Instantiate patterns via the new factories and verify behaviour matches previous expectations.
  - Adjust data passed to `create` to align with typed payload buckets.
- Audit the test suite for lingering `any`/`unknown` casts; replace them with precise assertions derived from the new types.
- Introduce type-level tests (e.g., using `tsd` or `vitest` with `expectTypeOf`) to assert:
  - Payload inference propagates through interface methods.
  - Invalid specs (missing refs, cycles, wrong accessor names) produce compile-time errors.
- Run runtime tests to ensure behavioural parity.

### Step 8: Cleanup & Documentation
- Audit `src/types.ts` and related modules for residual `any`/`unknown` helpers; align them with the new spec-driven exports or delete them.
- Remove obsolete types/functions from `src/types.ts` that no longer fit the spec-driven model; move runtime guards if needed.
- Update README/docs to explain the new spec-as-const authoring style, including examples of:
  - Declaring custom payload buckets and accessors.
  - Building a pattern from a const spec and runtime accessors.
  - Composing multiple specs.

---

## 4. Source Anchors for Reference
- Graph core: `src/graph.ts:4-239`
- Pattern interpreter: `src/pattern.ts:1-121`
- Dataflow calculators: `src/dataflow_calcs.ts:1-143`
- Interface helpers: `src/interface.ts:1-192`
- Built-in specs: `src/graph_pattern.ts:1-141`, `src/subgraph_pattern.ts:1-101`
- Pattern composition: `src/compose.ts:1-102`
- Dataflow runtime: `src/dataflow.ts:1-76`
- Public exports: `src/index.ts:1-29`

Use these references while implementing each step to keep behaviour aligned with the existing system.
