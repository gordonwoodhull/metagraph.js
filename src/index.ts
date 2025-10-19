/**
 * # Metagraph.js
 * 
 * A TypeScript library for building higher-order graph data structures with composable patterns,
 * lazy evaluation, and dataflow computation capabilities.
 * 
 * ## Core Features
 * 
 * - **Graph Data Structures**: Adjacency and incidence list representations
 * - **Lazy Evaluation**: On-demand computation of graph properties
 * - **Dataflow Graphs**: Computation graphs with dependency resolution
 * - **Graph Patterns**: Reusable templates for creating graph instances
 * - **Pattern Composition**: Combine multiple patterns into complex structures
 * - **Topological Sorting**: DAG ordering algorithms
 * 
 * ## Basic Usage
 * 
 * ```typescript
 * import { graph, pattern, graph_pattern } from 'metagraph';
 * 
 * // Create a simple graph
 * const g = graph(
 *   [{key: 'a'}, {key: 'b'}],
 *   [{key: 'edge', value: {source: 'a', target: 'b'}}]
 * );
 * 
 * // Create a graph using patterns
 * const graphPat = pattern(graph_pattern());
 * const instance = graphPat.node('Graph').value().create({
 *   nodes: [{key: 'x'}, {key: 'y'}],
 *   edges: [{key: 'connection', value: {source: 'x', target: 'y'}}]
 * });
 * ```
 * 
 * @packageDocumentation
 */

// Re-export everything from individual modules
export { version } from './core.js';
export { graph, graph_incidence, graph_detect } from './graph.js';
export { dataflow } from './dataflow.js';
export { pattern } from './pattern.js';
export { compose } from './compose.js';
export { topological_sort } from './topological_sort.js';
export { createable, call, reference, fetch, lookupArg, lookupFVal, lookupKVal, subgraph } from './interface.js';
export { input, output, map, singleton, list, map_of_lists, subset } from './dataflow_calcs.js';
export { graph_pattern } from './graph_pattern.js';
export { subgraph_pattern } from './subgraph_pattern.js';
export { definePattern, makePatternSpec } from './pattern_spec.js';
export { buildDataflowIncidences, buildDataflowGraphSpec } from './dataflow_ast.js';
export type { PatternSpec, PatternGraph } from './types.js';

// For backward compatibility, also export graph as graph_adjacency
export { graph as graph_adjacency } from './graph.js';

// Create key and value helpers using call
import { call } from './interface.js';
export const key = call('key');
export const value = call('value');
