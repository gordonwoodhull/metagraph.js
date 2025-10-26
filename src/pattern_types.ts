import type { PatternSpecLiteral, AccessorImplementations, AccessorKeys, AccessorFunction, InterfaceNodeMap } from './spec.js';
import type { Graph, Node } from './types.js';

// Helper to extract accessor implementation type, falling back to spec default.
type AccessorImplementation<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, K extends AccessorKeys<S>> =
  K extends keyof A ? A[K] : AccessorFunction<S, K>;

// Member signatures pulled from interface literals
interface CreateableSignature {
  readonly kind: 'createable';
  readonly flow: string;
}

interface CallSignature<Accessor extends string> {
  readonly kind: 'call';
  readonly accessor: Accessor;
}

interface FetchSignature {
  readonly kind: 'fetch';
}

interface LookupArgSignature<Accessor extends string | undefined> {
  readonly kind: 'lookupArg';
  readonly accessor?: Accessor;
}

interface LookupFValSignature<Accessor extends string> {
  readonly kind: 'lookupFVal';
  readonly accessor: Accessor;
}

interface LookupKValSignature {
  readonly kind: 'lookupKVal';
}

interface SubgraphSignature {
  readonly kind: 'subgraph';
}

export type MemberSignature =
  | CallSignature<string>
  | FetchSignature
  | LookupArgSignature<string | undefined>
  | LookupFValSignature<string>
  | LookupKValSignature
  | SubgraphSignature;

// Extract class/member maps from the spec literal
type PayloadMap<S extends PatternSpecLiteral> = S['payloads'];

type FlowPayload<S extends PatternSpecLiteral, FlowKey extends string> = FlowKey extends keyof PayloadMap<S>
  ? PayloadMap<S>[FlowKey]
  : Record<string, unknown>;

type ClassMemberMap<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> =
  InterfaceNodeMap<S>[NodeKey] extends infer NodeLiteral
    ? NodeLiteral extends { classMembers: Record<string, CreateableSignature> }
      ? NodeLiteral['classMembers']
      : {}
    : {};

 type MemberMap<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> =
  InterfaceNodeMap<S>[NodeKey] extends infer NodeLiteral
    ? NodeLiteral extends { members: Record<string, MemberSignature> }
      ? NodeLiteral['members']
      : {}
    : {};

// Member resolution helpers (placeholders for now; will be refined as calculators are typed)
type ResolveCallMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, K extends string> =
  () => ReturnType<AccessorImplementation<S, A, Extract<K, AccessorKeys<S>>>>;

type ResolveLookupArgMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, K extends string | undefined> =
  K extends string
    ? (map: Record<string, unknown>) => (arg: ReturnType<AccessorImplementation<S, A, Extract<K, AccessorKeys<S>>>>) => unknown
    : (map: Record<string, unknown>) => (arg: unknown) => unknown;

type ResolveLookupFValMember = () => (map: Record<string, unknown>) => () => unknown;

type ResolveLookupKValMember = () => (map: Record<string, unknown>) => () => unknown;

type ResolveFetchMember = () => (arg: unknown) => () => unknown;

type ResolveSubgraphMember = () => (...args: unknown[]) => Graph;

type ResolveMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Signature extends MemberSignature> =
  Signature extends CallSignature<infer K>
    ? ResolveCallMember<S, A, K>
    : Signature extends LookupArgSignature<infer K>
      ? ResolveLookupArgMember<S, A, K>
      : Signature extends LookupFValSignature<infer _K>
        ? ResolveLookupFValMember
        : Signature extends LookupKValSignature
          ? ResolveLookupKValMember
          : Signature extends FetchSignature
            ? ResolveFetchMember
            : ResolveSubgraphMember;

export type InferClassMembers<
  S extends PatternSpecLiteral,
  _A extends AccessorImplementations<S>,
  NodeKey extends keyof InterfaceNodeMap<S> & string
> = {
  readonly [K in keyof ClassMemberMap<S, NodeKey>]: ClassMemberMap<S, NodeKey>[K] extends CreateableSignature
    ? (data: FlowPayload<S, ClassMemberMap<S, NodeKey>[K]['flow']>) => unknown
    : never;
};

export type InferMembers<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, NodeKey extends keyof InterfaceNodeMap<S> & string> = {
  readonly [K in keyof MemberMap<S, NodeKey>]: MemberMap<S, NodeKey>[K] extends MemberSignature
    ? ResolveMember<S, A, MemberMap<S, NodeKey>[K]>
    : never;
};

export type InferNodeShape<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, NodeKey extends keyof InterfaceNodeMap<S> & string> =
  InferMembers<S, A, NodeKey> & InferClassMembers<S, A, NodeKey>;

export type PatternGraphType<S extends PatternSpecLiteral, A extends AccessorImplementations<S>> = Graph & {
  node<Key extends keyof InterfaceNodeMap<S> & string>(key: Key): Node<InferNodeShape<S, A, Key>>;
  node(key: string): Node<unknown>;
};
