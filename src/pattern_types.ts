import type { PatternSpecLiteral, AccessorImplementations, AccessorKeys, AccessorFunction, InterfaceNodeMap } from './spec.js';
import type { DataflowNodeKey, DataflowNodeOutput, ExternalNamespaceMap, DefaultFlowKey } from './pattern_dataflow.js';
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
  S['interface']['edges'][K] extends { source: infer Source extends string; target: infer Target extends string; name: infer Name extends string; member: infer MemberLiteral; deps?: infer Deps }
    ? ToMemberSignature<MemberLiteral> extends infer MemberSpec
      ? MemberSpec extends MemberSignature
        ? { source: Source; target: Target; name: Name; member: MemberSpec; deps: NormalizeDeps<Deps> }
        : never
      : never
    : never;

type EdgeMemberDefs<S extends PatternSpecLiteral, NodeKey extends keyof InterfaceNodeMap<S> & string> = {
  [K in keyof S['interface']['edges'] & string as EdgeEntry<S, K> extends { source: NodeKey; name: infer Name extends string } ? Name : never]:
    EdgeEntry<S, K> extends { member: infer MemberSpec; deps: infer Deps extends readonly string[]; target: infer Target extends string }
      ? { member: MemberSpec; deps: Deps; target: Target }
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
    : never]: MemberDefinition<S, NodeKey, K> extends { member: infer MemberSpec; deps: infer Deps extends readonly string[]; target?: infer Target extends string }
      ? { member: MemberSpec & MemberSignature; deps: Deps; target: Target }
      : never;
};

// Member resolution helpers
type ResolveCallMember<S extends PatternSpecLiteral, A extends AccessorImplementations<S>, K extends string> =
  () => ReturnType<AccessorImplementation<S, A, Extract<K, AccessorKeys<S>>>>;

type DependencyOutput<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Dep extends string,
  Namespaces extends ExternalNamespaceMap
> =
  Dep extends `${infer Namespace}.${infer Rest}`
    ? Rest extends DataflowNodeKey<S>
      ? DataflowNodeOutput<S, A, Rest, Namespace, never, Namespaces>
      : unknown
    : Dep extends DataflowNodeKey<S>
      ? DataflowNodeOutput<S, A, Dep, DefaultFlowKey<S>, never, Namespaces>
      : unknown;

type DependencyOutputs<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Deps extends readonly string[],
  Namespaces extends ExternalNamespaceMap
> =
  Deps extends readonly [infer First extends string, ...infer Rest extends readonly string[]]
    ? [DependencyOutput<S, A, First, Namespaces>, ...DependencyOutputs<S, A, Rest, Namespaces>]
    : [];

type FirstDependency<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Deps extends readonly string[],
  Namespaces extends ExternalNamespaceMap
> =
  Deps extends readonly [infer First extends string, ...any]
    ? DependencyOutput<S, A, First, Namespaces>
    : unknown;

type DependencyTuple<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Deps extends readonly string[],
  Namespaces extends ExternalNamespaceMap
> = DependencyOutputs<S, A, Deps, Namespaces>;

type FirstTupleEntry<Tuple extends readonly unknown[]> = Tuple extends readonly [infer First, ...unknown[]] ? First : unknown;

type DependencyRecordFromTuple<Tuple extends readonly unknown[]> =
  FirstTupleEntry<Tuple> extends Record<string, infer Value>
    ? Record<string, Value>
    : Record<string, unknown>;

type DependencyRecordValueFromTuple<Tuple extends readonly unknown[]> =
  FirstTupleEntry<Tuple> extends Record<string, infer Value>
    ? Value
    : unknown;

type DependencyRecordKeyFromTuple<Tuple extends readonly unknown[]> =
  keyof DependencyRecordFromTuple<Tuple> extends infer Keys
    ? Keys extends string
      ? Keys
      : string
    : string;

type ResolveLookupArgMember<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Namespaces extends ExternalNamespaceMap,
  Def extends { member: LookupArgMember; deps: readonly string[]; target?: string }
> =
  (map: DependencyRecordFromTuple<DependencyTuple<S, A, Def['deps'], Namespaces>>) => (
      arg: Def['member']['accessor'] extends string
        ? ReturnType<AccessorImplementation<S, A, Extract<Def['member']['accessor'], AccessorKeys<S>>>>
        : DependencyRecordKeyFromTuple<DependencyTuple<S, A, Def['deps'], Namespaces>>
    ) => DependencyRecordValueFromTuple<DependencyTuple<S, A, Def['deps'], Namespaces>>;

type ResolveLookupFValMember<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Namespaces extends ExternalNamespaceMap,
  Def extends { deps: readonly string[]; target?: string }
> =
  (map: DependencyRecordFromTuple<DependencyTuple<S, A, Def['deps'], Namespaces>>) => () => DependencyRecordValueFromTuple<DependencyTuple<S, A, Def['deps'], Namespaces>>;

type ResolveLookupKValMember<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Namespaces extends ExternalNamespaceMap,
  Def extends { deps: readonly string[]; target?: string }
> =
  (map: DependencyRecordFromTuple<DependencyTuple<S, A, Def['deps'], Namespaces>>) => () => FirstDependency<S, A, Def['deps'], Namespaces> extends Record<string, infer Value extends unknown[]>
      ? Value
      : unknown[];

type ResolveFetchMember<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Namespaces extends ExternalNamespaceMap,
  Def extends { deps: readonly string[]; target?: string }
> =
  (value: FirstDependency<S, A, Def['deps'], Namespaces>) => () => FirstDependency<S, A, Def['deps'], Namespaces>;

type ResolveSubgraphMember<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Namespaces extends ExternalNamespaceMap,
  Def extends { target?: string }
> = Def['target'] extends string
  ? () => (nodeKeys: string[], edgeKeys: string[], payload: unknown) => InferNodeShape<S, A, Extract<Def['target'], string>, Namespaces>
  : () => (...args: unknown[]) => Graph;

type ResolveMember<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Namespaces extends ExternalNamespaceMap,
  Def extends { member: MemberSignature; deps: readonly string[]; target?: string }
> =
  Def['member'] extends CallSignature<infer K>
    ? ResolveCallMember<S, A, K>
    : Def['member'] extends LookupArgMember
      ? ResolveLookupArgMember<S, A, Namespaces, Def & { member: LookupArgMember }>
      : Def['member'] extends LookupFValMember
        ? ResolveLookupFValMember<S, A, Namespaces, Def>
        : Def['member'] extends LookupKValMember
          ? ResolveLookupKValMember<S, A, Namespaces, Def>
          : Def['member'] extends FetchMember
            ? ResolveFetchMember<S, A, Namespaces, Def>
            : ResolveSubgraphMember<S, A, Namespaces, Def>;

export type InferClassMembers<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  NodeKey extends keyof InterfaceNodeMap<S> & string,
  Namespaces extends ExternalNamespaceMap = {}
> = {
  readonly [K in keyof ClassMemberMap<S, NodeKey>]: ClassMemberMap<S, NodeKey>[K] extends CreateableSignature
    ? (data: FlowPayload<S, ClassMemberMap<S, NodeKey>[K]['flow']>) => InferNodeShape<S, A, NodeKey, Namespaces>
    : never;
};

export type InferMembers<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  NodeKey extends keyof InterfaceNodeMap<S> & string,
  Namespaces extends ExternalNamespaceMap = {}
> = {
  readonly [K in keyof FilteredMemberDefs<S, NodeKey>]: FilteredMemberDefs<S, NodeKey>[K] extends { member: infer MemberSpec; deps: infer Deps extends readonly string[] }
    ? ResolveMember<S, A, Namespaces, { member: MemberSpec & MemberSignature; deps: Deps }>
    : never;
};

export type InferNodeShape<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  NodeKey extends keyof InterfaceNodeMap<S> & string,
  Namespaces extends ExternalNamespaceMap = {}
> =
  InferMembers<S, A, NodeKey, Namespaces> & InferClassMembers<S, A, NodeKey, Namespaces>;

export type PatternGraphType<
  S extends PatternSpecLiteral,
  A extends AccessorImplementations<S>,
  Namespaces extends ExternalNamespaceMap = {}
> = Graph & {
  node<Key extends keyof InterfaceNodeMap<S> & string>(key: Key): Node<InferNodeShape<S, A, Key, Namespaces>>;
  node(key: string): Node<unknown>;
};
