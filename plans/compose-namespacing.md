## Goal
Replace the runtime graph-based composition (`compose()`) with a purely AST-driven version that keeps literal keys intact.

## Baseline (current compose)
- For each pattern node `pat`, we build:
  - `flowspecs[pat.key()]`: dataflow graph produced by `graph_detect` over `pat.value().dataflow` (runtime nodes).
  - `built[pat.key()]`: interface graph produced via `graph_detect` over `pat.value().interface` (runtime nodes).
- Then we merge nodes/edges by prefixing keys with `pat.key() + '.'` and adjusting explicit string references.

## Desired AST approach
1. **Source AST**
   - Each pattern produced via `definePattern` has:
     - `spec.ast.dataflow.nodes`: array of `{ key, factory, refs, ins, deps }`.
     - `spec.ast.interface.nodes`: `KeyValue[]` (each value may include a string reference to another node).
     - `spec.ast.interface.edges`: `KeyValue[]` with `value.source`, `value.target`, `value.deps`.

2. **Mapping requirements**
   - For each pattern key `P`, local dataflow key `K` → global key `P.K`.
   - `refs`, `ins`, `deps` inside the dataflow AST must be rewritten
       - If they refer to local nodes, prefix with `P.`.
       - If they refer to another pattern input (e.g., `parent.node_by_key`), follow the compose graph edges to map to the source prefix (e.g., `graph.node_by_key`).
   - Interface node references (strings inside `spec.ast.interface.nodes`) must undergo the same mapping.
   - Interface edge dependencies (`value.deps`) must also be mapped.

3. **Implementation sketch**
   - Build a dependency graph using the runtime `composition` edges (the `composition` graph passed into `compose`). Each edge carries `input` field specifying which namespace to connect.
   - For each pattern `P`, create a function `mapName(localOrQualified: string): string` that:
       1. Splits on first `.`.
       2. If prefix matches a known input alias (`parent`, `child`, etc.), use the dependency graph to find the upstream pattern key and return upstream prefix + local key.
       3. Otherwise treat as local: prefix with `P.`.
   - For interface nodes we also need final `mappings` to collapse duplicate nodes (like current runtime behaviour). Keep that logic but replace string munging with calls to `mapName`.
   - Dataflow AST merging:
       - For each node in `spec.ast.dataflow.nodes`, push a new AST entry `{ key: mapName(node.key), factory…, refs: node.refs.map(mapName), … }`.
       - Compose overall AST by concatenation.
   - After building `globalDataflow` array, call `definePattern` with `dataflow: { incidences: buildDataflowIncidences(globalDataflow) }`.
   - Provide `flowspecs` map for `pattern(composedSpec, flowspecs)` where `flowspecs[P] = spec.ast.dataflow.nodes`.

## Next actions
- Implement a `NameMapper` helper that encapsulates the dependency lookups.
- Update tests (especially `subgraph`) to ensure names are remapped correctly.
