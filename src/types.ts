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

// Enhanced GraphSpec with compile-time validation
export interface ValidatedGraphSpec<T extends GraphSpec = GraphSpec> extends GraphSpec {
  readonly __validation: ValidGraph<T>;
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

// ===== COMPILE-TIME GRAPH VALIDATION =====

// Extract node keys from a graph spec
type ExtractNodeKeys<T> = T extends { nodes: infer N }
  ? N extends readonly unknown[]
    ? N[number] extends { key: infer K }
      ? K extends string
        ? K
        : never
      : never
    : N extends Record<string, unknown>
      ? keyof N
      : never
  : T extends { incidences: infer I }
    ? I extends readonly unknown[]
      ? I[number] extends { key: infer K }
        ? K extends string
          ? K
          : never
        : never
      : I extends Record<string, unknown>
        ? keyof I
        : never
    : never;

// Extract edge information from a graph spec
type ExtractEdges<T> = T extends { edges: infer E }
  ? E extends readonly unknown[]
    ? E[number]
    : E extends Record<string, unknown>
      ? E[keyof E]
      : never
  : never;

// Check if an edge references valid nodes
type EdgeReferencesValidNodes<E, ValidNodes> = 
  E extends { value: { source: infer S; target: infer T } }
    ? S extends ValidNodes
      ? T extends ValidNodes
        ? true
        : false
      : false
    : false;

// Check all edges reference valid nodes
type AllEdgesValid<Edges, ValidNodes> = 
  Edges extends readonly unknown[]
    ? Edges extends readonly [infer Head, ...infer Tail]
      ? EdgeReferencesValidNodes<Head, ValidNodes> extends true
        ? AllEdgesValid<Tail, ValidNodes>
        : false
      : true
    : true;

// Detect cycles in edges (simplified - detects immediate self-loops)
type HasSelfLoop<E> = E extends { value: { source: infer S; target: infer T } }
  ? S extends T
    ? true
    : false
  : false;

// Check for self-loops in all edges
type HasAnySelfLoops<Edges> = 
  Edges extends readonly unknown[]
    ? Edges extends readonly [infer Head, ...infer Tail]
      ? HasSelfLoop<Head> extends true
        ? true
        : HasAnySelfLoops<Tail>
      : false
    : false;

// Ensure all edge keys are unique
type EdgeKeysUnique<Edges> = 
  Edges extends readonly unknown[]
    ? Edges extends readonly [infer Head, ...infer Tail]
      ? Head extends { key: infer K }
        ? K extends string
          ? Tail extends readonly unknown[]
            ? K extends ExtractEdgeKey<Tail[number]>
              ? false // Duplicate found
              : EdgeKeysUnique<Tail>
            : true
          : false
        : false
      : true
    : true;

type ExtractEdgeKey<E> = E extends { key: infer K } ? K : never;

// Ensure all node keys are unique
type NodeKeysUnique<Nodes> = 
  Nodes extends readonly unknown[]
    ? Nodes extends readonly [infer Head, ...infer Tail]
      ? Head extends { key: infer K }
        ? K extends string
          ? Tail extends readonly unknown[]
            ? K extends ExtractNodeKey<Tail[number]>
              ? false // Duplicate found
              : NodeKeysUnique<Tail>
            : true
          : false
        : false
      : true
    : true;

type ExtractNodeKey<N> = N extends { key: infer K } ? K : never;

// Main validation type
export type ValidGraph<T> = T extends GraphSpec
  ? ExtractNodeKeys<T> extends never
    ? { error: 'Graph must have at least one node' }
    : NodeKeysUnique<T extends { nodes: infer N } ? N : []> extends false
      ? { error: 'Duplicate node keys found' }
      : EdgeKeysUnique<T extends { edges: infer E } ? E : []> extends false
        ? { error: 'Duplicate edge keys found' }
        : AllEdgesValid<ExtractEdges<T>, ExtractNodeKeys<T>> extends false
          ? { error: 'Some edges reference non-existent nodes' }
          : HasAnySelfLoops<ExtractEdges<T>> extends true
            ? { error: 'Self-loops detected (consider using allowSelfLoops option)' }
            : T // Valid graph
  : { error: 'Invalid graph specification' };

// Utility type to ensure compile-time validation
export type ValidatedGraph<T> = ValidGraph<T> extends { error: infer E }
  ? never // Compilation error
  : T;

// Helper type for better error messages
export type GraphValidationError<T> = ValidGraph<T> extends { error: infer E }
  ? E
  : 'Graph is valid';

// Advanced validation with options
export interface GraphValidationOptions {
  allowSelfLoops?: boolean;
  allowDisconnectedNodes?: boolean;
  requireUniqueKeys?: boolean;
}

// Enhanced validation with options
export type ValidGraphWithOptions<T, Options extends GraphValidationOptions = {}> = 
  T extends GraphSpec
    ? ExtractNodeKeys<T> extends never
      ? { error: 'Graph must have at least one node' }
      : Options['requireUniqueKeys'] extends false
        ? ValidateWithoutUniqueKeys<T, Options>
        : NodeKeysUnique<T extends { nodes: infer N } ? N : []> extends false
          ? { error: 'Duplicate node keys found' }
          : ValidateWithUniqueKeys<T, Options>
    : { error: 'Invalid graph specification' };

type ValidateWithoutUniqueKeys<T, Options extends GraphValidationOptions> = 
  AllEdgesValid<ExtractEdges<T>, ExtractNodeKeys<T>> extends false
    ? { error: 'Some edges reference non-existent nodes' }
    : Options['allowSelfLoops'] extends true
      ? T
      : HasAnySelfLoops<ExtractEdges<T>> extends true
        ? { error: 'Self-loops detected' }
        : T;

type ValidateWithUniqueKeys<T, Options extends GraphValidationOptions> = 
  EdgeKeysUnique<T extends { edges: infer E } ? E : []> extends false
    ? { error: 'Duplicate edge keys found' }
    : AllEdgesValid<ExtractEdges<T>, ExtractNodeKeys<T>> extends false
      ? { error: 'Some edges reference non-existent nodes' }
      : Options['allowSelfLoops'] extends true
        ? T
        : HasAnySelfLoops<ExtractEdges<T>> extends true
          ? { error: 'Self-loops detected' }
          : T;

// Branded types for validated graphs
export type BrandedGraph<T> = T & { __validated: true };

// Create a validated graph (compile-time checked)
export type CreateValidatedGraph<T> = ValidGraph<T> extends { error: any }
  ? never
  : BrandedGraph<T>;