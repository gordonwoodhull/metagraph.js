# 0.0.6
 * indices are now just data, all data is lazily loaded
 * nodes have data which should be overridable (when we get to pattern assembly)
 * move `name` to edges from specs `memberName`, simplify spec to `{data, funfun}`

# 0.0.5
 * member specs are simplified, hopefully clearer and better named. they define a single member on
   the source type only
 * possible to depend on node "indices" which currently are just the data
 * all dependencies are explicit and at graph level rather than spec level
 * remove artifacts until anything should be done with this library but test it

# 0.0.4
 * wrapper was bound too late, causing a pattern instantiated twice to have data replaced
 * roots (singleton objects) are lazily instantiated
 * laziness is tested

# 0.0.3
 * `.value()` returns the inner value, to avoid `.value().value` everywhere. thus new accessor
   options `.nodeValue`, `.edgeValue`

# 0.0.2
 * first version with patterns

# 0.0.1
 * (not tagged; just a graph library)
