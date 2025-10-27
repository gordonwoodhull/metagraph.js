# Spec-as-Const Thoughts — Session Reflections

## Namespace Metadata Discussion

- Initial attempt: capture namespace wiring by building a runtime map (`namespaceOutputs`) inside `compose()` and casting each entry to `DataflowOutputs<typeof spec, typeof accessors>`.  
- Problem: once the composition graph flows through `graph_detect`, namespace keys are widened to `string`. Assigning inside a loop cannot recover literal types, so TypeScript still sees `Record<string, unknown>` and the metadata is useless.  
- Conclusion: runtime casts cannot bridge the gap. We must recreate the composition logic at the type level so literals are preserved throughout. The runtime will remain the behaviour source; the type-layer will mirror it using the same spec inputs.  
- Next action: remove the phantom runtime map and implement proper type-level composition that produces `{ namespaceName: DataflowOutputs<Spec, Accessors> }` using literal keys directly from the spec.

## Surprises & Doubts (Expanded)

1. **Namespace plumbing explosion**  
   - Expectation: once we threaded namespace metadata, most helpers would fall into place.  
   - Reality: exposing namespaces revealed how many helpers implicitly rely on runtime lookups. Typing them forces us to define type-level versions of the runtime traversal.  
   - Risk: this dual implementation increases code volume and maintenance surface; any mismatch could desynchronise runtime and type inference.

2. **Lookup resolver complexity**  
   - Lookup helpers (`lookupArg`, `lookupFVal`, `lookupKVal`) depend on specific dependency shapes (map/list pairs, subsets). These patterns were never codified.  
   - Surprise: recognising them precisely requires cataloguing all existing patterns and classifying their dependency tuples—a larger effort than the original plan implied.

3. **`Unknown` count regression**  
   - Namespace scaffolding actually increased the `unknown` tally temporarily (from 165 to 167).  
   - Doubt: until the type-level composition is in place and tuples are specialised, progress will look worse before it improves. The key is to stay the course and avoid introducing new placeholders.

4. **Runtime vs type parity**  
   - Compromise: to get accurate types we’ll duplicate logic in the type system.  
   - Concern: maintaining two representations of the same algorithm (runtime composition & type-level composition) invites divergence. We must keep them in sync and document their parallel structure clearly.

5. **Future testing load**  
   - Without type-only regression tests, every change risks undoing an inference fix.  
   - We need a dedicated suite (`expectTypeOf` / `tsd`) to ensure each improvement sticks. This adds overhead but is essential for confidence.

## Moving Forward

- Accept that the codebase will become more verbose: type computations are inherently louder than runtime equivalents.  
- Focus on making the type-level composition accurate, well-commented, and easy to audit against the runtime version.  
- Keep tracking `any`/`unknown` metrics, and only allow residual cases when a runtime API truly cannot be expressed more precisely.  
- Document every compromise or risk (like the dual composition logic) so future iterations know why those decisions exist.

— Codex, candid reflections after the namespace discussion
