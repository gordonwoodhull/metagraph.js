import { InterfaceSpec, PatternDefinition, DataflowInstance, Graph, Edge, Node, FlowFunction } from './types.js';
import { as_array } from './core.js';
import { define_dataflow } from './pattern.js';

/**
 * Creates an interface specification for objects that can create instances.
 * Typically used for Graph patterns to enable the 'create' method.
 * 
 * @param flowkey - The key in the environment where the created instance will be stored
 * @returns An interface specification with a 'create' class member
 * 
 * @example
 * ```typescript
 * // Used in graph patterns to enable graph.create(data)
 * const graphInterface = createable('graph');
 * ```
 */
export const createable = (flowkey: string) => ({
  class_members: {
    create: (flowspec: Graph, inode: Node) => ({
      defn: (defn: PatternDefinition) => {
        const flowg = define_dataflow(flowspec, defn);
        return (data: unknown) => {
          const env: Record<string, unknown> = {};
          const flow = flowg.instantiate(env, { data });
          env[flowkey] = defn.node[inode.key()].wrap(flow, (data as Record<string, unknown>)[inode.key()]);
          return env[flowkey];
        };
      }
    })
  }
});

/**
 * Creates an interface specification for a method that calls a function on the object's value.
 * Commonly used to create 'key' and 'value' accessor methods.
 * 
 * @param methodname - The name of the method to create
 * @returns A function that takes an accessor function and returns an interface specification
 * 
 * @example
 * ```typescript
 * // Create key() and value() methods
 * const keyMethod = call('key')(obj => obj.key);
 * const valueMethod = call('value')(obj => obj.value);
 * ```
 */
export const call = (methodname: string) => (f: (val: unknown) => unknown) => ({
  members: [{
    key: methodname,
    value: (flowspec: Graph, inode: Node) => ({
      accessor: f,
      defn: (defn: PatternDefinition, flow: DataflowInstance, val: unknown) => () => f(val)
    })
  }]
});

/**
 * Pre-configured method for accessing the 'key' property of objects.
 */
export const key = call('key');

/**
 * Pre-configured method for accessing the 'value' property of objects.
 */
export const value = call('value');

/**
 * Creates a reference to another interface node.
 * Used for connecting interface elements together.
 * 
 * @param inode - The interface node to reference
 * @returns A reference specification
 */
export const reference = (inode: Node) => ({
  reference: inode
});

/**
 * Creates an interface method that fetches (returns) its input unchanged.
 * Acts as a pass-through for data flow.
 * 
 * @returns An interface specification for fetching data
 */
export const fetch = () => ({
  funfun: (flowspec: Graph, iedge: Edge) => 
    (defn: PatternDefinition, flow: DataflowInstance) => 
      (...args: unknown[]) => {
        const [value] = args as [unknown];
        return () => value;
      }
});

/**
 * Creates an interface method that looks up values in a map using function arguments.
 * The lookup key is derived by applying an optional accessor function to the argument.
 * 
 * @param access - Optional function to transform the lookup key (defaults to identity)
 * @returns An interface specification for argument-based map lookup
 * 
 * @example
 * ```typescript
 * // Direct lookup: map[key]
 * const directLookup = lookupArg();
 * 
 * // Transform key before lookup: map[key.id]
 * const idLookup = lookupArg(key => key.id);
 * ```
 */
export const lookupArg = (access?: (x: unknown) => unknown) => ({
  funfun: (flowspec: Graph, iedge: Edge) => {
    const accessor = access || ((x: unknown) => x);
    return (defn: PatternDefinition, flow: DataflowInstance, val: unknown) => 
      (...args: unknown[]) => {
        const [map] = args as [Record<string, unknown>];
        return (key: unknown) => map[accessor(key) as string];
      };
  }
});

/**
 * Creates an interface method that looks up values in a map using the object's own value.
 * The lookup key is derived by applying an accessor function to the object's value.
 * 
 * @param access - Function to extract the lookup key from the object's value
 * @returns An interface specification for value-based map lookup
 * 
 * @example
 * ```typescript
 * // Lookup using edge.source: map[edge.value.source]
 * const sourceLookup = lookupFVal(edge => edge.source);
 * ```
 */
export const lookupFVal = (access: (val: unknown) => unknown) => ({
  funfun: (flowspec: Graph, iedge: Edge) =>
    (defn: PatternDefinition, flow: DataflowInstance, val: unknown) =>
      (...args: unknown[]) => {
        const [map] = args as [Record<string, unknown>];
        return () => map[access(val) as string];
      }
});

/**
 * Creates an interface method that looks up values using the source node's key accessor.
 * Commonly used for accessing lists associated with specific keys (like adjacency lists).
 * 
 * @returns An interface specification for key-based map lookup with fallback to empty array
 * 
 * @example
 * ```typescript
 * // Get outgoing edges for a node: outEdges[node.key()] || []
 * const nodeOuts = lookupKVal();
 * ```
 */
export const lookupKVal = () => ({
  funfun: (flowspec: Graph, iedge: Edge) =>
    (defn: PatternDefinition, flow: DataflowInstance, val: unknown) =>
      (...args: unknown[]) => {
        const [map] = args as [Record<string, unknown>];
        return () =>
          map[(defn.node[iedge.source().key()].members.key.accessor as (val: unknown) => string)(val)] || [];
      }
});

/**
 * Creates an interface method for generating subgraphs from a parent graph.
 * Supports complex dataflow with multiple pattern compositions and data filtering.
 * 
 * @returns An interface specification for subgraph creation
 * 
 * @example
 * ```typescript
 * // Used in subgraph patterns to enable parent.subgraph(nodeKeys, edgeKeys, data)
 * const subgraphMethod = subgraph();
 * ```
 */
export const subgraph = () => ({
  funfun: (flowspec: Graph, iedge: Edge, flowspecs?: Record<string, Graph>) =>
    (defn: PatternDefinition, flow: DataflowInstance, val: unknown) => {
      const subflow = define_dataflow(flowspec, defn);
      let graflow = subflow;
      const parts = iedge.target().key().split('.');
      if (parts.length > 1) {
        const dest = parts[0];
        graflow = define_dataflow(flowspecs![dest], defn);
      }
      return () => (nodeKeys: string[], edgeKeys: string[], gdata: unknown) => {
        const sgflow = subflow.instantiate({}, {
          data: {
            nodeKeys,
            edgeKeys
          },
          parent: flow
        });
        const genv: Record<string, unknown> = {};
        const gflow = graflow.instantiate(genv, {
          data: sgflow
        });
        genv.graph = defn.node[iedge.target().key()].wrap(gflow, gdata);
        return genv.graph;
      };
    }
});
