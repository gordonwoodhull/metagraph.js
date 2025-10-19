import { DataflowNodeFactory, PatternDefinition, DataflowInstance, Graph, Node } from './types.js';
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
export const input = (path?: string): DataflowNodeFactory<[], unknown> => ({
  calc: (fnode: Node) => {
    const spec = fnode.value() as { original?: { key: string } };
    const originalKey = spec.original?.key;
    const actualPath = path ?? originalKey ?? fnode.key();
    if (path === undefined && actualPath.includes('.')) {
      const segments = actualPath.split('.');
      const name = segments[segments.length - 1];
      return (defn: PatternDefinition) => (flow: DataflowInstance) => () => 
        flow.input('data', name);
    }
    const parts = actualPath.split('.');
    const [namespace, name] = parts.length > 1 ? [parts[0], parts.slice(1).join('.')] : ['data', actualPath];
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
export const output = <Input = unknown>() : DataflowNodeFactory<[Input], Input> => ({
  calc: (fnode: Node) => (defn: PatternDefinition) => (flow: DataflowInstance) => (...args: unknown[]) => {
    const [value] = args as [Input?];
    return value as Input;
  }
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
export const map = (): DataflowNodeFactory<[unknown[]], Record<string, unknown>> => ({
  calc: (fnode: Node) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (...args: unknown[]) => {
      const [data] = args as [unknown[]];
      return build_map(
        data,
        defn.node[iref].members.key.accessor as (val: unknown) => string,
        defn.node[iref].wrap.bind(null, flow)
      );
    };
  }
});

/**
 * Creates a dataflow node representing a singleton that must be initialized elsewhere.
 * Throws an error if accessed before initialization.
 * 
 * @returns A dataflow node specification for singleton values
 * @throws Error when accessed before proper initialization
 */
export const singleton = (): DataflowNodeFactory<[], never> => ({
  calc: (fnode: Node) => (defn: PatternDefinition) => (flow: DataflowInstance) => () => {
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
export const list = (): DataflowNodeFactory<[unknown[], Record<string, unknown>], unknown[]> => ({
  calc: (fnode: Node) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (...args: unknown[]) => {
      const [data, map] = args as [unknown[], Record<string, unknown>];
      return data.map(val => map[(defn.node[iref].members.key.accessor as (val: unknown) => string)(val)]);
    };
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
export const map_of_lists = (accessor: (val: unknown) => string): DataflowNodeFactory<[unknown[], Record<string, unknown>], Record<string, unknown[]>> => ({
  calc: (fnode: Node) => (defn: PatternDefinition) => (flow: DataflowInstance) => (...args: unknown[]) => {
    const [data, map] = args as [unknown[], Record<string, unknown>];
    const iref = as_array((fnode.value() as {refs?: string | string[]}).refs)[0];
    return data.reduce((o: Record<string, unknown[]>, v) => {
      const key = accessor(v);
      const list = o[key] = o[key] || [];
      list.push(map[(defn.node[iref].members.key.accessor as (val: unknown) => string)(v)]);
      return o;
    }, {} as Record<string, unknown[]>);
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
export const subset = (): DataflowNodeFactory<[unknown[], string[]], unknown[]> => ({
  calc: (fnode: Node) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (...args: unknown[]) => {
      const [items, keys] = args as [unknown[], string[]];
      const keySet = new Set(keys);
      return items.filter(r => keySet.has((defn.node[iref].members.key.accessor as (val: unknown) => string)(r)));
    };
  }
});
