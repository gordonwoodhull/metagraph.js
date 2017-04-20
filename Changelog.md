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
