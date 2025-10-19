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
  calc(id: string): unknown;
  input(namespace: string, field: string): unknown;
}

export interface DataflowNode {
  calc: (instance: DataflowInstance) => FlowFunction;
}

export interface DataflowNodeFactory<
  Inputs extends unknown[] = unknown[],
  Output = unknown
> {
  calc: (fnode: Node) => (defn: PatternDefinition) => (flow: DataflowInstance) => (...args: Inputs) => Output;
}

export interface Dataflow {
  instantiate(instance: Record<string, unknown>, inputs: Record<string, unknown>): DataflowInstance;
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
  members?: KeyValue<string, (flowspec: Graph, inode: Node) => MemberSpec>[] | Record<string, (flowspec: Graph, inode: Node) => MemberSpec>;
  class_members?: KeyValue<string, (flowspec: Graph, inode: Node) => ClassMemberSpec>[] | Record<string, (flowspec: Graph, inode: Node) => ClassMemberSpec>;
}

// ---------------------------------------------------------------------------
// Compile-time pattern typing helpers
// ---------------------------------------------------------------------------

type LiteralArray<Item extends string> = readonly Item[];

type ExternalReference = `${string}.${string}`;
type NamespacedKey<Key extends string> = Key | ExternalReference;
type NamespacedList<Key extends string> = NamespacedKey<Key> | readonly NamespacedKey<Key>[];

export type DataflowNodeSpec = {
  node: DataflowNodeFactory<any, any>;
  refs?: NamespacedList<string>;
  ins?: NamespacedList<string>;
  deps?: NamespacedList<string>;
};

export type DataflowNodeAst<NodeKey extends string = string> = {
  key: NodeKey;
  factory: DataflowNodeFactory<any, any>;
  refs: readonly string[];
  ins: readonly string[];
  deps: readonly string[];
};

export type DataflowAst<NodeKey extends string = string> = readonly DataflowNodeAst<NodeKey>[];

export type InterfaceNodeValue<
  InterfaceNodeKeys extends string
> = NodeSpec | InterfaceNodeKeys | ExternalReference | (NodeSpec | InterfaceNodeKeys | ExternalReference)[];

export interface InterfaceEdgeSpec {
  name: string;
  source: NamespacedKey<string>;
  target: NamespacedKey<string>;
  deps?: NamespacedList<string>;
  member?: InterfaceSpec;
  flow?: InterfaceSpec;
}

type AnyKeyValue = KeyValue<string, unknown>;

type MemberNameSet<T> =
  T extends undefined ? never :
  T extends readonly AnyKeyValue[] ? T[number]['key'] :
  T extends Record<infer K, unknown> ? K : never;

type NodeSpecsFromValue<V> =
  V extends NodeSpec ? V :
  V extends readonly (infer R)[] ? NodeSpecsFromValue<R> : never;

type MemberKeysFromValue<V> = NodeSpecsFromValue<V> extends infer S
  ? S extends NodeSpec ? MemberNameSet<S['members']> : never
  : never;

type ClassMemberKeysFromValue<V> = NodeSpecsFromValue<V> extends infer S
  ? S extends NodeSpec ? MemberNameSet<S['class_members']> : never
  : never;

type AnyFunction = (...args: any[]) => unknown;

type RecordFromKeys<Keys extends PropertyKey> = Keys extends never
  ? {}
  : { [K in Keys]: AnyFunction };

export type PatternNodeValueType<Value> =
  RecordFromKeys<MemberKeysFromValue<Value>> &
  RecordFromKeys<ClassMemberKeysFromValue<Value>>;

type NodeKeyUnion<Spec extends PatternSpec> = Extract<keyof Spec['interface']['nodes'], string>;

export type PatternNodeValueUnion<Spec extends PatternSpec> =
  PatternNodeValueType<Spec['interface']['nodes'][NodeKeyUnion<Spec>]> extends infer U ? U : never;

export type PatternNodeValueFor<
  Spec extends PatternSpec,
  Key extends NodeKeyUnion<Spec>
> = PatternNodeValueType<Spec['interface']['nodes'][Key]>;

export type PatternGraph<Spec extends PatternSpec> = Graph<PatternNodeValueUnion<Spec>> & {
  node<Key extends NodeKeyUnion<Spec>>(key: Key): Node<PatternNodeValueFor<Spec, Key>> | undefined;
  nodes(): Node<PatternNodeValueUnion<Spec>>[];
};
type ExtractStringKeys<T> = Extract<keyof T, string>;

export type PatternSpecDescriptor<
  InterfaceNodes extends Record<string, InterfaceNodeValue<ExtractStringKeys<InterfaceNodes>>> = Record<string, InterfaceNodeValue<string>>,
  DataflowNodes extends Record<string, DataflowNodeSpec> = Record<string, DataflowNodeSpec>,
  InterfaceEdges extends Record<string, InterfaceEdgeSpec> = Record<string, InterfaceEdgeSpec>
> = {
  dataflow: {
    incidences: DataflowNodes;
  };
  interface: {
    nodes: InterfaceNodes;
    edges: InterfaceEdges;
  };
};

export type PatternSpec<
  InterfaceNodes extends Record<string, InterfaceNodeValue<ExtractStringKeys<InterfaceNodes>>> = Record<string, InterfaceNodeValue<string>>,
  DataflowNodes extends Record<string, DataflowNodeSpec> = Record<string, DataflowNodeSpec>,
  InterfaceEdges extends Record<string, InterfaceEdgeSpec> = Record<string, InterfaceEdgeSpec>
> = PatternSpecDescriptor<InterfaceNodes, DataflowNodes, InterfaceEdges>;

export interface PatternAstData<
  InterfaceNodes extends Record<string, InterfaceNodeValue<ExtractStringKeys<InterfaceNodes>>>,
  DataflowNodes extends Record<string, DataflowNodeSpec>,
  InterfaceEdges extends Record<string, InterfaceEdgeSpec>
> {
  dataflow: {
    nodes: DataflowAst<ExtractStringKeys<DataflowNodes>>;
  };
  interface: {
    nodes: readonly KeyValue<ExtractStringKeys<InterfaceNodes>, InterfaceNodes[ExtractStringKeys<InterfaceNodes>]>[];
    edges: readonly KeyValue<ExtractStringKeys<InterfaceEdges>, InterfaceEdges[ExtractStringKeys<InterfaceEdges>]>[];
  };
}

export type PatternSpecWithAst<
  InterfaceNodes extends Record<string, InterfaceNodeValue<ExtractStringKeys<InterfaceNodes>>> = Record<string, InterfaceNodeValue<string>>,
  DataflowNodes extends Record<string, DataflowNodeSpec> = Record<string, DataflowNodeSpec>,
  InterfaceEdges extends Record<string, InterfaceEdgeSpec> = Record<string, InterfaceEdgeSpec>
> = PatternSpec<InterfaceNodes, DataflowNodes, InterfaceEdges> & {
  ast: PatternAstData<InterfaceNodes, DataflowNodes, InterfaceEdges>;
};

type ValidateRefs<Refs, Keys extends string> =
  Refs extends undefined
    ? undefined
    : Refs extends NamespacedList<string>
      ? Refs extends NamespacedList<Keys>
        ? Refs
        : never
      : never;

type ValidateEdgeDeps<Deps, Keys extends string> =
  Deps extends undefined ? undefined : Deps;

type ValidateKey<Key, Keys extends string> =
  Key extends NamespacedKey<string>
    ? Key extends NamespacedKey<Keys>
      ? Key
      : never
    : never;

export type AssertPattern<
  InterfaceNodes extends Record<string, InterfaceNodeValue<ExtractStringKeys<InterfaceNodes>>>,
  DataflowNodes extends Record<string, DataflowNodeSpec>,
  InterfaceEdges extends Record<string, InterfaceEdgeSpec>
> = {
  dataflow: {
    incidences: {
      [K in keyof DataflowNodes]: {
        node: DataflowNodes[K]['node'];
        refs?: ValidateRefs<DataflowNodes[K]['refs'], ExtractStringKeys<InterfaceNodes>>;
        ins?: ValidateRefs<DataflowNodes[K]['ins'], ExtractStringKeys<DataflowNodes>>;
      };
    };
  };
  interface: {
    nodes: InterfaceNodes;
    edges: {
      [K in keyof InterfaceEdges]: {
        name: InterfaceEdges[K]['name'];
        source: ValidateKey<InterfaceEdges[K]['source'], ExtractStringKeys<InterfaceNodes>>;
        target: ValidateKey<InterfaceEdges[K]['target'], ExtractStringKeys<InterfaceNodes>>;
        deps?: ValidateEdgeDeps<InterfaceEdges[K]['deps'], ExtractStringKeys<DataflowNodes>>;
        member?: InterfaceEdges[K]['member'];
        flow?: InterfaceEdges[K]['flow'];
      };
    };
  };
} & PatternSpec<InterfaceNodes, DataflowNodes, InterfaceEdges>;

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

export type FlowFunction<Inputs extends unknown[] = unknown[], Output = unknown> = (...args: Inputs) => Output;

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
