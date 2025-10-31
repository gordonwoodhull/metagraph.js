import { pattern, PatternOptions } from './pattern.js';
import { graphPatternSpec } from './graph_pattern.js';
import type { PatternSpecLiteral, AccessorDeclarations } from './spec.js';
import type { PatternGraphType } from './pattern_types.js';
import type { GraphPatternRuntimeAccessors, GraphDataflowNamespace } from './graph_pattern.js';
import type { NamespaceDescriptor } from './pattern_dataflow.js';

export interface SubgraphPatternRuntimeAccessors {
  wrappedKey: (wrapper: { key: () => string }) => string;
}

type SubgraphPayloads = Record<string, never>;

type SubgraphAccessorMap = SubgraphPatternRuntimeAccessors;

type SubgraphAccessorDeclarations = AccessorDeclarations<SubgraphAccessorMap>;

type GraphNamespaceDescriptor<A extends GraphPatternRuntimeAccessors> = NamespaceDescriptor<
  typeof graphPatternSpec,
  A,
  GraphDataflowNamespace<A>
>;

export type SubgraphNamespaces<
  ParentAccessors extends GraphPatternRuntimeAccessors = GraphPatternRuntimeAccessors,
  ChildAccessors extends GraphPatternRuntimeAccessors = GraphPatternRuntimeAccessors
> = {
  readonly parent: GraphNamespaceDescriptor<ParentAccessors>;
  readonly child: GraphNamespaceDescriptor<ChildAccessors>;
};

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

export function subgraph_pattern<
  ParentAccessors extends GraphPatternRuntimeAccessors = GraphPatternRuntimeAccessors,
  ChildAccessors extends GraphPatternRuntimeAccessors = GraphPatternRuntimeAccessors
>(): PatternGraphType<typeof subgraphPatternSpec, SubgraphPatternRuntimeAccessors, SubgraphNamespaces<ParentAccessors, ChildAccessors>>;
export function subgraph_pattern<
  A extends SubgraphPatternRuntimeAccessors,
  ParentAccessors extends GraphPatternRuntimeAccessors = GraphPatternRuntimeAccessors,
  ChildAccessors extends GraphPatternRuntimeAccessors = GraphPatternRuntimeAccessors
>(accessors: A): PatternGraphType<typeof subgraphPatternSpec, A, SubgraphNamespaces<ParentAccessors, ChildAccessors>>;
export function subgraph_pattern(accessors?: SubgraphPatternRuntimeAccessors) {
  if (accessors) {
    const options: PatternOptions<
      typeof subgraphPatternSpec,
      typeof accessors,
      SubgraphNamespaces
    > = {
      accessors
    };
    return pattern<
      typeof subgraphPatternSpec,
      typeof accessors,
      SubgraphNamespaces
    >(subgraphPatternSpec, options);
  }
  const defaults = defaultSubgraphAccessors();
  const options: PatternOptions<
    typeof subgraphPatternSpec,
    typeof defaults,
    SubgraphNamespaces
  > = {
    accessors: defaults
  };
  return pattern<
    typeof subgraphPatternSpec,
    typeof defaults,
    SubgraphNamespaces
  >(subgraphPatternSpec, options);
}
