import type {
  PatternSpecLiteral,
  AccessorImplementations,
  InterfaceNodeMap
} from './spec.js';
import type { InferNodeShape } from './pattern_types.js';

export type DataflowNodeKey<S extends PatternSpecLiteral> = keyof S['dataflow']['nodes'] & string;

type NodeSpec<S extends PatternSpecLiteral, Key extends DataflowNodeKey<S>> = S['dataflow']['nodes'][Key];

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
  Ref extends string
> = ResolveInterfaceNodeKey<S, Ref> extends infer Key extends InterfaceNodeKey<S>
  ? InferNodeShape<S, A, Key>
  : unknown;

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

type DefaultFlowKey<S extends PatternSpecLiteral> = PayloadKeys<S> extends never ? string : PayloadKeys<S>;

type PathValue<S extends PatternSpecLiteral, FlowKey extends string, Path extends string> =
  Path extends `${infer Namespace}.${infer Rest}`
    ? Namespace extends 'data'
      ? Rest extends keyof FlowPayload<S, FlowKey>
        ? FlowPayload<S, FlowKey>[Rest]
        : unknown
      : unknown
    : Path extends keyof FlowPayload<S, FlowKey>
      ? FlowPayload<S, FlowKey>[Path]
      : unknown;

type InputValue<
  S extends PatternSpecLiteral,
  FlowKey extends string,
  Key extends DataflowNodeKey<S>,
  Node extends NodeSpec<S, Key>
> = Node extends { path: infer P extends string }
  ? PathValue<S, FlowKey, P>
  : PathValue<S, FlowKey, Key>;

type OutputValue<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  FlowKey extends string,
  Seen extends string,
  Keys extends readonly string[]
> = Keys extends readonly [infer First extends string, ...infer _Rest]
  ? DataflowNodeOutput<S, A, Extract<First, DataflowNodeKey<S>>, FlowKey, Seen>
  : unknown;

type MapNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? Record<string, InterfaceNodeShapeFromRef<S, A, Ref>>
  : Record<string, unknown>;

type MapOfListsNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? Record<string, InterfaceNodeShapeFromRef<S, A, Ref>[]>
  : Record<string, unknown[]>;

type ListNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? InterfaceNodeShapeFromRef<S, A, Ref>[]
  : unknown[];

type SingletonNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? InterfaceNodeShapeFromRef<S, A, Ref>
  : unknown;

type SubsetNode<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  Node extends NodeSpec<S, Key> = NodeSpec<S, Key>
> = NodeRefs<Node> extends infer Ref extends string
  ? InterfaceNodeShapeFromRef<S, A, Ref>[]
  : unknown[];

export type DataflowNodeOutput<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  FlowKey extends string = DefaultFlowKey<S>,
  Seen extends string = never
> = Key extends Seen
  ? unknown
  : NodeSpec<S, Key> extends { kind: 'input' }
    ? InputValue<S, FlowKey, Key, NodeSpec<S, Key>>
    : NodeSpec<S, Key> extends { kind: 'output' }
      ? OutputValue<S, A, FlowKey, Seen | Key, NodeIns<NodeSpec<S, Key>>>
      : NodeSpec<S, Key> extends { kind: 'map' }
        ? MapNode<S, A, Key>
        : NodeSpec<S, Key> extends { kind: 'map_of_lists' }
          ? MapOfListsNode<S, A, Key>
          : NodeSpec<S, Key> extends { kind: 'list' }
            ? ListNode<S, A, Key>
            : NodeSpec<S, Key> extends { kind: 'subset' }
              ? SubsetNode<S, A, Key>
              : NodeSpec<S, Key> extends { kind: 'singleton' }
                ? SingletonNode<S, A, Key>
                : unknown;
