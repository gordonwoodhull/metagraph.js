import { GraphOptions, makePatternSpec } from './types.js';
import { input, output, subset } from './dataflow_calcs.js';
import { subgraph, lookupArg } from './interface.js';

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
 * Creates a subgraph pattern specification for filtering parent graphs.
 * Enables creation of subgraphs by selecting subsets of nodes and edges from parent graphs.
 * 
 * @param opts - Optional graph options for customizing node/edge accessors
 * @returns A pattern specification for creating subgraph functionality
 * 
 * @example
 * ```typescript
 * // Used in composed patterns to enable subgraph operations
 * const subPat = subgraph_pattern();
 * // Results in parent.subgraph(['nodeA', 'nodeB'], ['edge1'], data)
 * ```
 */
export const subgraph_pattern = <N = any, E = any>(_opts?: Partial<GraphOptions<N, E>>) => {
  return makePatternSpec({
    dataflow: {
      incidences: {
        parent_nodes: { node: input('parent.nodes') },
        parent_edges: { node: input('parent.edges') },
        node_keys: { node: input('nodeKeys') },
        edge_keys: { node: input('edgeKeys') },
        subset_nodes: {
          node: subset(),
          refs: 'child.Node',
          ins: ['parent_nodes', 'node_keys']
        },
        subset_edges: {
          node: subset(),
          refs: 'child.Edge',
          ins: ['parent_edges', 'edge_keys']
        },
        nodes: {
          node: output(),
          ins: 'subset_nodes'
        },
        edges: {
          node: output(),
          ins: 'subset_edges'
        }
      }
    },
    interface: {
      nodes: {
        ParentGraph: 'parent.Graph',
        ChildGraph: 'child.Graph'
      },
      edges: {
        subgraph: {
          name: 'subgraph',
          source: 'ParentGraph', target: 'ChildGraph',
          member: subgraph()
        },
        subnode: {
          name: 'subnode',
          source: 'ParentGraph', target: 'ChildGraph',
          deps: 'parent.node_by_key',
          member: lookupArg()
        },
        subedge: {
          name: 'subedge',
          source: 'ParentGraph', target: 'ChildGraph',
          deps: 'parent.edge_by_key',
          flow: lookupArg()
        },
        subgraphS: {
          name: 'subgraph',
          source: 'ChildGraph', target: 'ParentGraph',
          member: subgraph()
        },
        subnodeS: {
          name: 'subnode',
          source: 'ChildGraph', target: 'ParentGraph',
          deps: 'node_by_key',
          member: lookupArg((x: any) => x.key())
        },
        subedgeS: {
          name: 'subedge',
          source: 'ChildGraph', target: 'ParentGraph',
          deps: 'edge_by_key',
          flow: lookupArg((x: any) => x.key())
        }
      }
    }
  });
};

export type SubgraphPatternDefinition = ReturnType<typeof subgraph_pattern>;
