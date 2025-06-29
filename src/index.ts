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

// For backward compatibility, also export graph as graph_adjacency
export { graph as graph_adjacency } from './graph.js';

// Create key and value helpers using call
import { call } from './interface.js';
export const key = call('key');
export const value = call('value');