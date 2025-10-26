import { pattern, PatternOptions } from './pattern.js';
import type { PatternSpecLiteral, AccessorDeclarations } from './spec.js';
import type { KeyValue, Graph, Node } from './types.js';

type GraphAccessorMap = {
  nodeKey: (kv: KeyValue<string, unknown>) => string;
  edgeKey: (kv: KeyValue<string, unknown>) => string;
  nodeValue: (kv: KeyValue<string, unknown>) => unknown;
  edgeValue: (kv: KeyValue<string, unknown>) => unknown;
  edgeSource: (kv: KeyValue<string, unknown>) => string;
  edgeTarget: (kv: KeyValue<string, unknown>) => string;
};

export type GraphPatternRuntimeAccessors = GraphAccessorMap;

type AccessorTypes<A extends GraphPatternRuntimeAccessors> = {
  nodeInput: Parameters<A['nodeValue']>[0];
  edgeInput: Parameters<A['edgeValue']>[0];
  nodeValue: ReturnType<A['nodeValue']>;
  edgeValue: ReturnType<A['edgeValue']>;
};

type GraphCreateInput<A extends GraphPatternRuntimeAccessors> = {
  nodes: ReadonlyArray<AccessorTypes<A>['nodeInput']>;
  edges: ReadonlyArray<AccessorTypes<A>['edgeInput']>;
};

type GraphClassMembers<A extends GraphPatternRuntimeAccessors> = {
  create: (data: GraphCreateInput<A>) => Graph<AccessorTypes<A>['nodeValue'], AccessorTypes<A>['edgeValue']>;
};

type NodeMembers<A extends GraphPatternRuntimeAccessors> = {
  key: () => ReturnType<A['nodeKey']>;
  value: () => AccessorTypes<A>['nodeValue'];
} & Record<string, unknown>;

type EdgeMembers<A extends GraphPatternRuntimeAccessors> = {
  key: () => ReturnType<A['edgeKey']>;
  value: () => AccessorTypes<A>['edgeValue'];
} & Record<string, unknown>;

type GraphPatternFactory<A extends GraphPatternRuntimeAccessors> = ReturnType<typeof pattern> & {
  node(name: 'Graph'): Node<GraphClassMembers<A>>;
  node(name: 'Node'): Node<NodeMembers<A>>;
  node(name: 'Edge'): Node<EdgeMembers<A>>;
  node(name: string): Node<unknown>;
};

type GraphPayloads = {
  readonly graph: {
    readonly nodes: readonly KeyValue<string, unknown>[];
    readonly edges: readonly KeyValue<string, unknown>[];
  };
};

type GraphAccessorDeclarations = AccessorDeclarations<GraphAccessorMap>;

export const graphPatternSpec =
  {
  payloads: {
    graph: {
      nodes: [],
      edges: []
    }
  },
  accessors: {
    nodeKey: {} as GraphAccessorDeclarations['nodeKey'],
    edgeKey: {} as GraphAccessorDeclarations['edgeKey'],
    nodeValue: {} as GraphAccessorDeclarations['nodeValue'],
    edgeValue: {} as GraphAccessorDeclarations['edgeValue'],
    edgeSource: {} as GraphAccessorDeclarations['edgeSource'],
    edgeTarget: {} as GraphAccessorDeclarations['edgeTarget']
  },
  dataflow: {
    nodes: {
      nodes: { kind: 'input' },
      edges: { kind: 'input' },
      node_by_key: {
        kind: 'map',
        refs: 'Node',
        ins: 'nodes'
      },
      edge_by_key: {
        kind: 'map',
        refs: 'Edge',
        ins: 'edges'
      },
      graph: { kind: 'singleton' },
      node_list: {
        kind: 'list',
        refs: 'Node',
        ins: ['nodes', 'node_by_key']
      },
      edge_list: {
        kind: 'list',
        refs: 'Edge',
        ins: ['edges', 'edge_by_key']
      },
      node_outs: {
        kind: 'map_of_lists',
        refs: 'Node',
        accessor: 'edgeSource',
        ins: ['edges', 'edge_by_key']
      },
      node_ins: {
        kind: 'map_of_lists',
        refs: 'Node',
        accessor: 'edgeTarget',
        ins: ['edges', 'edge_by_key']
      }
    }
  },
  interface: {
    nodes: {
      Graph: {
        classMembers: {
          create: { kind: 'createable', flow: 'graph' }
        }
      },
      Node: {
        members: {
          key: { kind: 'call', accessor: 'nodeKey' },
          value: { kind: 'call', accessor: 'nodeValue' }
        }
      },
      Edge: {
        members: {
          key: { kind: 'call', accessor: 'edgeKey' },
          value: { kind: 'call', accessor: 'edgeValue' }
        }
      }
    },
    edges: {
      graph_node: {
        name: 'node',
        source: 'Graph',
        target: 'Node',
        deps: 'node_by_key',
        member: { kind: 'lookupArg' }
      },
      node_graph: {
        name: 'graph',
        source: 'Node',
        target: 'Graph',
        deps: 'graph',
        member: { kind: 'fetch' }
      },
      graph_nodes: {
        name: 'nodes',
        source: 'Graph',
        target: 'Node',
        deps: 'node_list',
        member: { kind: 'fetch' }
      },
      graph_edge: {
        name: 'edge',
        source: 'Graph',
        target: 'Edge',
        deps: 'edge_by_key',
        member: { kind: 'lookupArg' }
      },
      edge_graph: {
        name: 'graph',
        source: 'Edge',
        target: 'Graph',
        deps: 'graph',
        member: { kind: 'fetch' }
      },
      graph_edges: {
        name: 'edges',
        source: 'Graph',
        target: 'Edge',
        deps: 'edge_list',
        member: { kind: 'fetch' }
      },
      edge_source: {
        name: 'source',
        source: 'Edge',
        target: 'Node',
        deps: 'node_by_key',
        member: { kind: 'lookupFVal', accessor: 'edgeSource' }
      },
      edge_target: {
        name: 'target',
        source: 'Edge',
        target: 'Node',
        deps: 'node_by_key',
        member: { kind: 'lookupFVal', accessor: 'edgeTarget' }
      },
      node_outs: {
        name: 'outs',
        source: 'Node',
        target: 'Edge',
        deps: 'node_outs',
        member: { kind: 'lookupKVal' }
      },
      node_ins: {
        name: 'ins',
        source: 'Node',
        target: 'Edge',
        deps: 'node_ins',
        member: { kind: 'lookupKVal' }
      }
    }
  }
} as const satisfies PatternSpecLiteral<GraphPayloads, GraphAccessorMap>;

export const defaultGraphPatternAccessors = (): GraphPatternRuntimeAccessors => ({
  nodeKey: (kv: KeyValue<string, unknown>) => kv.key,
  edgeKey: (kv: KeyValue<string, unknown>) => kv.key,
  nodeValue: (kv: KeyValue<string, unknown>) => kv.value,
  edgeValue: (kv: KeyValue<string, unknown>) => kv.value,
  edgeSource: (kv: KeyValue<string, unknown>) => (kv.value as { source: string }).source,
  edgeTarget: (kv: KeyValue<string, unknown>) => (kv.value as { target: string }).target
});

export const graph_pattern = <A extends GraphPatternRuntimeAccessors = GraphPatternRuntimeAccessors>(
  accessors?: A
): GraphPatternFactory<A> => {
  const runtimeAccessors = (accessors ?? defaultGraphPatternAccessors()) as GraphPatternRuntimeAccessors;
  const options: PatternOptions<typeof graphPatternSpec> = {
    accessors: runtimeAccessors
  };
  return pattern(graphPatternSpec, options) as GraphPatternFactory<A>;
};
