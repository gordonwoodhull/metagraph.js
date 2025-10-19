import { GraphOptions } from './types.js';
import { definePattern } from './pattern_spec.js';
import { input, output, map, singleton, list, map_of_lists } from './dataflow_calcs.js';
import { createable, call, fetch, lookupArg, lookupFVal, lookupKVal } from './interface.js';

const graph_options = <N = any, E = any>(opts?: Partial<GraphOptions<N, E>>): GraphOptions<N, E> => 
  Object.assign({
    nodeKey: (kv: any) => kv.key,
    edgeKey: (kv: any) => kv.key,
    nodeValue: (kv: any) => kv.value,
    edgeValue: (kv: any) => kv.value,
    edgeSource: (kv: any) => kv.value.source,
    edgeTarget: (kv: any) => kv.value.target
  }, opts || {});

/**
 * Creates a standard graph pattern specification for building graph instances.
 * Defines the dataflow computation and interface for creating graph objects with nodes and edges.
 * 
 * @param opts - Optional graph options for customizing node/edge accessors
 * @returns A pattern specification that can create graph instances
 * 
 * @example
 * ```typescript
 * // Create a graph pattern and use it to build a graph
 * const pat = pattern(graph_pattern());
 * const myGraph = pat.node('Graph').value().create({
 *   nodes: [{key: 'a'}, {key: 'b'}],
 *   edges: [{key: 'edge', value: {source: 'a', target: 'b'}}]
 * });
 * ```
 */
export const graph_pattern = <N = any, E = any>(opts?: Partial<GraphOptions<N, E>>) => {
  const options = graph_options<N, E>(opts);
  return definePattern({
    dataflow: {
      incidences: {
        nodes: { node: input() },
        edges: { node: input() },
        node_by_key: {
          node: map(),
          refs: 'Node',
          ins: 'nodes'
        },
        edge_by_key: {
          node: map(),
          refs: 'Edge',
          ins: 'edges'
        },
        graph: { node: singleton() },
        node_list: {
          node: list(),
          refs: 'Node',
          ins: ['nodes', 'node_by_key']
        },
        edge_list: {
          node: list(),
          refs: 'Edge',
          ins: ['edges', 'edge_by_key']
        },
        node_outs: {
          node: map_of_lists(options.edgeSource! as (val: unknown) => string),
          refs: 'Node',
          ins: ['edges', 'edge_by_key']
        },
        node_ins: {
          node: map_of_lists(options.edgeTarget! as (val: unknown) => string),
          refs: 'Node',
          ins: ['edges', 'edge_by_key']
        }
      }
    },
    interface: {
      nodes: {
        Graph: createable('graph'),
        Node: [call('key')(options.nodeKey! as (val: unknown) => unknown), call('value')(options.nodeValue! as (val: unknown) => unknown)],
        Edge: [call('key')(options.edgeKey! as (val: unknown) => unknown), call('value')(options.edgeValue! as (val: unknown) => unknown)]
      },
      edges: {
        graph_node: {
          name: 'node',
          source: 'Graph', target: 'Node',
          deps: 'node_by_key',
          member: lookupArg()
        },
        node_graph: {
          name: 'graph',
          source: 'Node', target: 'Graph',
          deps: 'graph',
          member: fetch()
        },
        graph_nodes: {
          name: 'nodes',
          source: 'Graph', target: 'Node',
          deps: 'node_list',
          member: fetch()
        },
        graph_edge: {
          name: 'edge',
          source: 'Graph', target: 'Edge',
          deps: 'edge_by_key',
          member: lookupArg()
        },
        edge_graph: {
          name: 'graph',
          source: 'Edge', target: 'Graph',
          deps: 'graph',
          member: fetch()
        },
        graph_edges: {
          name: 'edges',
          source: 'Graph', target: 'Edge',
          deps: 'edge_list',
          member: fetch()
        },
        edge_source: {
          name: 'source',
          source: 'Edge', target: 'Node',
          deps: 'node_by_key',
          member: lookupFVal(options.edgeSource! as (val: unknown) => unknown)
        },
        edge_target: {
          name: 'target',
          source: 'Edge', target: 'Node',
          deps: 'node_by_key',
          member: lookupFVal(options.edgeTarget! as (val: unknown) => unknown)
        },
        node_outs: {
          name: 'outs',
          source: 'Node', target: 'Edge',
          deps: 'node_outs',
          member: lookupKVal()
        },
        node_ins: {
          name: 'ins',
          source: 'Node', target: 'Edge',
          deps: 'node_ins',
          member: lookupKVal()
        }
      }
    }
  });
};

export type GraphPatternDefinition = ReturnType<typeof graph_pattern>;
