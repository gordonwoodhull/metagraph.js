import type { PatternSpecLiteral, AccessorImplementations, AccessorKeys, AccessorFunction, InterfaceNodeMap } from './spec.js';
import type { DataflowNodeKey, DataflowNodeOutput } from './pattern_dataflow.js';
import type { Member } from './interface.js';
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

type FetchMember = Extract<Member, { kind: 'fetch' }>;
type LookupArgMember = Extract<Member, { kind: 'lookupArg' }>;
type LookupFValMember = Extract<Member, { kind: 'lookupFVal' }>;
type LookupKValMember = Extract<Member, { kind: 'lookupKVal' }>;
type SubgraphMember = Extract<Member, { kind: 'subgraph' }>;

export type MemberSignature = CallSignature<string> | Member;

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

type NormalizeDeps<D> = D extends readonly string[] ? D : D extends string ? readonly [D] : readonly [];

type ToMemberSignature<M> =
  M extends { kind: 'call'; accessor: infer Accessor extends string }
    ? CallSignature<Accessor>
    : M extends Member
      ? M
      : never;

type NodeMemberDefs<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> =
  InterfaceNodeMap<S>[NodeKey] extends { members: infer Members }
    ? Members extends Record<string, infer MemberLiteral>
      ? { [K in keyof Members & string]: ToMemberSignature<MemberLiteral> extends infer Sig
          ? Sig extends MemberSignature
            ? { member: Sig; deps: readonly [] }
            : never
          : never }
      : {}
    : {};

type EdgeEntry<S extends PatternSpecLiteral, K extends keyof S['interface']['edges'] & string> =
  S['interface']['edges'][K] extends { source: infer Source extends string; name: infer Name extends string; member: infer MemberLiteral; deps?: infer Deps }
    ? ToMemberSignature<MemberLiteral> extends infer MemberSpec
      ? MemberSpec extends MemberSignature
        ? { source: Source; name: Name; member: MemberSpec; deps: NormalizeDeps<Deps> }
        : never
      : never
    : never;

type EdgeMemberDefs<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> = {
  [K in keyof S['interface']['edges'] & string as EdgeEntry<S, K> extends { source: NodeKey; name: infer Name extends string } ? Name : never]:
    EdgeEntry<S, K> extends { member: infer MemberSpec; deps: infer Deps extends readonly string[] }
      ? { member: MemberSpec; deps: Deps }
      : never;
};

type NodeMemberNames<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> = keyof NodeMemberDefs<S, NodeKey> & string;
type EdgeMemberNames<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> = keyof EdgeMemberDefs<S, NodeKey> & string;
type AllMemberNames<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> = NodeMemberNames<S, NodeKey> | EdgeMemberNames<S, NodeKey>;

type MemberDefinition<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string, Name extends AllMemberNames<S, NodeKey>> =
  Name extends keyof NodeMemberDefs<S, NodeKey>
    ? NodeMemberDefs<S, NodeKey>[Name]
    : Name extends keyof EdgeMemberDefs<S, NodeKey>
      ? EdgeMemberDefs<S, NodeKey>[Name]
      : never;

type FilteredMemberDefs<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> = {
  [K in AllMemberNames<S, NodeKey> as MemberDefinition<S, NodeKey, K> extends { member: infer MemberSpec; deps: infer Deps }
    ? MemberSpec extends MemberSignature
      ? Deps extends readonly string[] ? K : never
      : never
    : never]: MemberDefinition<S, NodeKey, K> extends { member: infer MemberSpec; deps: infer Deps extends readonly string[] }
      ? { member: MemberSpec & MemberSignature; deps: Deps }
      : never;
};

// Member resolution helpers
type ResolveCallMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, K extends string> =
  () => ReturnType<AccessorImplementation<S, A, Extract<K, AccessorKeys<S>>>>;

type DependencyOutput<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Dep extends string> =
  Dep extends `${infer Namespace}.${infer Rest}`
    ? Rest extends DataflowNodeKey<S>
      ? DataflowNodeOutput<S, A, Rest, Namespace>
      : unknown
    : Dep extends DataflowNodeKey<S>
      ? DataflowNodeOutput<S, A, Dep>
      : unknown;

type DependencyOutputs<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Deps extends readonly string[]> =
  Deps extends readonly [infer First extends string, ...infer Rest extends readonly string[]]
    ? [DependencyOutput<S, A, First>, ...DependencyOutputs<S, A, Rest>]
    : [];

type FirstDependency<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Deps extends readonly string[]> =
  Deps extends readonly [infer First extends string, ...any]
    ? DependencyOutput<S, A, First>
    : unknown;

type ResolveLookupArgMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Def extends { member: LookupArgMember; deps: readonly string[] }> =
  (map: FirstDependency<S, A, Def['deps']> extends Record<string, infer Value>
    ? Record<string, Value>
    : Record<string, unknown>) => (
      arg: Def['member']['accessor'] extends string
        ? ReturnType<AccessorImplementation<S, A, Extract<Def['member']['accessor'], AccessorKeys<S>>>>
        : unknown
    ) => FirstDependency<S, A, Def['deps']> extends Record<string, infer Value>
      ? Value
      : unknown;

type ResolveLookupFValMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Def extends { deps: readonly string[] }> =
  (map: FirstDependency<S, A, Def['deps']> extends Record<string, infer Value>
    ? Record<string, Value>
    : Record<string, unknown>) => () => FirstDependency<S, A, Def['deps']> extends Record<string, infer Value>
      ? Value
      : unknown;

type ResolveLookupKValMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Def extends { deps: readonly string[] }> =
  (map: FirstDependency<S, A, Def['deps']> extends Record<string, infer Value>
    ? Record<string, Value>
    : Record<string, unknown>) => () => FirstDependency<S, A, Def['deps']> extends Record<string, infer Value extends unknown[]>
      ? Value
      : unknown[];

type ResolveFetchMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Def extends { deps: readonly string[] }> =
  (value: FirstDependency<S, A, Def['deps']>) => () => FirstDependency<S, A, Def['deps']>;

type ResolveSubgraphMember = () => (...args: unknown[]) => Graph;

type ResolveMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, Def extends { member: MemberSignature; deps: readonly string[] }> =
  Def['member'] extends CallSignature<infer K>
    ? ResolveCallMember<S, A, K>
    : Def['member'] extends LookupArgMember
      ? ResolveLookupArgMember<S, A, Def & { member: LookupArgMember }>
      : Def['member'] extends LookupFValMember
        ? ResolveLookupFValMember<S, A, Def>
        : Def['member'] extends LookupKValMember
          ? ResolveLookupKValMember<S, A, Def>
          : Def['member'] extends FetchMember
            ? ResolveFetchMember<S, A, Def>
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
  readonly [K in keyof FilteredMemberDefs<S, NodeKey>]: FilteredMemberDefs<S, NodeKey>[K] extends { member: infer MemberSpec; deps: infer Deps extends readonly string[] }
    ? ResolveMember<S, A, { member: MemberSpec & MemberSignature; deps: Deps }>
    : never;
};

export type InferNodeShape<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, NodeKey extends keyof InterfaceNodeMap<S> & string> =
  InferMembers<S, A, NodeKey> & InferClassMembers<S, A, NodeKey>;

export type PatternGraphType<S extends PatternSpecLiteral, A extends AccessorImplementations<S>> = Graph & {
  node<Key extends keyof InterfaceNodeMap<S> & string>(key: Key): Node<InferNodeShape<S, A, Key>>;
  node(key: string): Node<unknown>;
};
