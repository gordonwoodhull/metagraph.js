# Spec-as-Const Migration Progress

## Summary

The project is midway through a large-scale migration to a spec-driven (`as const`) architecture for `metagraph.js`. The objective is to let TypeScript infer the full public interface of any pattern directly from the literal spec, without relying on parallel manually-written types. Work completed so far includes:

1. **Interpreter Refactor**
   - `pattern()` is now generic in both the `PatternSpecLiteral` and the accessor implementation map, returning a `PatternGraphType<S, A>` that reflects the spec literal’s interface graph.
   - Built-in factories (`graph_pattern`, `subgraph_pattern`) delegate to `pattern()` and provide optional accessor overrides without maintaining bespoke wrapper types.

2. **Helper Metadata**
   - Interface helpers (`fetch`, `lookupArg`, `lookupFVal`, `lookupKVal`, `subgraph`) export typed descriptors that expose the runtime `build` function along with a `kind` tag. This metadata is used by the type inference layer, ensuring runtime/type definitions stay in sync.
   - A `Member` union type representing these helper descriptors now lives in `src/interface.ts`.

3. **Dataflow Typing Scaffold**
   - Introduced `src/pattern_dataflow.ts`, which currently resolves dataflow node output types for basic calculator kinds (input, output, map, list, map_of_lists, subset, singleton). These types are still placeholders in many cases (e.g., most outputs remain `unknown`) but the structure is in place to thread payload/accessor data.

4. **Member Inference Structure**
   - `src/pattern_types.ts` aggregates node-defined members and edge-defined members (including dependency lists) into consolidated records.
   - Member resolvers (`ResolveLookupArg`, `ResolveFetch`, etc.) now consume inferred dataflow outputs and return typed functions rather than blanket `unknown`.
   - `PatternGraphType<S, A>` now reflects the inferred member signatures for both class members (e.g., `create`) and instance members (`node().value()`).

5. **Tooling & Metrics**
   - `scripts/count-any-unknown.ts` (renamed from `count-types.ts`) is used to track `any`/`unknown` usage after each change (`any: 24`, `unknown: 161` as of the last commit).
   - All changes thus far leave `npm run typecheck` and `npx vitest run` passing.

## Remaining Scope

To complete the spec-as-const migration, we must finish wiring payload and accessor types through the dataflow graph and interface members, validate the end-to-end inference, and polish any leftover loose ends.

### 1. Complete Dataflow Output Typing
- **Goal:** Ensure `DataflowNodeOutput<S, A, Key>` produces accurate types for all calculator kinds.
- **Tasks:**
  - Map `map_of_lists`, `subset`, `list`, `singleton`, `map`, `output` nodes to their precise types using accessor-derived key functions and payload definitions.
  - Introduce a cache/memoization mechanism (e.g., helper types) to prevent recursive type instantiation blow-ups when graphs are large.
  - Add utility types to resolve nested data structures (e.g., mapped value types for `map` nodes).

### 2. Tighten Member Resolvers
- **Goal:** Ensure every member (`lookupArg`, `lookupFVal`, `lookupKVal`, `fetch`, `subgraph`, etc.) returns the correct type derived from the spec’s dependencies and dataflow outputs.
- **Tasks:**
  - Update the resolver utilities to use the now-precise `DataflowNodeOutput` types when generating argument/return signatures.
  - Handle edge cases such as multi-dependency members (including namespaced deps like `graph.node_by_key`).
  - Align runtime helper signatures in `interface.ts` with the inferred types (generic parameter additions, elimination of `unknown`).

### 3. Adjust Runtime Helpers for Typed Signatures
- **Goal:** Ensure runtime implementations match the inference contract.
- **Tasks:**
  - Adjust helper implementations (`fetch`, `lookupArg`, etc.) to accept typed inputs consistent with the new generics, removing or narrowing existing casts.
  - Update `createable` to enforce the typed payload bucket for `create(data)`.
  - Consider migrating helper exports to a shared metadata format consumed by both runtime and type layers (if not already done).

### 4. Type-only Test Harness
- **Goal:** Guard against regression by asserting key inferred types.
- **Tasks:**
  - Introduce `tests/types` using `expectTypeOf` (Vitest) or `tsd` to ensure example patterns yield expected method signatures (e.g., `graph_pattern().node('Edge').value().source().key()` is `string`).
  - Cover both default accessors and custom accessor overrides.
  - Add a composed pattern test to ensure member types propagate through `compose()`.

### 5. Compose Accessor Threading
- **Goal:** Ensure `compose()` can handle accessor maps when building merged specs.
- **Tasks:**
  - Replace the current placeholder `{ accessors: {} as ... }` cast in `compose.ts` with genuine accessor inference or explicit parameterization.
  - Confirm typed members remain accurate after spec composition.

### 6. Documentation & Cleanup
- **Goal:** Final polish and developer guidance.
- **Tasks:**
  - Update README/docs to explain the new spec-as-const workflow, including typed example patterns and how to interpret compiler errors.
  - Audit remaining `any`/`unknown` usage (via `scripts/count-any-unknown.ts`) and remove or justify them.
  - Confirm build outputs (`dist/`) still bundle correctly and expose named exports as expected.

## Implementation Order

1. Finish dataflow calculator typing (Task 1).
2. Integrate precise member resolvers (Tasks 2 & 3) once dataflow outputs are accurate.
3. Add type-only tests (Task 4) to lock in the behavior.
4. Fix `compose()` accessor handling (Task 5).
5. Documentation, cleanup, and final audit (Task 6).

Following this plan will ensure the spec literal becomes the single source of truth and the TypeScript experience matches the runtime behavior end-to-end.
