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
  // Optional path navigation methods (implemented by TypedGraph)
  path?<P extends string>(path: P): unknown;
  navigate?<P extends string>(path: P): unknown;
  hasPath?<P extends string>(path: P): boolean;
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
  calc(id: string): unknown;
  input(namespace: string, field: string): unknown;
}

export interface DataflowNode {
  calc: (instance: DataflowInstance) => FlowFunction;
}

export interface Dataflow {
  instantiate(instance: Record<string, unknown>, inputs: Record<string, unknown>): DataflowInstance;
}

export interface PatternSpec {
  dataflow?: GraphSpec;
  interface: GraphSpec;
}

export interface PatternDefinition {
  node: Record<string, PatternNodeDefinition>;
  edge: Record<string, PatternEdgeDefinition>;
}

export interface InterfaceSpec {
  funfun?: (flowspec: Graph, iedge: Edge, flowspecs?: Record<string, Graph>) => 
    (defn: PatternDefinition, flow: DataflowInstance, val: unknown) => FlowFunction;
  reference?: Node;
  member?: InterfaceSpec;
  name?: string;
  deps?: string[];
}

export interface MemberSpec {
  accessor?: (val: unknown) => unknown;
  defn?: (defn: PatternDefinition, flow: DataflowInstance, val: unknown) => FlowFunction;
}

export interface ClassMemberSpec {
  defn: (defn: PatternDefinition) => unknown;
}

export interface NodeSpec {
  members?: KeyValue<string, (flowspec: Graph, inode: Node) => MemberSpec>[];
  class_members?: KeyValue<string, (flowspec: Graph, inode: Node) => ClassMemberSpec>[];
}

// Additional type definitions for better type safety
export interface EdgeSourceTarget {
  source: string;
  target: string;
}

export interface NodeWithIncidences {
  edges?: string[];
  ins?: string[];
  outs?: string[];
}

export interface DataflowNodeSpec {
  node: DataflowNodeValue<unknown>;
  refs?: string;
  ins?: string | string[];
}

export interface DataflowNodeValue<T> {
  calc: (instance: DataflowInstance) => (...args: unknown[]) => T;
}

export interface PatternNodeDefinition {
  members: Record<string, MemberSpec>;
  class_members: Record<string, ClassMemberSpec>;
  wrap: (flow: DataflowInstance, val: unknown) => unknown;
}

export interface PatternEdgeDefinition {
  source: string;
  target: string;
  name?: string;
  deps?: string | string[];
  member?: InterfaceSpec;
  funfun?: InterfaceSpec['funfun'];
}

export interface FlowFunction<TInput = unknown, TOutput = unknown> {
  (...args: TInput[]): TOutput;
}

// Type guards for runtime validation
export function isKeyValue(obj: unknown): obj is KeyValue {
  return typeof obj === 'object' && obj !== null && 
         'key' in obj && 'value' in obj;
}

export function isGraphSpec(obj: unknown): obj is GraphSpec {
  return typeof obj === 'object' && obj !== null &&
         ('nodes' in obj || 'edges' in obj || 'incidences' in obj);
}

export function hasSourceTarget(obj: unknown): obj is EdgeSourceTarget {
  return typeof obj === 'object' && obj !== null &&
         'source' in obj && 'target' in obj &&
         typeof (obj as EdgeSourceTarget).source === 'string' &&
         typeof (obj as EdgeSourceTarget).target === 'string';
}

export function isDataflowInstance(obj: unknown): obj is DataflowInstance {
  return typeof obj === 'object' && obj !== null &&
         '_yes_i_am_really_dataflow' in obj &&
         (obj as DataflowInstance)._yes_i_am_really_dataflow === true;
}

export function isNodeWithIncidences(obj: unknown): obj is NodeWithIncidences {
  return typeof obj === 'object' && obj !== null &&
         ('edges' in obj || 'ins' in obj || 'outs' in obj);
}

// Template literal types for graph paths
export type Split<S extends string, D extends string> = 
  S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

export type Join<T extends readonly string[], D extends string> = 
  T extends readonly [infer F, ...infer R]
    ? F extends string
      ? R extends readonly string[]
        ? R['length'] extends 0
          ? F
          : `${F}${D}${Join<R, D>}`
        : never
      : never
    : '';

export type GraphPath<T extends string> = 
  T extends `${infer Start}.${infer Rest}` 
    ? Start | GraphPath<Rest> 
    : T;

// Type-safe path resolution for known graph structures
export type PathValue<G, P extends string> = 
  P extends `${infer NodeKey}.${infer Rest}`
    ? NodeKey extends keyof G
      ? G[NodeKey] extends { value: infer V }
        ? Rest extends keyof V
          ? V[Rest]
          : never
        : never
      : never
    : P extends keyof G
      ? G[P]
      : never;

// Enhanced graph interface with path navigation
export interface TypedGraph<N = any, E = any> extends Graph<N, E> {
  path<P extends string>(path: P): unknown;
  navigate<P extends string>(path: P): unknown;
  hasPath<P extends string>(path: P): boolean;
}