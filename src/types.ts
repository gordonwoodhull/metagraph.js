export interface KeyValue<K = string, V = any> {
  key: K;
  value: V;
}

export interface GraphOptions<N = any, E = any> {
  nodeKey?: (kv: KeyValue<string, N>) => string;
  edgeKey?: (kv: KeyValue<string, E>) => string;
  nodeValue?: (kv: KeyValue<string, N>) => N;
  edgeValue?: (kv: KeyValue<string, E>) => E;
  edgeSource?: (kv: KeyValue<string, E>) => string;
  edgeTarget?: (kv: KeyValue<string, E>) => string;
}

export interface Node<T = any> {
  value(): T;
  key(): string;
  graph(): Graph;
  outs(): Edge[];
  ins(): Edge[];
}

export interface Edge<T = any> {
  value(): T;
  key(): string;
  graph(): Graph;
  source(): Node;
  target(): Node;
}

export interface Graph<N = any, E = any> {
  node(key: string): Node<N> | undefined;
  edge(key: string): Edge<E> | undefined;
  nodes(): Node<N>[];
  edges(): Edge<E>[];
}

export interface IncidenceOptions<N = any> extends GraphOptions<N> {
  nodeIncidences?: (node: N) => string[];
  incidencesOutward?: (node: KeyValue<string, N>) => boolean;
}

export interface GraphSpec<N = any, E = any> {
  nodes?: KeyValue<string, N>[] | Record<string, N>;
  edges?: KeyValue<string, E>[] | Record<string, E>;
  incidences?: KeyValue<string, N>[] | Record<string, N>;
}

export interface DataflowInstance {
  _yes_i_am_really_dataflow: boolean;
  calc(id: string): any;
  input(namespace: string, field: string): any;
}

export interface DataflowNode {
  calc: (instance: DataflowInstance) => (...args: any[]) => any;
}

export interface Dataflow {
  instantiate(instance: Record<string, any>, inputs: Record<string, any>): DataflowInstance;
}

export interface PatternSpec {
  dataflow?: GraphSpec;
  interface: GraphSpec;
}

export interface PatternDefinition {
  node: Record<string, {
    members: Record<string, any>;
    class_members: Record<string, any>;
    wrap: (flow: DataflowInstance, val: any) => any;
  }>;
  edge: Record<string, any>;
}

export interface InterfaceSpec {
  funfun?: (flowspec: Graph, iedge: Edge, flowspecs?: Record<string, Graph>) => 
    (defn: PatternDefinition, flow: DataflowInstance, val: any) => (...args: any[]) => any;
  reference?: Node;
  member?: InterfaceSpec;
  name?: string;
  deps?: string[];
}

export interface MemberSpec {
  accessor?: (val: any) => any;
  defn?: (defn: PatternDefinition, flow: DataflowInstance, val: any) => (...args: any[]) => any;
}

export interface ClassMemberSpec {
  defn: (defn: PatternDefinition) => any;
}

export interface NodeSpec {
  members?: MemberSpec[];
  class_members?: ClassMemberSpec[];
}