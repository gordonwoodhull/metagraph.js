# Compile-Time Topological Sort Exploration

This note explores what it would take to replace the runtime `topological_sort()` helper with a pure type-level implementation once patterns are expressed as literal types. It captures the pieces we already understand, the experiments we still need to run, and the questions the human can help resolve up front.

---

## 1. What We Know How to Build

### 1.1 Graph Representation at the Type Level
- **Shape**: Model a graph as a literal `{ nodes: readonly NodeKey[]; edges: readonly EdgeSpec[] }`, where `EdgeSpec` is `{ source: NodeKey; target: NodeKey }`.
- **Source**: We already have this data inside the AST for each pattern; composing literal patterns gives us the full adjacency list as literal tuples.
- **Action**: Create utility types `GraphNodes`, `GraphEdges`, `IncomingEdges<N>`, etc. that operate on those tuples via conditional types.

### 1.2 Partition Roots vs Non-Roots
- **Intent**: At each step, find nodes with no incoming edges (roots) and those that still have incoming edges.
- **Type sketch**:
  ```ts
  type HasIncoming<Edges, Node> = ...;
  type Partition<Nodes, Edges> = {
    roots: ExtractRootNodes<...>;
    nonRoots: ExtractRemainingNodes<...>;
  };
  ```
- **Confidence**: This is the same pattern we already use in `ComposePatternSpec` (we reduce unions by branching on the tuple head). Should compile for small graphs.

### 1.3 Recursive Emission
- **Approach**: `TopoSort<Graph>` recursively emits `roots` to the output tuple, then calls itself on the graph with those roots removed plus all edges originating from them removed.
- **Base cases**:
  - Empty node list → return empty tuple.
  - Partition yields some roots → emit them, recurse on remainder.
- **Cycle detection**: If `roots` is empty but `nonRoots` isn’t, we hit a cycle. We can surface this as `never` or `{ __cycle__: RemainingNodes }`.
- **Deliverable**: Define `type TopoSort<G extends GraphSpec> = ...` returning `readonly NodeKey[]`.

### 1.4 Integration Hooks
- **Usage**: `ComposePatternSpec` can use `TopoSort` at the type level to produce the evaluation order for composed patterns.
- **Runtime**: Eventually replace the runtime `topological_sort()` call in `compose.ts` with an identity function that lives only for backwards compatibility.
- **Tests**: Add type assertions in `plans/example-types.ts` or new spec files to verify that known graphs sort as expected.

---

## 2. Unknowns & Experiments

### 2.1 Recursion Depth Limits
- TypeScript’s type recursion depth is ~50 (the `--maxNodeModuleJsDepth` style errors). We need to measure how many nodes we can handle before the compiler gives up.
- **Experiment**: Build synthetic graphs with 10, 20, 40 nodes; run `tsc --noEmit` to confirm we still get results.
- **Fallback**: If real customer graphs exceed that limit, we may need a hybrid model (type-level validation + runtime fallback).

### 2.2 Performance & Diagnostic Quality
- Complex conditional types can slow compilation. We should monitor `tsc --extendedDiagnostics` once the topo sort is in place.
- The error when we hit a cycle or recursion limit will be cryptic (`Type instantiation is excessively deep`). Consider adding a friendly sentinel type in the failure branch (`{ __compile_time_cycle__: RemainingNodes }`) so users see meaningful errors.

### 2.3 Alias/Augmentation Behavior
- Our graphs aren’t pure nodes—they carry alias metadata (parent/child). The topo sort itself only needs node keys, but we must ensure the type-level graph we feed it is the correct “namespace graph” (pattern nodes, not interface nodes).
- Need to confirm whether the alias map ever introduces multi-edges or self loops that the type-level sorter must handle specially.

### 2.4 Stage 3 Interaction
- Eventually Stage 3 wants typed method signatures. The topo sort might need to expose extra metadata (e.g. track which nodes are roots for interface assembly). We should keep this possibility in mind before finalizing the type signature.

---

## 3. Decisions for the Human

1. **Scope of Type-Level Sort**  
   - Do you want the compiler to *reject* graphs with cycles (i.e. `TopoSort` becomes `never`), or just surface a soft warning type?  
   - Should we provide a runtime fallback for large graphs, or is “literal compose graphs will remain small” an acceptable constraint?

2. **Developer Experience**  
   - Are we comfortable requiring pattern authors to write literal arrays of node keys in their spec? Or should we generate the node list automatically and only expect edges?  
   - Do we expose `TopoSort` publicly (for advanced users), or keep it internal to the compose pipeline?

3. **Testing Strategy**  
   - Happy path tests: we can add `type Sorted = TopoSort<GraphSpec>` comparisons in a new `plans/type-toposort.spec.ts` file. Are you okay with “compile-only” tests that rely on `type ExpectTrue` style helpers?  
   - Failure tests: for cyclic graphs, should we include dedicated fixtures even though they won’t emit runtime code?

4. **Rollout Strategy**  
   - When the type-level sorter lands, should we ship it behind an optional type flag (e.g. `type UseTypeTopoSort = true`) so we can back out if the community hits compiler limits?

---

## Next Steps

1. Implement the type helpers (`HasIncoming`, `Partition`, `RemoveNodes`, `RemoveEdges`, `TopoSort`) in a scratch file under `plans/` and run `tsc --noEmit` to benchmark the recursion depth.
2. Validate the helper with the existing `graph_pattern`/`subgraph_pattern` composition graph to ensure alias mapping doesn’t break the sort.
3. If performance is acceptable, integrate the type-level sort into `ComposePatternSpec` and add compile-time tests.
4. Seek your input on the open questions above before we remove the runtime sorter, so the path forward is locked in for next week’s work.
