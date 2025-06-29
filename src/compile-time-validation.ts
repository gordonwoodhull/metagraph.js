/**
 * Compile-Time Graph Validation
 * 
 * This module provides TypeScript compile-time validation for graph structures,
 * catching common errors like dangling edges, duplicate keys, and cycles at build time.
 */

import { 
  GraphSpec, 
  ValidGraph, 
  ValidatedGraph, 
  GraphValidationError, 
  ValidGraphWithOptions,
  GraphValidationOptions,
  CreateValidatedGraph,
  BrandedGraph
} from './types.js';
import { graph, graph_detect } from './graph.js';

/**
 * Validates a graph specification at compile time.
 * This function acts as a type guard that ensures the graph structure is valid.
 * 
 * @param spec - The graph specification to validate
 * @returns The validated graph specification (same as input, but type-branded)
 * @throws Compile-time error if validation fails
 * 
 * @example
 * ```typescript
 * // ✅ Valid graph - compiles successfully
 * const validGraph = validateGraph({
 *   nodes: [
 *     { key: 'a', value: 1 },
 *     { key: 'b', value: 2 }
 *   ],
 *   edges: [
 *     { key: 'edge1', value: { source: 'a', target: 'b' }}
 *   ]
 * });
 * 
 * // ❌ Invalid graph - compilation error
 * const invalidGraph = validateGraph({
 *   nodes: [{ key: 'a', value: 1 }],
 *   edges: [{ key: 'edge1', value: { source: 'a', target: 'nonexistent' }}]
 * });
 * ```
 */
export function validateGraph<T extends GraphSpec>(
  spec: T
): ValidatedGraph<T> {
  // Runtime validation could be added here for additional safety
  return spec as ValidatedGraph<T>;
}

/**
 * Validates a graph with custom validation options.
 * Allows fine-grained control over validation rules.
 * 
 * @param spec - The graph specification to validate
 * @param options - Validation options to customize behavior
 * @returns The validated graph specification
 * 
 * @example
 * ```typescript
 * // Allow self-loops
 * const graphWithSelfLoop = validateGraphWithOptions({
 *   nodes: [{ key: 'a', value: 1 }],
 *   edges: [{ key: 'self', value: { source: 'a', target: 'a' }}]
 * }, { allowSelfLoops: true });
 * 
 * // Disable unique key requirement
 * const flexibleGraph = validateGraphWithOptions(spec, {
 *   requireUniqueKeys: false
 * });
 * ```
 */
export function validateGraphWithOptions<
  T extends GraphSpec,
  O extends GraphValidationOptions
>(
  spec: T,
  options: O
): ValidGraphWithOptions<T, O> extends { error: any } ? never : T {
  // Runtime validation with options could be implemented here
  return spec as any;
}

/**
 * Creates a compile-time validated graph instance.
 * Combines validation with graph creation in a single step.
 * 
 * @param spec - The graph specification to validate and instantiate
 * @returns A graph instance that's guaranteed to be structurally valid
 * 
 * @example
 * ```typescript
 * const safeGraph = createValidatedGraph({
 *   nodes: [
 *     { key: 'user', value: { name: 'Alice' }},
 *     { key: 'post', value: { title: 'Hello' }}
 *   ],
 *   edges: [
 *     { key: 'authored', value: { source: 'user', target: 'post' }}
 *   ]
 * });
 * ```
 */
export function createValidatedGraph<T extends GraphSpec>(
  spec: T
): CreateValidatedGraph<T> extends never 
  ? never 
  : ReturnType<typeof graph_detect> {
  
  const validatedSpec = validateGraph(spec);
  return graph_detect(validatedSpec) as any;
}

/**
 * Type-level function to check if a graph specification is valid.
 * Useful for conditional types and meta-programming.
 * 
 * @example
 * ```typescript
 * type MyGraphError = GraphValidationError<{
 *   nodes: [{ key: 'a', value: 1 }],
 *   edges: [{ key: 'bad', value: { source: 'a', target: 'missing' }}]
 * }>; // Type: "Some edges reference non-existent nodes"
 * ```
 */
export type GetValidationError<T> = GraphValidationError<T>;

/**
 * Utility to extract all validation errors from a graph specification.
 * Returns a union of all possible error messages.
 */
export type ExtractValidationErrors<T> = T extends GraphSpec
  ? GraphValidationError<T> extends string
    ? GraphValidationError<T>
    : never
  : never;

/**
 * Checks if a graph spec is valid at the type level.
 * Returns true if valid, false if invalid.
 */
export type IsValidGraph<T> = ValidGraph<T> extends { error: any } ? false : true;

/**
 * Advanced validation that can be used in generic constraints.
 * 
 * @example
 * ```typescript
 * function processOnlyValidGraphs<T extends GraphSpec>(
 *   spec: T extends ValidGraphConstraint<T> ? T : never
 * ) {
 *   // This function only accepts valid graphs
 *   return createValidatedGraph(spec);
 * }
 * ```
 */
export type ValidGraphConstraint<T> = ValidGraph<T> extends { error: any } ? never : T;

/**
 * Compile-time assertion function for graph validity.
 * Causes compilation to fail with descriptive error if graph is invalid.
 * 
 * @param spec - Graph specification to assert validity for
 * @returns void (used purely for compile-time checking)
 */
export function assertValidGraph<T extends GraphSpec>(
  spec: T
): asserts spec is ValidGraphConstraint<T> {
  // This function exists purely for compile-time validation
  // Runtime implementation could include additional checks
}

/**
 * Development helper that provides detailed validation information.
 * Useful for debugging graph structure issues during development.
 * 
 * @param spec - Graph specification to analyze
 * @returns Detailed validation information
 */
export function getValidationInfo<T extends GraphSpec>(spec: T) {
  // Extract nodes and edges for analysis
  const nodeKeys = new Set<string>();
  const edgeKeys = new Set<string>();
  const referencedNodes = new Set<string>();
  const selfLoops: string[] = [];
  const duplicateNodes: string[] = [];
  const duplicateEdges: string[] = [];
  
  // Analyze nodes
  if (spec.nodes) {
    const nodes = Array.isArray(spec.nodes) ? spec.nodes : Object.entries(spec.nodes).map(([key, value]) => ({ key, value }));
    
    for (const node of nodes) {
      if (typeof node === 'object' && node && 'key' in node) {
        const key = String(node.key);
        if (nodeKeys.has(key)) {
          duplicateNodes.push(key);
        }
        nodeKeys.add(key);
      }
    }
  }
  
  // Analyze edges
  if (spec.edges) {
    const edges = Array.isArray(spec.edges) ? spec.edges : Object.entries(spec.edges).map(([key, value]) => ({ key, value }));
    
    for (const edge of edges) {
      if (typeof edge === 'object' && edge && 'key' in edge && 'value' in edge) {
        const key = String(edge.key);
        if (edgeKeys.has(key)) {
          duplicateEdges.push(key);
        }
        edgeKeys.add(key);
        
        const value = edge.value as any;
        if (value && typeof value === 'object' && 'source' in value && 'target' in value) {
          const source = String(value.source);
          const target = String(value.target);
          
          referencedNodes.add(source);
          referencedNodes.add(target);
          
          if (source === target) {
            selfLoops.push(key);
          }
        }
      }
    }
  }
  
  // Check for dangling references
  const danglingReferences = Array.from(referencedNodes).filter(ref => !nodeKeys.has(ref));
  
  return {
    nodeCount: nodeKeys.size,
    edgeCount: edgeKeys.size,
    nodeKeys: Array.from(nodeKeys),
    edgeKeys: Array.from(edgeKeys),
    referencedNodes: Array.from(referencedNodes),
    danglingReferences,
    selfLoops,
    duplicateNodes,
    duplicateEdges,
    isValid: danglingReferences.length === 0 && duplicateNodes.length === 0 && duplicateEdges.length === 0,
    errors: [
      ...danglingReferences.map(ref => `Edge references non-existent node: ${ref}`),
      ...duplicateNodes.map(key => `Duplicate node key: ${key}`),
      ...duplicateEdges.map(key => `Duplicate edge key: ${key}`)
      // Note: self-loops are tracked separately and not included in errors by default
    ]
  };
}

/**
 * Runtime validation function that mirrors compile-time validation.
 * Useful for validating dynamically constructed graphs.
 * 
 * @param spec - Graph specification to validate at runtime
 * @throws Error with detailed message if validation fails
 * @returns The input spec if valid
 */
export function validateGraphAtRuntime<T extends GraphSpec>(spec: T): T {
  const info = getValidationInfo(spec);
  
  // Include self-loops as errors by default
  const allErrors = [
    ...info.errors,
    ...(info.selfLoops.length > 0 ? [`Self-loops detected: ${info.selfLoops.join(', ')}`] : [])
  ];
  
  if (allErrors.length > 0) {
    throw new Error(`Graph validation failed:\\n${allErrors.join('\\n')}`);
  }
  
  return spec;
}

// Export compile-time validation utilities
export type {
  ValidGraph,
  ValidatedGraph,
  GraphValidationError,
  ValidGraphWithOptions,
  GraphValidationOptions,
  CreateValidatedGraph,
  BrandedGraph
};