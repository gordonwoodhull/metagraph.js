# Spec-as-Const Migration — Continuation Plan (v2)

> **Read this first:** Before making any changes, re-read **every file under `src/` and every test in `tests/`**. Many details of the architecture (especially around dataflow calculators and interface helpers) are subtle; the migration work assumes this full-context familiarity. Revisit the files again whenever a step touches them.

---

## 1. Current Objective Recap

We are reshaping `metagraph.js` so that a single `as const` pattern spec drives both runtime behaviour and compile-time typing. The end state is:
- pattern specs are the authoritative source of truth;
- TypeScript infers every public API method directly from the literal spec (nodes, edges, dataflow, payloads, accessors);
- runtime helpers and composition work off the same metadata the type layer consumes.

The recent focus has been threading namespace-aware typing through the system so cross-pattern dependencies (`parent.*`, `child.*`, etc.) gain precise types. We’ve added plumbing for namespace maps, started capturing dataflow outputs per pattern, and partially typed the `subgraph` helper using that metadata.

---

## 2. Work Completed So Far

Key accomplishments leading up to this point:

1. **Interpreter & Helpers**
   - `pattern()` and the helper factories return `PatternGraphType<S, A>` keyed strictly off the literal spec and provided accessor implementations.
   - Interface helpers (`lookupArg`, `lookupFVal`, `fetch`, etc.) emit metadata consumed by type inference.

2. **Dataflow Typing Scaffolding**
   - `pattern_dataflow.ts` can compute `DataflowNodeOutput<S, A, Key>` for all calculator kinds (map, map_of_lists, list, subset, singleton, input/output).
   - Introduced namespace-aware defaults so input nodes fall back to the declared payload shape.

3. **Member Resolution**
   - `pattern_types.ts` maps interface nodes/edges to inferred members, tying resolver signatures to `DataflowNodeOutput`.
   - Lookup helpers now consume dependency tuples rather than just the first dependency.
   - Edge metadata retains `target` so cross-node helpers (e.g. `subgraph`) know their destination.

4. **Namespace Metadata Bridge**
   - `DataflowOutputs` exposes the entire dataflow output map for a spec.
   - `graph_pattern.ts` / `subgraph_pattern.ts` export namespace descriptors (`GraphDataflowNamespace`, `SubgraphNamespaces`).
   - `pattern()` / `compose()` accept optional namespace maps, wiring them through to type inference.
   - `compose()` collects each component’s `DataflowOutputs` and builds a combined namespace map, mirroring the runtime’s namespace wiring.

5. **Subgraph Typing (Partial)**
   - `subgraph` member now returns `InferNodeShape` of the target node using namespace metadata, rather than an untyped `Graph`.

Current metrics (via `scripts/count-any-unknown.ts`): `any: 24`, `unknown: 167`.

---

## 3. Key Source References

When resuming work, consult these files first:

- `src/pattern.ts`: interpreter entry point; now accepts namespace metadata.
- `src/pattern_dataflow.ts`: calculators, namespace-aware `DataflowNodeOutput`, and `DataflowOutputs`.
- `src/pattern_types.ts`: inference machinery for members/class members; resolver logic lives here.
- `src/compose.ts`: composition pipeline, now building/stitching namespace maps.
- `src/graph_pattern.ts` & `src/subgraph_pattern.ts`: canonical specs, accessor declarations, namespace exports.
- `src/interface.ts`: runtime helper definitions (lookup/fetch/subgraph).
- `tests/*.ts`: behaviour checks for graphs, patterns, subgraph, composition, etc.

Keep the progress document `plans/spec-as-const-progress.md` handy for historical context; this file supersedes it for ongoing planning but the legacy notes remain useful.

---

## 4. Detailed Roadmap (Big Steps & Sub-Steps)

### Step 1 — Specialise Dependency Tuples for Lookup Helpers
**Goal:** Eliminate `unknown` escapes in member resolvers by recognising common dependency patterns (map/list/subset) and exposing precise argument & return types.

Sub-steps:
1. **Catalogue dependency shapes** seen in the existing specs:
   - `[node_list, node_by_key]`, `[edge_list, edge_by_key]` patterns.
   - `subset` nodes (items + key list).
   - Single-map dependencies (`node_by_key` for `lookupArg`, `map_of_lists` for `lookupKVal`).
2. **Extend tuple utilities** in `pattern_types.ts` to annotate each dependency tuple with a discriminant (e.g., `{ kind: 'mapPair'; map: ...; list: ... }`).
3. **Update lookup resolvers**:
   - `lookupArg`: map argument type + key argument type (using accessor if present).
   - `lookupFVal`: map of `value accessor -> map entry`.
   - `lookupKVal`: map-of-lists returning `value[]`.
4. **Introduce helper types** if needed (e.g., `ExtractMapValue<T>`, `ExtractListItem<T>`).
5. **Add type-only assertions** (temporary `expectTypeOf` blocks) to confirm new inference before the final test suite is formalised.

### Step 2 — Type the Subgraph Payload Argument
**Goal:** The `subgraph` helper should expose a fully typed `(nodeKeys, edgeKeys, payload)` signature and return the child pattern’s graph wrapper.

Sub-steps:
1. **Model child payload shape** within `SubgraphNamespaces`: use `DataflowOutputs` + the child spec’s payload bucket to determine the expected payload type.
2. **Update `ResolveSubgraphMember`**:
   - Derive parameter types from namespace map (e.g., `nodeKeys: string[]`, `edgeKeys: string[]`, `payload: SubgraphNamespaces['child']['graph']` or similar).
   - Ensure the return type is `InferNodeShape` for the child graph node.
3. **Audit runtime implementation** in `src/interface.ts` to verify the typed arguments match actual usage.
4. **Type assertions/tests**: add cases (maybe in `tests/types/` once created) asserting the subgraph method signature matches expectations.

### Step 3 — Type-Only Regression Tests
**Goal:** Create a guardrail so future changes cannot regress inference.

Sub-steps:
1. Create a `tests/types/` folder (or similar) leveraging `vitest`’s `expectTypeOf` to assert:
   - Graph pattern inference (`node('Graph').value().nodes()` returns typed arrays, etc.).
   - Subgraph inference (`parent.subgraph(...)` returns typed wrapper).
   - Compose inference (namespaced nodes preserve types).
2. Plan to integrate `tsd` after the initial suite stabilises for negative tests (invalid specs, missing deps, wrong namespace keys).

### Step 4 — Namespace Enhancements for Composition (if needed)
**Goal:** Ensure composed namespace map includes all necessary cross-pattern linkage (payloads, aliasing) beyond raw dataflow outputs.

Sub-steps:
1. Verify alias handling aligns with namespace map keys (e.g., `resolveAlias` usage).
2. Consider exposing alias info if future inference needs it (may be optional; document if not pursued).

### Step 5 — Final Cleanup & Metrics Reduction
**Goal:** Drive `unknown` count down significantly; ensure remaining `any` are intentional.

Sub-steps:
1. Re-run `scripts/count-any-unknown.ts` after each major change; record numbers in commits.
2. Identify lingering `unknown`s in `pattern_types.ts` and `interface.ts`; either replace with concrete types or leave documented justified fallbacks.
3. Review `src/types.ts` legacy interfaces to decide whether to tighten generics or leave as runtime-only shapes.
4. Update documentation (README/docs) describing the spec-driven workflow, including namespace semantics and guidance on adding new patterns.

---

## 5. Additional Tips for the Next Engineer (Future Me)

- Never revert user-provided changes or reset the repo; assume a dirty tree and stage only what you modify.
- Keep commits small but coherent; include `any/unknown` counts and follow the `codex: …` prefix convention.
- Use `npm run typecheck`, `npx vitest run`, and `npx tsx scripts/count-any-unknown.ts` after each substantial change (request escalated permissions when needed).
- Leverage `DataflowOutputs` and namespace maps aggressively: they are the bridge between runtime specs and the type system—avoid re-deriving information when the spec already provides it.
- Document subtle runtime/type interactions in commit messages; the migration is intricate and future steps depend on capturing rationale.

Good luck, and keep the compiler green!  
— Your prior self, Codex
