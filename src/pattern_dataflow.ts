import type {
  PatternSpecLiteral,
  AccessorImplementations,
  InterfaceNodeMap
} from './spec.js';
import type { InferNodeShape } from './pattern_types.js';

export type DataflowNodeKey<S extends PatternSpecLiteral> = keyof S['dataflow']['nodes'] & string;

type NodeSpec<S extends PatternSpecLiteral, Key extends DataflowNodeKey<S>> = S['dataflow']['nodes'][Key];

type NodeIns<Value> = Value extends { ins: infer Ins }
  ? Ins extends readonly string[]
    ? Ins
    : Ins extends string
      ? [Ins]
      : []
  : [];

type PayloadKeys<S extends PatternSpecLiteral> = Extract<keyof S['payloads'], string>;

type PayloadUnion<S extends PatternSpecLiteral> =
  keyof S['payloads'] extends never ? Record<string, unknown> : S['payloads'][keyof S['payloads']];

type FlowPayload<S extends PatternSpecLiteral, Key extends string> = Key extends keyof S['payloads']
  ? S['payloads'][Key]
  : PayloadUnion<S>;

export type DefaultFlowKey<S extends PatternSpecLiteral> = PayloadKeys<S> extends never ? string : PayloadKeys<S>;

type InterfaceNodeKey<S extends PatternSpecLiteral> = keyof InterfaceNodeMap<S> & string;

type NodeRefs<Node> = Node extends { refs: infer Ref }
  ? Ref extends readonly string[]
    ? Ref[number]
    : Ref extends string
      ? Ref
      : never
  : never;

type ResolveInterfaceNodeKey<
  S extends PatternSpecLiteral,
  Ref extends string
> = Ref extends InterfaceNodeKey<S> ? Ref : never;

type InterfaceNodeShapeFromRef<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Ref extends string,
  Namespaces extends ExternalNamespaceMap
> = ResolveInterfaceNodeKey<S, Ref> extends infer Key extends InterfaceNodeKey<S>
  ? InferNodeShape<S, A, Key, Namespaces>
  : unknown;

export type NamespaceDescriptor<
  S extends PatternSpecLiteral = PatternSpecLiteral,
  A extends AccessorImplementations<S> = AccessorImplementations<S>,
  Outputs extends Record<string, unknown> = Record<string, unknown>
> = {
  readonly spec: S;
  readonly accessors: A;
  readonly outputs: Outputs;
  readonly payloads: S['payloads'];
};

export type ExternalNamespaceMap = Record<string, NamespaceDescriptor>;

type ExternalPathValue<
  Namespaces extends ExternalNamespaceMap,
  Namespace extends string,
  Field extends string
> = Namespace extends keyof Namespaces
  ? Field extends keyof Namespaces[Namespace]['outputs']
    ? Namespaces[Namespace]['outputs'][Field]
    : unknown
  : unknown;

type PathValue<
  S extends PatternSpecLiteral,
  FlowKey extends string,
  Path extends string,
  Namespaces extends ExternalNamespaceMap
> =
  Path extends `${infer Namespace}.${infer Rest}`
    ? Namespace extends 'data'
      ? Rest extends keyof FlowPayload<S, FlowKey>
        ? FlowPayload<S, FlowKey>[Rest]
        : unknown
      : ExternalPathValue<Namespaces, Namespace, Rest>
    : Path extends keyof FlowPayload<S, FlowKey>
      ? FlowPayload<S, FlowKey>[Path]
      : unknown;

type InputValue<
  S extends PatternSpecLiteral,
  FlowKey extends string,
  Key extends DataflowNodeKey<S>,
  Node extends NodeSpec<S, Key>,
  Namespaces extends ExternalNamespaceMap
> = Node extends { path: infer P extends string }
  ? PathValue<S, FlowKey, P, Namespaces>
  : PathValue<S, FlowKey, Key, Namespaces>;

type OutputValue<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  FlowKey extends string,
  Seen extends string,
  Keys extends readonly string[],
  Namespaces extends ExternalNamespaceMap
> = Keys extends readonly [infer First extends string, ...infer _Rest]
  ? DataflowNodeOutput<S, A, Extract<First, DataflowNodeKey<S>>, FlowKey, Seen, Namespaces>
  : unknown;

type MapNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Namespaces extends ExternalNamespaceMap,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? Record<string, InterfaceNodeShapeFromRef<S, A, Ref, Namespaces>>
  : Record<string, unknown>;

type MapOfListsNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Namespaces extends ExternalNamespaceMap,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? Record<string, InterfaceNodeShapeFromRef<S, A, Ref, Namespaces>[]>
  : Record<string, unknown[]>;

type ListNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Namespaces extends ExternalNamespaceMap,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? InterfaceNodeShapeFromRef<S, A, Ref, Namespaces>[]
  : unknown[];

type SingletonNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Namespaces extends ExternalNamespaceMap,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? InterfaceNodeShapeFromRef<S, A, Ref, Namespaces>
  : unknown;

type SubsetNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Namespaces extends ExternalNamespaceMap,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? InterfaceNodeShapeFromRef<S, A, Ref, Namespaces>[]
  : unknown[];

export type DataflowNodeOutput<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  FlowKey extends string = DefaultFlowKey<S>,
  Seen extends string = never,
  Namespaces extends ExternalNamespaceMap = {}
> = Key extends Seen
  ? unknown
  : NodeSpec<S, Key> extends { kind: 'input' }
    ? InputValue<S, FlowKey, Key, NodeSpec<S, Key>, Namespaces>
    : NodeSpec<S, Key> extends { kind: 'output' }
      ? OutputValue<S, A, FlowKey, Seen | Key, NodeIns<NodeSpec<S, Key>>, Namespaces>
      : NodeSpec<S, Key> extends { kind: 'map' }
        ? MapNode<S, A, Key, Namespaces>
        : NodeSpec<S, Key> extends { kind: 'map_of_lists' }
          ? MapOfListsNode<S, A, Key, Namespaces>
          : NodeSpec<S, Key> extends { kind: 'list' }
            ? ListNode<S, A, Key, Namespaces>
            : NodeSpec<S, Key> extends { kind: 'subset' }
              ? SubsetNode<S, A, Key, Namespaces>
              : NodeSpec<S, Key> extends { kind: 'singleton' }
                ? SingletonNode<S, A, Key, Namespaces>
                : unknown;

export type DataflowOutputs<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Namespaces extends ExternalNamespaceMap = {}
> = {
  readonly [K in DataflowNodeKey<S>]: DataflowNodeOutput<S, A, K, DefaultFlowKey<S>, never, Namespaces>;
};
