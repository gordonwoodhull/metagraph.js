import { pattern, PatternOptions } from './pattern.js';
import type { PatternSpecLiteral, AccessorDeclarations } from './spec.js';
import type { Graph, Node } from './types.js';

export interface SubgraphPatternRuntimeAccessors {
  wrappedKey: (wrapper: { key: () => string }) => string;
}

type SubgraphAccessorTypes<A extends SubgraphPatternRuntimeAccessors> = {
  wrapper: Parameters<A['wrappedKey']>[0];
  key: ReturnType<A['wrappedKey']>;
};

type SubgraphWrapper<A extends SubgraphPatternRuntimeAccessors> = {
  subgraph: (
    nodeKeys: ReadonlyArray<SubgraphAccessorTypes<A>['key']>,
    edgeKeys: ReadonlyArray<SubgraphAccessorTypes<A>['key']>,
    data: unknown
  ) => Graph;
} & Record<string, unknown>;

type SubgraphPatternFactory<A extends SubgraphPatternRuntimeAccessors> = ReturnType<typeof pattern> & {
  node(name: 'ParentGraph'): Node<SubgraphWrapper<A>>;
  node(name: 'ChildGraph'): Node<SubgraphWrapper<A>>;
  node(name: string): Node<unknown>;
};

type SubgraphPayloads = Record<string, never>;

type SubgraphAccessorMap = SubgraphPatternRuntimeAccessors;
type SubgraphAccessorDeclarations = AccessorDeclarations<SubgraphAccessorMap>;

export const subgraphPatternSpec =
  {
  payloads: {},
  accessors: {
    wrappedKey: {} as SubgraphAccessorDeclarations['wrappedKey']
  },
  dataflow: {
    nodes: {
      parent_nodes: { kind: 'input', path: 'parent.nodes' },
      parent_edges: { kind: 'input', path: 'parent.edges' },
      node_keys: { kind: 'input', path: 'nodeKeys' },
      edge_keys: { kind: 'input', path: 'edgeKeys' },
      subset_nodes: {
        kind: 'subset',
        refs: 'child.Node',
        ins: ['parent_nodes', 'node_keys']
      },
      subset_edges: {
        kind: 'subset',
        refs: 'child.Edge',
        ins: ['parent_edges', 'edge_keys']
      },
      nodes: {
        kind: 'output',
        ins: 'subset_nodes'
      },
      edges: {
        kind: 'output',
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
        source: 'ParentGraph',
        target: 'ChildGraph',
        member: { kind: 'subgraph' }
      },
      subnode: {
        name: 'subnode',
        source: 'ParentGraph',
        target: 'ChildGraph',
        deps: 'parent.node_by_key',
        member: { kind: 'lookupArg' }
      },
      subedge: {
        name: 'subedge',
        source: 'ParentGraph',
        target: 'ChildGraph',
        deps: 'parent.edge_by_key',
        member: { kind: 'lookupArg' }
      },
      subgraphS: {
        name: 'subgraph',
        source: 'ChildGraph',
        target: 'ParentGraph',
        member: { kind: 'subgraph' }
      },
      subnodeS: {
        name: 'subnode',
        source: 'ChildGraph',
        target: 'ParentGraph',
        deps: 'node_by_key',
        member: { kind: 'lookupArg', accessor: 'wrappedKey' }
      },
      subedgeS: {
        name: 'subedge',
        source: 'ChildGraph',
        target: 'ParentGraph',
        deps: 'edge_by_key',
        member: { kind: 'lookupArg', accessor: 'wrappedKey' }
      }
    }
  }
} as const satisfies PatternSpecLiteral<SubgraphPayloads, SubgraphAccessorMap>;

export const defaultSubgraphAccessors = (): SubgraphPatternRuntimeAccessors => ({
  wrappedKey: (wrapper) => wrapper.key()
});

export const subgraph_pattern = <A extends SubgraphPatternRuntimeAccessors = SubgraphPatternRuntimeAccessors>(
  accessors?: A
): SubgraphPatternFactory<A> => {
  const runtimeAccessors = (accessors ?? defaultSubgraphAccessors()) as SubgraphPatternRuntimeAccessors;
  const options: PatternOptions<typeof subgraphPatternSpec> = {
    accessors: runtimeAccessors
  };
  return pattern(subgraphPatternSpec, options) as SubgraphPatternFactory<A>;
};
