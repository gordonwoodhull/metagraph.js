// Draft type-only sketch for graph_pattern. Untested, but captures the deep readonly structure
// we discussed. This should serve as a reference when we start porting the real code.

/**
 * Generic deep-readonly helper. Functions pass through unchanged, arrays become
 * readonly arrays, and objects recurse property-by-property.
 */
type DeepReadonly<T> =
  T extends (...args: any[]) => unknown
    ? T
    : T extends ReadonlyArray<infer U>
      ? readonly DeepReadonly<U>[]
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

/**
 * Lightweight “constructors” that mirror the runtime helpers.
 * They simply record the necessary literal information at the type level.
 */
type Input<Path extends string | undefined = undefined> = { kind: 'input'; path: Path };
type MapCalc = { kind: 'map' };
type Singleton = { kind: 'singleton' };
type List = { kind: 'list' };
type MapOfLists<Accessor extends (value: unknown) => string> = {
  kind: 'map_of_lists';
  accessor: Accessor;
};

type Createable<FlowKey extends string> = { kind: 'createable'; flowKey: FlowKey };
type Call<Name extends string, Fn extends (value: unknown) => unknown> = { kind: 'call'; name: Name; fn: Fn };

type LookupArg<Transform extends (value: unknown) => unknown = (value: unknown) => unknown> = {
  kind: 'lookupArg';
  transform: Transform;
};
type LookupFVal<Accessor extends (value: unknown) => unknown> = { kind: 'lookupFVal'; accessor: Accessor };
type LookupKVal = { kind: 'lookupKVal' };
type Fetch = { kind: 'fetch' };

/**
 * Options threaded through the graph pattern runtime factory.
 */
type GraphPatternOptions = {
  nodeKey: (kv: unknown) => unknown;
  nodeValue: (kv: unknown) => unknown;
  edgeKey: (kv: unknown) => unknown;
  edgeValue: (kv: unknown) => unknown;
  edgeSource: (kv: unknown) => string;
  edgeTarget: (kv: unknown) => string;
};

/**
 * DeepReadonly wrapper over the runtime structure for graph_pattern.
 */
type GraphPatternSpec<Opts extends GraphPatternOptions> = DeepReadonly<{
  dataflow: {
    incidences: {
      nodes: { node: Input };
      edges: { node: Input };
      node_by_key: {
        node: MapCalc;
        refs: 'Node';
        ins: 'nodes';
      };
      edge_by_key: {
        node: MapCalc;
        refs: 'Edge';
        ins: 'edges';
      };
      graph: { node: Singleton };
      node_list: {
        node: List;
        refs: 'Node';
        ins: ['nodes', 'node_by_key'];
      };
      edge_list: {
        node: List;
        refs: 'Edge';
        ins: ['edges', 'edge_by_key'];
      };
      node_outs: {
        node: MapOfLists<Opts['edgeSource']>;
        refs: 'Node';
        ins: ['edges', 'edge_by_key'];
      };
      node_ins: {
        node: MapOfLists<Opts['edgeTarget']>;
        refs: 'Node';
        ins: ['edges', 'edge_by_key'];
      };
    };
  };
  interface: {
    nodes: {
      Graph: Createable<'graph'>;
      Node: [
        Call<'key', Opts['nodeKey']>,
        Call<'value', Opts['nodeValue']>
      ];
      Edge: [
        Call<'key', Opts['edgeKey']>,
        Call<'value', Opts['edgeValue']>
      ];
    };
    edges: {
      graph_node: {
        name: 'node';
        source: 'Graph'; target: 'Node';
        deps: 'node_by_key';
        member: LookupArg;
      };
      node_graph: {
        name: 'graph';
        source: 'Node'; target: 'Graph';
        deps: 'graph';
        member: Fetch;
      };
      graph_nodes: {
        name: 'nodes';
        source: 'Graph'; target: 'Node';
        deps: 'node_list';
        member: Fetch;
      };
      graph_edge: {
        name: 'edge';
        source: 'Graph'; target: 'Edge';
        deps: 'edge_by_key';
        member: LookupArg;
      };
      edge_graph: {
        name: 'graph';
        source: 'Edge'; target: 'Graph';
        deps: 'graph';
        member: Fetch;
      };
      graph_edges: {
        name: 'edges';
        source: 'Graph'; target: 'Edge';
        deps: 'edge_list';
        member: Fetch;
      };
      edge_source: {
        name: 'source';
        source: 'Edge'; target: 'Node';
        deps: 'node_by_key';
        member: LookupFVal<Opts['edgeSource']>;
      };
      edge_target: {
        name: 'target';
        source: 'Edge'; target: 'Node';
        deps: 'node_by_key';
        member: LookupFVal<Opts['edgeTarget']>;
      };
      node_outs: {
        name: 'outs';
        source: 'Node'; target: 'Edge';
        deps: 'node_outs';
        member: LookupKVal;
      };
      node_ins: {
        name: 'ins';
        source: 'Node'; target: 'Edge';
        deps: 'node_ins';
        member: LookupKVal;
      };
    };
  };
}>;

// The subgraph pattern would look similar: swap nodes/edges/aliases per its runtime spec.
