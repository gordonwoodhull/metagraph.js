# Stage 2 Type‑Driven Refactor Plan

This note captures how we can evolve the runtime-first Stage 2 code into a compile-time guided implementation using the literal type specification sketched earlier for `graph_pattern` (and by extension `subgraph_pattern`). I’ve separated the write-up into the pieces we already know how to execute, the open problems I still need to figure out, and concrete decisions you can help drive so we can unblock the rest of the work quickly.

---

## 1. Work We Already Know How to Upgrade

### 1.1 Encode Runtime Specs as Literal Types
- **Action**: Introduce `GraphPatternSpec<Opts>` and `SubgraphPatternSpec<Opts>` (modeled on the DeepReadonly structure we walked through).
- **Impact**: `graph_pattern.ts` and `subgraph_pattern.ts` can export these types side-by-side with the runtime factory. No behavioural change—just type sidecars.
- **Follow-up**: In `pattern_spec.ts`, tighten the generics (`AssertPattern`, `PatternSpecWithAst`) so they accept these literal shapes (instead of `Record<string, …>` everywhere). The AST we already capture maps 1:1 to the literal structure.
- **Reference**: See `plans/example-types.ts` for the current draft of the DeepReadonly approach. It compiles the runtime structure into types without yet being wired into the build.

### 1.2 Type-Check Stage 1 Emission
- **Action**: Extend `definePattern`’s signature so callers must pass a structure that satisfies the literal type (e.g. `GraphPatternSpec<Opts>`). We already generate the AST from the runtime spec; we now add type assertions that the literal values are valid.
- **Impact**: Authoring patterns becomes safer: any typo in `deps`, `refs`, `members`, etc. is rejected at compile time.
- **Known work**: Update existing helpers (`graph_pattern`, `subgraph_pattern`, tests that define ad-hoc specs) to annotate with the new type or use `satisfies` so they compile without extra casts.

### 1.3 Consume Literal Types in Stage 2
- **Action**: The new `ComposePatternSpec` type already introduced the namespace-and-alias logic. We can wire `pattern()` and `compose()` directly against the literal structure instead of runtime records.
- **Steps**:
  1. Reuse the AST data we cache (unchanged).
  2. Use the literal type to guide dependency remapping (`deps`, `ins`, `refs`).
  3. Leave runtime code to read from the AST but augment the TypeScript definitions so Stage 2 is fully typed.
- **Risk**: Minimal—runtime stays identical; TypeScript simply enforces the structure we already ship.

### 1.4 Update Subgraph Pattern in Parallel
- **Action**: Mirror the `GraphPatternSpec` type for `subgraph_pattern`—same literal approach but with its own nodes/edges.
- **Impact**: Compose now has both pattern literal types available, so our alias logic can validate `parent.*`/`child.*` references purely at compile time.

### 1.5 Back-Propagate Types to Public APIs
- **Action**: Update `types.ts` exports (`GraphPatternDefinition`, `SubgraphPatternDefinition`) to refer to the literal types. Consumers of the library retain the same runtime behaviour but gain additional type safety.
- **Impact**: Downstream code (tests, CLI) should continue to compile; IDE hover info becomes richer.

---

## 2. Work Still To Be Figured Out

### 2.1 Type-Level Namespace and Alias Resolution
- We rely on `ComposePatternSpec` to stitch patterns together. Today the TypeScript version still leans on mapped types and alias tables, but we haven’t proven it throughout the codebase.
- **Research tasks**:
  - Formalize alias metadata (`parent`, `child`, or user-named aliases) as first-class types, not just runtime maps.
  - Encode “edge from pattern `A` to pattern `B` with alias `child`” as a literal type so template-literal keys can explode to `pattern.child.Node`.
  - Ensure the `resolveDeps` logic we wrote at runtime has a type-level counterpart so Stage 3 can be purely type-driven later.

### 2.2 Stage 3 Interface Typing
- We still build interface graphs at runtime. The literal types will help, but we need a design for:
  - Type-level representation of member functions (return types, argument shapes).
  - Propagation of dataflow outputs into interface method signatures (e.g. `Graph.node` returns the wrapped `Node` type).
  - Handling of nested compositions (ensuring `parent.subgraph` inherits the typed result of the child `Graph` pattern).
- **Unknowns**: Template-literal constraints may get gnarly (especially with aliasing). Need to explore type-level graph traversal or HKT style constructs.

### 2.3 Tooling and DX
- `tsconfig` constraints: confirm our current TS (5.8.x) supports all advanced template features we plan to use (variadic tuples, `satisfies`, etc.).
- Generics for user-specified options (`graph_pattern(opts)`) must thread literal types through while still allowing partial overrides (e.g. optional `edgeKey`). Might need conditional types to default unspecified callbacks.

---

## 3. Decisions & Specs the Human Can Drive

1. **Literal Schema Finalization**
   - Validate the literal type layout matches your mental model. Are we happy with `kind: 'map'` wrappers, or should we alias them differently? Are there Stage 3 fields you want in the literal spec now (e.g. explicit output types)?

2. **Alias Semantics**
   - Decide how we want to treat single-name dependencies (`node_by_key`) in composed patterns. The runtime solution now defaults to “child then parent”, but if you have a stricter rule (e.g. always require explicit prefixes), let’s codify it before we freeze the type spec.

3. **Pattern Authoring Ergonomics**
   - Confirm whether pattern authors should write `as const` objects or rely on the compiler to infer the literal types. If we expect third parties to create patterns, we may want helper builders (`defineGraphPattern<Opts>()`) to reduce friction.

4. **Stage 3 Expectations**
   - Clarify how far you want Stage 3 to go in the first pass. Do we need fully inferred method signatures, or is it enough to validate wiring? Your guidance will let me scope the type-level design and avoid overshooting.

5. **Documentation Deliverables**
   - Agree on what reference docs or migration guides you want once the type-driven approach lands. Writing them alongside the implementation will help reviewers and external users adopt the new style.

---

With these decisions in place, I can spend next week implementing the literal spec, migrating `graph_pattern`/`subgraph_pattern`, and plumbing the types through Stage 2. Once Stage 2 is locked, we can tackle the Stage 3 typing story with a clearer contract. Let me know which of the open questions you want to explore first, and I’ll line up the remaining work accordingly. 
