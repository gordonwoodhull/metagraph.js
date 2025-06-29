import { KeyValue, GraphOptions, Node, Edge, Graph, IncidenceOptions, GraphSpec } from './types.js';
import { as_array, as_keyvalue, build_map } from './core.js';

function graph_options<N = any, E = any>(opts?: Partial<GraphOptions<N, E>>): GraphOptions<N, E> {
  return Object.assign({
    nodeKey: (kv: KeyValue<string, N>) => kv.key,
    edgeKey: (kv: KeyValue<string, E>) => kv.key,
    nodeValue: (kv: KeyValue<string, N>) => kv.value,
    edgeValue: (kv: KeyValue<string, E>) => kv.value,
    edgeSource: (kv: KeyValue<string, E>) => (kv.value as any).source,
    edgeTarget: (kv: KeyValue<string, E>) => (kv.value as any).target
  }, opts || {});
}

class NodeImpl<N = any, E = any> implements Node<N> {
  constructor(
    private n: KeyValue<string, N>,
    private options: GraphOptions<N, E>,
    private graph_ref: () => Graph<N, E>,
    private outs_map: () => Record<string, Edge<E>[]>,
    private ins_map: () => Record<string, Edge<E>[]>
  ) {}

  value(): N {
    return this.options.nodeValue!(this.n);
  }

  key(): string {
    return this.options.nodeKey!(this.n);
  }

  graph(): Graph<N, E> {
    return this.graph_ref();
  }

  outs(): Edge<E>[] {
    return this.outs_map()[this.options.nodeKey!(this.n)] || [];
  }

  ins(): Edge<E>[] {
    return this.ins_map()[this.options.nodeKey!(this.n)] || [];
  }
}

class EdgeImpl<N = any, E = any> implements Edge<E> {
  constructor(
    private e: KeyValue<string, E>,
    private options: GraphOptions<N, E>,
    private graph_ref: () => Graph<N, E>
  ) {}

  value(): E {
    return this.options.edgeValue!(this.e);
  }

  key(): string {
    return this.options.edgeKey!(this.e);
  }

  graph(): Graph<N, E> {
    return this.graph_ref();
  }

  source(): Node<N> {
    return this.graph_ref().node(this.options.edgeSource!(this.e))!;
  }

  target(): Node<N> {
    return this.graph_ref().node(this.options.edgeTarget!(this.e))!;
  }
}

class GraphImpl<N = any, E = any> implements Graph<N, E> {
  private _nodeMap?: Record<string, Node<N>>;
  private _edgeMap?: Record<string, Edge<E>>;
  private _nodesList?: Node<N>[];
  private _edgesList?: Edge<E>[];
  private _outsList?: Record<string, Edge<E>[]>;
  private _insList?: Record<string, Edge<E>[]>;

  constructor(
    private nodesList: KeyValue<string, N>[],
    private edgesList: KeyValue<string, E>[],
    private options: GraphOptions<N, E>
  ) {}

  private build_node_map(): void {
    if (this._nodeMap) return;
    this._nodeMap = build_map(this.nodesList, this.options.nodeKey!, (n) => 
      new NodeImpl(n, this.options, () => this, () => this.get_outs_map(), () => this.get_ins_map())
    );
  }

  private build_edge_map(): void {
    if (this._edgeMap) return;
    this._edgeMap = build_map(this.edgesList, this.options.edgeKey!, (e) => 
      new EdgeImpl(e, this.options, () => this)
    );
  }

  private build_nodes_list(): void {
    if (this._nodesList) return;
    this.build_node_map();
    this._nodesList = this.nodesList.map(v => this.node(this.options.nodeKey!(v))!);
  }

  private build_edges_list(): void {
    if (this._edgesList) return;
    this.build_edge_map();
    this._edgesList = this.edgesList.map(v => this.edge(this.options.edgeKey!(v))!);
  }

  private build_directional_edge_lists(acc: (v: KeyValue<string, E>) => string): Record<string, Edge<E>[]> {
    this.build_edge_map();
    return this.edgesList.reduce((o, v) => {
      const key = acc(v);
      const list = o[key] = o[key] || [];
      list.push(this.edge(this.options.edgeKey!(v))!);
      return o;
    }, {} as Record<string, Edge<E>[]>);
  }

  private build_outs_map(): void {
    if (this._outsList) return;
    this._outsList = this.build_directional_edge_lists(this.options.edgeSource!);
  }

  private build_ins_map(): void {
    if (this._insList) return;
    this._insList = this.build_directional_edge_lists(this.options.edgeTarget!);
  }

  private get_outs_map(): Record<string, Edge<E>[]> {
    this.build_outs_map();
    return this._outsList!;
  }

  private get_ins_map(): Record<string, Edge<E>[]> {
    this.build_ins_map();
    return this._insList!;
  }

  node(key: string): Node<N> | undefined {
    this.build_node_map();
    return this._nodeMap![key];
  }

  edge(key: string): Edge<E> | undefined {
    this.build_edge_map();
    return this._edgeMap![key];
  }

  nodes(): Node<N>[] {
    this.build_nodes_list();
    return this._nodesList!;
  }

  edges(): Edge<E>[] {
    this.build_edges_list();
    return this._edgesList!;
  }
}

export function graph<N = any, E = any>(
  nodes: KeyValue<string, N>[] | Record<string, N> | null | undefined,
  edges: KeyValue<string, E>[] | Record<string, E> | null | undefined,
  opts?: Partial<GraphOptions<N, E>>
): Graph<N, E> {
  const nodesList = as_keyvalue(nodes);
  const edgesList = as_keyvalue(edges);
  const options = graph_options(opts);

  return new GraphImpl(nodesList, edgesList, options);
}

function incidence_options<N = any>(opts?: Partial<IncidenceOptions<N>>): IncidenceOptions<N> {
  const gropts = graph_options(opts);
  return Object.assign({
    nodeIncidences: (n: N) => n && ((n as any).edges || (n as any).ins || (n as any).outs) || [],
    incidencesOutward: (n: KeyValue<string, N>) => {
      const v = gropts.nodeValue!(n);
      return !v || !!((v as any).edges || (v as any).outs);
    }
  }, gropts);
}

export function graph_incidence<N = any>(
  nodes: KeyValue<string, N>[] | Record<string, N> | null | undefined,
  opts?: Partial<IncidenceOptions<N>>
): Graph<N> {
  const nodesList = as_keyvalue(nodes);
  const options = incidence_options(opts);
  const edges: KeyValue<string, any>[] = [];

  function edge_value(outward: boolean, nk: string, ik: string): { source: string; target: string } {
    return outward ? {
      source: nk,
      target: ik
    } : {
      source: ik,
      target: nk
    };
  }

  function edge_key(outward: boolean, nk: string, ik: string): string {
    return outward ? nk + '-' + ik : ik + '-' + nk;
  }

  nodesList.forEach(n => {
    const nk = options.nodeKey!(n);
    const outward = options.incidencesOutward!(n);
    as_array(options.nodeIncidences!(options.nodeValue!(n)))
      .forEach(ik => {
        edges.push({
          key: edge_key(outward, nk, ik),
          value: edge_value(outward, nk, ik)
        });
      });
  });

  return graph(nodesList, edges, opts);
}

export function graph_detect<N = any, E = any>(
  spec: GraphSpec<N, E>,
  opts?: Partial<GraphOptions<N, E>>
): Graph<N, E> {
  if (spec.incidences) {
    return graph_incidence(spec.incidences, opts);
  } else if (spec.nodes) {
    return graph(spec.nodes, spec.edges, opts);
  }
  throw new Error('did not recognize graph format');
}