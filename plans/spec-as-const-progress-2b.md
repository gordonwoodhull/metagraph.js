# Spec-as-Const Migration — Continuation Plan (v2)

> **Mandatory warm-up:** Before editing anything, reread **all source files in `src/` and all tests in `tests/`**. Several helpers rely on subtle runtime details; we’re now replicating those details in the type system, so gaps in understanding will cause regressions.

---

## 1. Mission Restatement

We’re rebuilding `metagraph.js` so that each `as const` pattern spec drives both runtime behaviour and compile-time typing. The goal is that every public API method is inferred directly from the literal spec—no parallel handwritten types. Runtime helpers must be thin interpreters of the same metadata the type layer consumes.

The new insight: to make TypeScript “see” everything the runtime understands (especially namespace wiring in composed patterns), we have to re-express significant parts of the composition logic at the type level. The earlier attempt to smuggle metadata through phantom runtime values does not work; the type layer needs its own, faithful computation.

---

## 2. Work Completed So Far

1. **Interpreter / helpers**
   - `pattern()` returns `PatternGraphType<S, A, Namespaces>` keyed off the spec and supplied accessors.
   - Interface helpers (`lookup*`, `fetch`, etc.) emit metadata consumed by type inference rather than bespoke wrappers.

2. **Dataflow typing scaffold**
   - `pattern_dataflow.ts` computes `DataflowNodeOutput<S, A, Key>` for calculators (map, list, subset, singleton, input/output).
   - Default payload paths now fall back to the declared bucket shapes instead of blanket `unknown`.

3. **Member resolution**
   - `pattern_types.ts` aggregates interface node/edge members, resolves dependency tuples, and ties helper signatures to dataflow outputs.
   - Lookup helpers operate on full dependency tuples instead of just the first entry.
   - Edge metadata now retains the destination node so cross-node helpers (e.g., `subgraph`) know their target shape.

4. **Namespace groundwork**
   - Exported `DataflowOutputs` so a spec can expose all node outputs.
   - Graph/subgraph specs declare namespace contracts (`GraphDataflowNamespace`, `SubgraphNamespaces`).
   - `pattern()` and `compose()` accept optional namespace metadata (currently placeholders) so future type-level composition can feed them precise maps.

5. **Subgraph typing (partial)**
   - The `subgraph` member now returns `InferNodeShape` for the destination node by reading namespace metadata.

Current metrics (`npx tsx scripts/count-any-unknown.ts`): `any: 24`, `unknown: 167`.

---

## 3. Key Files to Revisit Before Continuing

- `src/pattern.ts` — interpreter entry point.
- `src/pattern_dataflow.ts` — calculator typings, `DataflowOutputs`.
- `src/pattern_types.ts` — inference engine, resolver logic.
- `src/compose.ts` — runtime composition; will soon grow a type-level twin.
- `src/graph_pattern.ts`, `src/subgraph_pattern.ts` — canonical specs and namespace exports.
- `src/interface.ts` — runtime helper definitions (`lookup`, `subgraph`, etc.).
- `tests/*.ts` — behavioural tests; no type-only assertions yet.

Keep the earlier plan (`plans/spec-as-const-progress.md`) for historical reference; this document supersedes it.

---

## 4. Detailed Roadmap

### Step 1 — Type-Level Composition of Namespaces
**Goal:** Give TypeScript the same namespace wiring the runtime uses, without relying on runtime casts.

Sub-steps:
1. **Introduce type-level graph descriptors** that mirror the composition input: node list, edge list, namespace aliases. This likely means new types derived from the spec literals or from helper generators.
2. **Write type-level helpers** to:
   - Traverse pattern dependency edges topologically.
   - Remap namespace-prefixed references.
   - Produce a map `{ namespaceName: DataflowOutputs<Spec, Accessors> }` using literal keys.
3. **Thread these types into runtime helpers** so `pattern()` and `compose()` accept both the runtime graph and the type-level namespace mapping. Runtime logic remains the source of behaviour; the type counterpart simply echoes its structure.
4. **Remove the ineffective runtime namespace map** once the type-level computation is in place (or keep it only as documentation if helpful).
5. **Add regression tests** (temporary `expectTypeOf` or similar) to confirm the map produces literal keys such as `'parent'`/`'child'` with concrete node outputs.

### Step 2 — Specialise Dependency Tuples for Lookup Helpers
**Goal:** Eliminate `unknown` fallbacks in lookup/fetch helpers by recognising common dependency patterns.

Sub-steps:
1. Audit current specs to catalogue dependency patterns: `[list, map]`, `[items, keys]` for subsets, single-map dependencies, etc.
2. Extend the tuple utility types to label those patterns explicitly (e.g., `DependencyTupleKind = 'mapPair' | 'subsetPair' | ...`).
3. Update `ResolveLookupArgMember`, `ResolveLookupFValMember`, `ResolveLookupKValMember`, and `ResolveFetchMember` to use the discriminants to produce precise argument/return types.
4. Introduce helper types (`ExtractMapValue<T>`, `InferSubsetItem<T>`) if needed to keep the code readable.
5. Write type assertions that confirm the new inference works for graph and subgraph specs.

### Step 3 — Type the Subgraph Payload Argument
**Goal:** Give the `subgraph` helper a fully typed `(nodeKeys: string[], edgeKeys: string[], payload)` signature and a precise return value.

Sub-steps:
1. Extend `SubgraphNamespaces` so the child namespace includes the payload bucket shape (not just dataflow outputs).
2. Update `ResolveSubgraphMember` to pull `(nodeKeys, edgeKeys, payload)` types from the namespace map and to use `InferNodeShape` for the return type.
3. Ensure the runtime implementation in `src/interface.ts` lines up with the typed arguments.
4. Add type assertions for the parent and child subgraph APIs to prevent regressions.

### Step 4 — Type-Only Regression Tests
**Goal:** Lock in inference behaviour to catch future regressions early.

Sub-steps:
1. Set up a `tests/types/` directory (or equivalent) using `vitest`’s `expectTypeOf`.
2. Assert key scenarios: graph pattern nodes/edges, subgraph parent/child APIs, composed namespaces.
3. Plan to integrate `tsd` once the basic suite is passing so we can add negative tests (invalid specs should fail to type-check).

### Step 5 — Metrics Reduction & Cleanup
**Goal:** Bring `unknown` counts down sharply and justify any remaining `any`s.

Sub-steps:
1. Run `scripts/count-any-unknown.ts` after each major change; include counts in commits.
2. Inspect remaining `unknown`s in `pattern_types.ts` and `interface.ts`; replace or explain them.
3. Evaluate legacy helper types in `src/types.ts` to see if tighter generics are now possible.
4. Update documentation (README/docs) to describe the spec-driven workflow, namespace semantics, and how to add new patterns.

---

## 5. Practical Guidance for the Next Engineer (Future Me)

- Keep commits small and topical. Continue the `codex: …` prefix and include `any/unknown` counts.
- Use `npm run typecheck`, `npx vitest run`, and `npx tsx scripts/count-any-unknown.ts` after each substantive change (request escalated permissions if necessary).
- When introducing type-level helpers that mirror runtime logic, comment them sparingly but clearly; future maintainers need to understand why duplication exists.
- Track surprises and compromises in commit messages or notes—this migration is intricate, and context will save time later.
- Above all, stay aligned with the spec-as-const goal: if a helper can read information directly from the spec (at runtime or type time), avoid introducing parallel configuration.

Good luck—this is where the type-level scaffolding gets intense, but it’s the path to having the compiler validate everything the runtime knows.  
— Codex
