import { DataflowNode, PatternDefinition, DataflowInstance } from './types.js';
import { as_array, build_map } from './core.js';

/**
 * Creates a dataflow input node that reads data from the input namespace.
 * 
 * @param path - Optional path to the input data (defaults to node key)
 * @returns A dataflow node specification for reading input data
 * 
 * @example
 * ```typescript
 * // Read from 'data.nodeList'
 * const nodeInput = input('data.nodeList');
 * 
 * // Read from default path
 * const defaultInput = input();
 * ```
 */
export const input = (path?: string) => ({
  calc: (fnode: any) => {
    const actualPath = path || fnode.key();
    const parts = actualPath.split('.');
    const [namespace, name] = parts.length > 1 ? parts : ['data', actualPath];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => () => 
      flow.input(namespace, name);
  }
});

/**
 * Creates a dataflow output node that passes through its input unchanged.
 * Used as a terminal node in dataflow graphs.
 * 
 * @param name - Optional output name (unused in current implementation)
 * @param namespace - Optional output namespace (unused in current implementation)
 * @returns A dataflow node specification that passes through input data
 */
export const output = (name?: string, namespace?: string) => ({
  calc: (fnode: any) => (defn: PatternDefinition) => (flow: DataflowInstance) => (x: any) => x
});

/**
 * Creates a dataflow node that builds a map from array data using pattern-defined accessors.
 * Maps each item in the input array to a wrapped object using the pattern's key accessor.
 * 
 * @returns A dataflow node specification for creating maps from arrays
 * 
 * @example
 * ```typescript
 * // In a pattern definition
 * const mapNode = map(); // Creates {key1: wrappedItem1, key2: wrappedItem2, ...}
 * ```
 */
export const map = () => ({
  calc: (fnode: any) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (data: any[]) =>
      build_map(
        data,
        defn.node[iref].members.key.accessor,
        defn.node[iref].wrap.bind(null, flow)
      );
  }
});

/**
 * Creates a dataflow node representing a singleton that must be initialized elsewhere.
 * Throws an error if accessed before initialization.
 * 
 * @returns A dataflow node specification for singleton values
 * @throws Error when accessed before proper initialization
 */
export const singleton = () => ({
  calc: (fnode: any) => (defn: PatternDefinition) => (flow: DataflowInstance) => () => {
    throw new Error('singleton not initialized');
  }
});

/**
 * Creates a dataflow node that converts a map back to a list using array order.
 * Takes input data array and map, returns array of mapped objects in original order.
 * 
 * @returns A dataflow node specification for creating ordered lists from maps
 * 
 * @example
 * ```typescript
 * // Convert map back to ordered array
 * const listNode = list(); // [data[0] -> map[key0], data[1] -> map[key1], ...]
 * ```
 */
export const list = () => ({
  calc: (fnode: any) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (data: any[], map: Record<string, any>) =>
      data.map(val => map[defn.node[iref].members.key.accessor(val)]);
  }
});

/**
 * Creates a dataflow node that groups array items into lists based on a grouping function.
 * Useful for creating adjacency lists or grouping related items.
 * 
 * @param accessor - Function to extract the grouping key from each item
 * @returns A dataflow node specification for grouping items into lists
 * 
 * @example
 * ```typescript
 * // Group edges by source node
 * const outEdges = map_of_lists(edge => edge.source);
 * // Result: {nodeA: [edge1, edge2], nodeB: [edge3], ...}
 * ```
 */
export const map_of_lists = (accessor: (val: any) => string) => ({
  calc: (fnode: any) => (defn: PatternDefinition) => (flow: DataflowInstance) => (data: any[], map: Record<string, any>) => {
    const iref = as_array(fnode.value().refs)[0];
    return data.reduce((o, v) => {
      const key = accessor(v);
      const list = o[key] = o[key] || [];
      list.push(map[defn.node[iref].members.key.accessor(v)]);
      return o;
    }, {} as Record<string, any[]>);
  }
});

/**
 * Creates a dataflow node that filters array items to include only those with keys in a specified set.
 * Used for creating subgraphs or filtering collections.
 * 
 * @returns A dataflow node specification for filtering arrays by key membership
 * 
 * @example
 * ```typescript
 * // Keep only nodes with keys in the specified set
 * const filteredNodes = subset(); // filters items where item.key ∈ keySet
 * ```
 */
export const subset = () => ({
  calc: (fnode: any) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (items: any[], keys: string[]) => {
      const keySet = new Set(keys);
      return items.filter(r => keySet.has(defn.node[iref].members.key.accessor(r)));
    };
  }
});