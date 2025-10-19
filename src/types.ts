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
  original?: {
    key: string;
    refs?: readonly string[];
    ins?: readonly string[];
    deps?: readonly string[];
  };
};

export type DataflowNodeAst<NodeKey extends string = string> = {
  key: NodeKey;
  factory: DataflowNodeFactory<any, any>;
  refs: readonly string[];
  ins: readonly string[];
  deps: readonly string[];
  original?: {
    key: NodeKey;
    refs: readonly string[];
    ins: readonly string[];
    deps: readonly string[];
  };
};

export type DataflowAst<NodeKey extends string = string> = readonly DataflowNodeAst<NodeKey>[];

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

export type InterfaceNodeValue<
  InterfaceNodeKeys extends string
> = NodeSpec | InterfaceNodeKeys | ExternalReference | (NodeSpec | InterfaceNodeKeys | ExternalReference)[];

export interface InterfaceEdgeSpec {
  name: string;
  source: NamespacedKey<string>;
  target: NamespacedKey<string>;
  deps?: NamespacedList<string>;
  depsOriginal?: string | readonly string[];
  member?: InterfaceSpec;
  flow?: InterfaceSpec;
}

type ExtractStringKeys<T> = Extract<keyof T, string>;

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

// ---------------------------------------------------------------------------
// Composition typing helpers (Stage 2)
// ---------------------------------------------------------------------------

export type CompositionEdgeSpec<PatternKeys extends string> = {
  source: PatternKeys;
  target: PatternKeys;
  input?: string;
};

export type CompositionSpec<
  Patterns extends Record<string, PatternSpecWithAst>,
  Edges extends Record<string, CompositionEdgeSpec<Extract<keyof Patterns, string>>>
> = {
  nodes: Patterns;
  edges: Edges;
};

type CompositionPatternKeys<Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>> =
  Extract<keyof Spec['nodes'], string>;

type AliasMapFor<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = {
  [Target in CompositionPatternKeys<Spec>]: {
    [EdgeKey in keyof Spec['edges'] & string as Spec['edges'][EdgeKey] extends { target: Target; input: infer Input extends string }
      ? Input
      : never]: Spec['edges'][EdgeKey] extends { target: Target; source: infer Source extends string } ? Source : never
  };
};

type PatternAliasMap<
  Map extends Record<string, Record<string, string>>,
  Key extends string
> = Key extends keyof Map ? Map[Key] : Record<string, never>;

export type NamespaceName<
  PatternKey extends string,
  Name extends string,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> = Name extends `${infer Prefix}.${infer Rest}`
  ? Prefix extends AllPatternKeys
    ? `${Prefix}.${Rest}`
    : Prefix extends keyof PatternAliasMap<AliasMap, PatternKey>
      ? `${PatternAliasMap<AliasMap, PatternKey>[Prefix]}.${Rest}`
      : `${PatternKey}.${Name}`
  : `${PatternKey}.${Name}`;

type NamespaceList<
  PatternKey extends string,
  List extends readonly string[],
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> =
  List extends readonly []
    ? readonly []
    : List extends readonly [infer Head extends string, ...infer Tail extends string[]]
      ? readonly [NamespaceName<PatternKey, Head, AliasMap, AllPatternKeys>, ...NamespaceList<PatternKey, Tail, AliasMap, AllPatternKeys>]
      : readonly string[];

type NamespaceInterfaceNodeValue<
  PatternKey extends string,
  Value,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> =
  Value extends string
    ? NamespaceName<PatternKey, Value, AliasMap, AllPatternKeys>
    : Value extends readonly unknown[]
      ? { [Index in keyof Value]: NamespaceInterfaceNodeValue<PatternKey, Value[Index], AliasMap, AllPatternKeys> }
      : Value;

type NamespaceMaybeList<
  PatternKey extends string,
  Value,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> =
  Value extends readonly string[]
    ? NamespaceList<PatternKey, Value, AliasMap, AllPatternKeys>
    : Value extends string
      ? NamespaceName<PatternKey, Value, AliasMap, AllPatternKeys>
      : Value;

type NamespaceInterfaceEdgeValue<
  PatternKey extends string,
  Value extends InterfaceEdgeSpec,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> = {
  name: Value['name'];
  source: NamespaceName<PatternKey, Value['source'], AliasMap, AllPatternKeys>;
  target: NamespaceName<PatternKey, Value['target'], AliasMap, AllPatternKeys>;
  deps: NamespaceMaybeList<PatternKey, Value['deps'], AliasMap, AllPatternKeys>;
  depsOriginal: Value['depsOriginal'] extends undefined ? Value['deps'] : Value['depsOriginal'];
  member: Value['member'];
  flow: Value['flow'];
};

type NamespacedDataflowNode<
  PatternKey extends string,
  Node extends DataflowNodeAst,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> = {
  key: NamespaceName<PatternKey, Node['key'], AliasMap, AllPatternKeys>;
  factory: Node['factory'];
  refs: NamespaceList<PatternKey, Node['refs'], AliasMap, AllPatternKeys>;
  ins: NamespaceList<PatternKey, Node['ins'], AliasMap, AllPatternKeys>;
  deps: NamespaceList<PatternKey, Node['deps'], AliasMap, AllPatternKeys>;
};

type NamespacedInterfaceNodeEntry<
  PatternKey extends string,
  Entry extends KeyValue<string, InterfaceNodeValue<string>>,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> = KeyValue<
  NamespaceName<PatternKey, Entry['key'], AliasMap, AllPatternKeys>,
  NamespaceInterfaceNodeValue<PatternKey, Entry['value'], AliasMap, AllPatternKeys>
>;

type NamespacedInterfaceEdgeEntry<
  PatternKey extends string,
  Entry extends KeyValue<string, InterfaceEdgeSpec>,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> = KeyValue<
  NamespaceName<PatternKey, Entry['key'], AliasMap, AllPatternKeys>,
  NamespaceInterfaceEdgeValue<PatternKey, Entry['value'], AliasMap, AllPatternKeys>
>;

type NamespacedDataflowNodeUnion<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> =
  {
    [PatternKey in CompositionPatternKeys<Spec>]:
      Spec['nodes'][PatternKey]['ast']['dataflow']['nodes'][number] extends infer Node
        ? Node extends DataflowNodeAst
          ? NamespacedDataflowNode<PatternKey, Node, AliasMap, AllPatternKeys>
          : never
        : never
  }[CompositionPatternKeys<Spec>];

type NamespacedInterfaceNodeUnion<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> =
  {
    [PatternKey in CompositionPatternKeys<Spec>]:
      Spec['nodes'][PatternKey]['ast']['interface']['nodes'][number] extends infer Entry
        ? Entry extends KeyValue<string, InterfaceNodeValue<string>>
          ? NamespacedInterfaceNodeEntry<PatternKey, Entry, AliasMap, AllPatternKeys>
          : never
        : never
  }[CompositionPatternKeys<Spec>];

type NamespacedInterfaceEdgeUnion<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>,
  AliasMap extends Record<string, Record<string, string>>,
  AllPatternKeys extends string
> =
  {
    [PatternKey in CompositionPatternKeys<Spec>]:
      Spec['nodes'][PatternKey]['ast']['interface']['edges'][number] extends infer Entry
        ? Entry extends KeyValue<string, InterfaceEdgeSpec>
          ? NamespacedInterfaceEdgeEntry<PatternKey, Entry, AliasMap, AllPatternKeys>
          : never
        : never
  }[CompositionPatternKeys<Spec>];

export type ComposeDataflowAst<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = readonly NamespacedDataflowNodeUnion<Spec, AliasMapFor<Spec>, CompositionPatternKeys<Spec>>[];

export type ComposeInterfaceNodesAst<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = readonly NamespacedInterfaceNodeUnion<Spec, AliasMapFor<Spec>, CompositionPatternKeys<Spec>>[];

export type ComposeInterfaceEdgesAst<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = readonly NamespacedInterfaceEdgeUnion<Spec, AliasMapFor<Spec>, CompositionPatternKeys<Spec>>[];

type ComposeDataflowKeyUnion<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = NamespacedDataflowNodeUnion<Spec, AliasMapFor<Spec>, CompositionPatternKeys<Spec>>['key'];

type ComposeInterfaceNodeKeyUnion<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = NamespacedInterfaceNodeUnion<Spec, AliasMapFor<Spec>, CompositionPatternKeys<Spec>>['key'];

type ComposeInterfaceEdgeKeyUnion<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = NamespacedInterfaceEdgeUnion<Spec, AliasMapFor<Spec>, CompositionPatternKeys<Spec>>['key'];

export type ComposeDataflowIncidences<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = Record<ComposeDataflowKeyUnion<Spec>, DataflowNodeSpec>;

export type ComposeInterfaceNodesRecord<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = Record<ComposeInterfaceNodeKeyUnion<Spec>, InterfaceNodeValue<ComposeInterfaceNodeKeyUnion<Spec>>>;

export type ComposeInterfaceEdgesRecord<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = Record<ComposeInterfaceEdgeKeyUnion<Spec>, InterfaceEdgeSpec>;

export type ComposePatternAst<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = {
  dataflow: {
    nodes: ComposeDataflowAst<Spec>;
  };
  interface: {
    nodes: ComposeInterfaceNodesAst<Spec>;
    edges: ComposeInterfaceEdgesAst<Spec>;
  };
};

export type ComposePatternSpec<
  Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, CompositionEdgeSpec<string>>>
> = PatternSpec<
  ComposeInterfaceNodesRecord<Spec>,
  ComposeDataflowIncidences<Spec>,
  ComposeInterfaceEdgesRecord<Spec>
> & {
  ast: ComposePatternAst<Spec>;
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
