import type { PatternSpecLiteral, AccessorImplementations } from './spec.js';

export type DataflowNodeKey<S extends PatternSpecLiteral> = keyof S['dataflow']['nodes'] & string;

type NodeSpec<S extends PatternSpecLiteral, Key extends DataflowNodeKey<S>> = S['dataflow']['nodes'][Key];

type NodeIns<Value> = Value extends { ins: infer Ins }
  ? Ins extends readonly string[]
    ? Ins
    : Ins extends string
      ? [Ins]
      : []
  : [];

type InputValue<S extends PatternSpecLiteral, FlowKey extends string, Key extends DataflowNodeKey<S>, Node extends NodeSpec<S, Key>> =
  Node extends { path: infer P extends string }
    ? PathValue<S, FlowKey, P>
    : PathValue<S, FlowKey, Key>;

type FlowPayload<S extends PatternSpecLiteral, Key extends string> = Key extends keyof S['payloads']
  ? S['payloads'][Key]
  : Record<string, unknown>;

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

type OutputValue<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  FlowKey extends string,
  Seen extends string,
  Keys extends readonly string[]
> = Keys extends readonly [infer First extends string, ...infer _Rest]
  ? DataflowNodeOutput<S, A, Extract<First, DataflowNodeKey<S>>, FlowKey, Seen>
  : unknown;

export type DataflowNodeOutput<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Key extends DataflowNodeKey<S>,
  FlowKey extends string = string,
  Seen extends string = never
> = Key extends Seen
  ? unknown
  : NodeSpec<S, Key> extends { kind: 'input' } ? InputValue<S, FlowKey, Key, NodeSpec<S, Key>>
  : NodeSpec<S, Key> extends { kind: 'output' } ? OutputValue<S, A, FlowKey, Seen | Key, NodeIns<NodeSpec<S, Key>>>
  : unknown;
