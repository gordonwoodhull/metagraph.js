import { GraphOptions } from './types.js';
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

export const graph_pattern = (opts?: any) => {
  const options = graph_options(opts);
  return {
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
          node: map_of_lists(options.edgeSource!),
          refs: 'Node',
          ins: ['edges', 'edge_by_key']
        },
        node_ins: {
          node: map_of_lists(options.edgeTarget!),
          refs: 'Node',
          ins: ['edges', 'edge_by_key']
        }
      }
    },
    interface: {
      nodes: {
        Graph: createable('graph'),
        Node: [call('key')(options.nodeKey!), call('value')(options.nodeValue!)],
        Edge: [call('key')(options.edgeKey!), call('value')(options.edgeValue!)]
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
          member: lookupFVal(options.edgeSource!)
        },
        edge_target: {
          name: 'target',
          source: 'Edge', target: 'Node',
          deps: 'node_by_key',
          member: lookupFVal(options.edgeTarget!)
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
  };
};