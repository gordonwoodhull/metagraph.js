import type { PatternSpecLiteral, AccessorFunction, AccessorKeys, InterfaceNodeMap } from './spec.js';
import type { Graph, Node } from './types.js';

type ClassMemberSignature = { readonly kind: 'createable'; readonly flow: string };

type MemberCallSignature<Accessor extends string> = {
  readonly kind: 'call';
  readonly accessor: Accessor;
};

type MemberFetchSignature = { readonly kind: 'fetch' };

type MemberLookupArgSignature<Accessor extends string | undefined> = {
  readonly kind: 'lookupArg';
  readonly accessor?: Accessor;
};

type MemberLookupFValSignature<Accessor extends string> = {
  readonly kind: 'lookupFVal';
  readonly accessor: Accessor;
};

type MemberLookupKValSignature = { readonly kind: 'lookupKVal' };

type MemberSubgraphSignature = { readonly kind: 'subgraph' };

type MemberSignature =
  | MemberCallSignature<string>
  | MemberFetchSignature
  | MemberLookupArgSignature<string | undefined>
  | MemberLookupFValSignature<string>
  | MemberLookupKValSignature
  | MemberSubgraphSignature;

type ClassMemberMap<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> =
  InterfaceNodeMap<S>[NodeKey] extends infer NodeLiteral
    ? NodeLiteral extends { classMembers: Record<string, ClassMemberSignature> }
      ? NodeLiteral['classMembers']
      : {}
    : {};

type MemberMap<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> =
  InterfaceNodeMap<S>[NodeKey] extends infer NodeLiteral
    ? NodeLiteral extends { members: Record<string, MemberSignature> }
      ? NodeLiteral['members']
      : {}
    : {};

type AccessorOf<S extends PatternSpecLiteral, Key extends string> = AccessorFunction<S, Extract<Key, AccessorKeys<S>>>;

type ResolveCallMember<S extends PatternSpecLiteral, Key extends string> = () => ReturnType<AccessorOf<S, Key>>;

type ResolveLookupArgMember<S extends PatternSpecLiteral, Key extends string | undefined> = Key extends string
  ? (map: Record<string, unknown>) => (arg: ReturnType<AccessorOf<S, Key>>) => unknown
  : (map: Record<string, unknown>) => (arg: unknown) => unknown;

type ResolveLookupFValMember<S extends PatternSpecLiteral, Key extends string> = () => (map: Record<string, unknown>) => () => unknown;

type ResolveLookupKValMember = () => (map: Record<string, unknown>) => () => unknown;

type ResolveFetchMember = () => (arg: unknown) => () => unknown;

type ResolveSubgraphMember = () => (...args: unknown[]) => Graph;

type ResolveMember<S extends PatternSpecLiteral, Signature extends MemberSignature> =
  Signature extends MemberCallSignature<infer K>
    ? ResolveCallMember<S, K>
    : Signature extends MemberLookupArgSignature<infer K>
      ? ResolveLookupArgMember<S, K>
      : Signature extends MemberLookupFValSignature<infer K>
        ? ResolveLookupFValMember<S, K>
        : Signature extends MemberLookupKValSignature
          ? ResolveLookupKValMember
          : Signature extends MemberFetchSignature
            ? ResolveFetchMember
            : ResolveSubgraphMember;

export type InferClassMembers<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> = {
  readonly [K in keyof ClassMemberMap<S, NodeKey>]: ClassMemberMap<S, NodeKey>[K] extends ClassMemberSignature
    ? ClassMemberMap<S, NodeKey>[K]['flow'] extends string
      ? (data: Record<string, unknown>) => unknown
      : never
    : never;
};

export type InferMembers<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> = {
  readonly [K in keyof MemberMap<S, NodeKey>]: MemberMap<S, NodeKey>[K] extends MemberSignature
    ? ResolveMember<S, MemberMap<S, NodeKey>[K]>
    : never;
};

export type InferNodeShape<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> =
  InferMembers<S, NodeKey> & InferClassMembers<S, NodeKey>;

export type PatternGraphType<S extends PatternSpecLiteral> = Graph & {
  node<Key extends keyof InterfaceNodeMap<S> & string>(key: Key): Node<InferNodeShape<S, Key>>;
  node(key: string): Node<unknown>;
};
