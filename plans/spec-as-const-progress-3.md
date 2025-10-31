# Spec-as-Const Migration — Continuation Plan (v3)

> **Required reading:** Before coding, reread **every file in `src/` and `tests/`**. Many helpers rely on subtle runtime behaviour that we are now reproducing in the type system; missing that context will cause regressions.

---

## 1. Mission Snapshot

We are turning each `as const` pattern spec into the single source of truth so runtime and compile-time stay perfectly aligned. The end state: every public method is inferred from the literal spec (payload buckets, dataflow nodes, interface edges), and runtime helpers simply interpret that data.

Recent change: `compose()` now expects a literal `CompositionLiteral` (nodes + edges) so we can derive namespace maps at the type level. The runtime still builds the combined pattern graph, but type inference finally has access to each component’s spec/accessors and the literal namespace keys.

---

## 2. Work So Far (Highlights)

1. **Interpreter & helper metadata**
   - `pattern()` returns `PatternGraphType<S, A, Namespaces>` keyed off spec literals and accessor implementations.
   - Interface helpers (`lookup*`, `fetch`, `subgraph`, etc.) expose typed descriptors consumed by the inference layer.

2. **Dataflow typing scaffold**
   - `pattern_dataflow.ts` resolves calculator outputs (`DataflowNodeOutput`) for map/list/subset/singleton/input/output nodes.
   - Input nodes default to declared payload bucket shapes.
   - `DataflowOutputs` exports the full node output map for any spec.

3. **Member inference**
   - `pattern_types.ts` aggregates node and edge members, converts dependency tuples into resolver inputs, and ties helper signatures to `DataflowNodeOutput`.
   - Lookup helpers consume complete dependency tuples rather than just the first entry.
   - Edge metadata retains `target` so cross-node helpers know their destination shape.

4. **Namespace groundwork**
   - Graph/subgraph specs export namespace contracts (`GraphDataflowNamespace`, `SubgraphNamespaces`).
   - `compose()` now accepts a literal composition and derives node dataflow outputs (`NodeOutputs`) for each namespace at the type level.
   - Placeholder runtime namespace maps were removed; the value we pass to `pattern()` is now purely for runtime behaviour, while the type parameter captures namespace metadata.

5. **Subgraph typing (partial)**
   - `subgraph` member returns `InferNodeShape` for the target node using namespace info.
   - Payload argument still loosely typed; needs refinement once namespace map includes payload buckets.

---

## 3. Source Touchpoints

- `src/pattern.ts` — interpreter entry point (now generic over namespace map).
- `src/pattern_dataflow.ts` — calculator typings, `DataflowOutputs`.
- `src/pattern_types.ts` — inference engine; lookup/subgraph resolvers live here.
- `src/compose.ts` — accepts `CompositionLiteral`, computes runtime graphs, and exposes namespace types.
- `src/graph_pattern.ts`, `src/subgraph_pattern.ts` — canonical specs + namespace exports.
- `src/interface.ts` — runtime helper implementations.
- `tests/` — behavioural coverage; no type-only tests yet.

Keep previous files (`plans/spec-as-const-progress.md`, `plans/spec-as-const-progress-2.md`) for historical context.

---

## 4. Roadmap (Big Steps → Granular Tasks)

### Step 1 — Finish Type-Level Namespace Composition *(partially done)*
**Goal:** Produce accurate namespace maps without runtime casts, including alias remapping.

Sub-steps:
1. **Edge alias analysis**: extend the type-level helpers to account for interface aliases (string node values). Ensure alias targets inherit the same namespace map entries. *(partial: alias nodes now resolve via namespace descriptors for members/class members; still need to ensure namespace map generation propagates alias keys if required.)*
2. **Namespace overrides merge**: refine `MergeNamespaceMaps` so overrides replace existing entries by key rather than simple intersection. *(now passing a typed default namespace map to `compose`, overrides still todo if runtime merge needed).* 
3. **Document assumption**: composition now accepts literal specs; provide helper types or guidelines if callers need to reuse `graph_detect`.
4. **Validation**: add interim `expectTypeOf` checks confirming `compose()` outputs namespace literals like `'graph'`, `'parent'`, `'child'`.

### Step 2 — Specialise Dependency Tuples for Lookup Helpers *(in progress)*
**Goal:** Remove `unknown` fallbacks by recognising dependency shapes.

Sub-steps:
1. Catalogue dependency tuples from existing specs (map/list, subset, singleton, direct map). *(todo)*
2. Introduce tuple discriminants (e.g., `DependencyKind<'mapPair', {...}>`) in `pattern_types.ts`. *(todo)*
3. ✔️ Update lookup resolvers to use the map dependency for precise argument/return types (`lookupArg`, `lookupFVal`, `lookupKVal`, `fetch` now specialise their first dependency; extend to multi-dependency cases next).
4. Add helper types (`MapValueOf<T>`, `SubsetItemOf<T>`) for clarity. *(partial: map helpers added)*
5. Verify with temporary type assertions (e.g., `expectTypeOf`) before finalising tests. *(todo)*

### Step 3 — Tighten Subgraph Payload Typing
**Goal:** Give `subgraph` a typed `(nodeKeys, edgeKeys, payload)` signature and the correct child wrapper return.

Sub-steps:
1. ✔️ Extend `SubgraphNamespaces` so the child namespace records payload bucket shapes (not just dataflow outputs).
2. ✔️ Update `ResolveSubgraphMember` to pull parameter and return types from the namespace map (payload derived from target `create`).
3. Ensure `src/interface.ts`’s runtime implementation matches the inferred signature. *(todo: audit runtime helper once payload typing is exercised more broadly.)*
4. ✔️ Assert inference with type-only checks (`tests/types/subgraph-pattern.types.test.ts`).

### Step 4 — Type-Only Regression Tests *(partially done)*
**Goal:** Prevent inference regressions.

Sub-steps:
1. ✔️ Create `tests/types/` leveraging `vitest`’s `expectTypeOf` (graph/subgraph smoke tests added).
2. ✔️ Cover key scenarios: graph pattern usage, subgraph parent/child interactions, composed namespaces (compose smoke test added).
3. Add negative tests once `tsd` is included (invalid specs should fail to compile).

### Step 5 — Metrics Reduction & Cleanup
**Goal:** Drop `unknown` counts significantly; justify any remaining `any`.

Sub-steps:
1. Run `scripts/count-any-unknown.ts` after every major change; include counts in commits.
2. Replace or explain residual `unknown`s in `pattern_types.ts` and `interface.ts`.
3. Audit legacy runtime types in `src/types.ts`; tighten generics where feasible.
4. Update docs/README to explain namespace typing, type-level composition, and spec authoring guidelines.

---

## 5. Practical Guidance for Future Codex

- Keep commits focused and include `any/unknown` counts. Stick to the `codex: …` prefix.
- Always run `npm run typecheck`, `npx vitest run`, and `npx tsx scripts/count-any-unknown.ts` (request escalated permissions when necessary).
- When duplicating runtime logic in the type system, comment the parallel structure to avoid drift.
- Record surprises and compromises (e.g., type-level composition complexity) so context is preserved.
- Stay anchored to the spec-as-const principle: never introduce parallel configuration when the spec already provides the necessary data.

Good luck. The hard part is matching the runtime composition in the type system, but once it lands, we’ll have end-to-end inference driven entirely by literal specs.  
— Codex
