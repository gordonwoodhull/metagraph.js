# Stage 2 Typing Progress (May 19, 2025)

## Current Architecture Snapshot

We have three runtime layers in play:

1. **Stage 1 – Dataflow/Interface declarations**
   - Already encoded in the AST via `definePattern`.
   - `GraphPattern` and `SubgraphPattern` specs now include `spec.ast.dataflow.nodes`, each entry carrying its factory and literal `refs`, `ins`, `deps`.

2. **Stage 2 – Binding dataflow nodes**
   - Pattern instantiation (`pattern()`) now rebuilds its local dataflow graph from the AST (cached via `buildDataflowIncidences` → `graph_incidence`).
   - `define_dataflow` can accept a `Graph`, `GraphSpec`, or the raw `DataflowAst` to produce a `Dataflow` (it still converts to a runtime graph internally, but driven by the AST).
   - The remaining gap: composed patterns. The `compose()` rewrite that namespaced the AST is on learning branches (`record-stage2-learning`, `record-stage2-learning-2`) but currently breaks because we mis-map names like `node_by_key`. For now, `type-pattern` still uses the original runtime-generated namespacing.

3. **Stage 3 – Interface wiring**
   - Still entirely runtime-based; the AST contains literal strings but we haven’t rewritten the interface graph builder yet.

## What worked

- `definePattern` captures dataflow nodes as typed AST entries (`factory`, literal key lists).
- Helpers (`buildDataflowIncidences`, `buildDataflowGraphSpec`) reconstruct the runtime spec directly from the AST.
- `pattern()` now prefers the AST when building its local dataflow graph.
- `define_dataflow()` overloads accept AST nodes, falling back to legacy specs only when needed.
- Tests (including `graph-pattern`, `subgraph`) remain green on `type-pattern` after the Stage 2 helpers were introduced.

## What failed in the latest attempt

- On `record-stage2-learning-2`, we extended `compose()` to namespace AST nodes and feed them into the global spec, but naive string concatenation lost literal keys (`node_by_key`, etc.).
- Result: composed dataflow graph lacks critical nodes; every `subgraph` test fails.
- TypeScript also complained about overload signatures once we generalised `pattern()` without matching implementations.

## Next Steps

1. Keep the current `type-pattern` branch (AST capture + local flowspec rehydration) as the stable base.
2. Design a namespacing helper that maps `(patternId, localKey)` to both `namespacedKey` and `lookupName`. Needs to preserve literal keys exactly, e.g. `parent.node_by_key` → `graph.node_by_key`.
   - Consider storing a metadata map alongside the AST while composing.
   - Reuse that map when wiring interface edges (`deps`) and dataflow `ins` so they stay aligned.
3. After the helper is validated (unit test: compose graph + subgraph), replace the runtime `compose` path.
4. Only then tackle Stage 3 (interface graph) with template literal types.

## Branch Pointers

- `type-pattern`: stable branch with Stage 1 AST + local Stage 2 flow.
- `record-stage2-learning`, `record-stage2-learning-2`: failed Stage 2 attempts; useful references for namespacing and failure symptoms.

