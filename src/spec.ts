import type { FlowFunction } from './types.js';

/**
 * Spec module defines the typed schema used to describe patterns as frozen
 * `as const` literals. Runtime interpreters consume the schema and wire the
 * existing lazy graph/dataflow machinery around it.
 */

/**
 * Accessor declarations describe the named runtime helpers a spec expects at
 * instantiation time (e.g. `nodeKey`, `edgeSource`). The literal portion of the
 * spec only needs the keys; concrete implementations are provided separately.
 */
export const accessorSignature: unique symbol = Symbol('accessorSignature');

export interface AccessorDescriptor<TFn extends (...args: any[]) => unknown = (...args: unknown[]) => unknown> {
  readonly description?: string;
  readonly [accessorSignature]?: TFn;
}

export type AccessorDeclarations<T extends object = Record<string, (...args: any[]) => unknown>> = {
  readonly [K in keyof T]: AccessorDescriptor<
    T[K] extends (...args: any[]) => unknown ? T[K] : (...args: any[]) => unknown
  >;
};

/**
 * Payload buckets describe the runtime data that feeds the pattern. Each entry
 * maps a bucket name to the static TypeScript shape expected at runtime. The
 * interpreter uses these bucket names when wiring createables and calculators.
 */
export type PayloadBuckets = Record<string, unknown>;

/**
 * Dataflow nodes describe lazy calculations. Each node can declare zero or more
 * inbound edges via `ins` and optional references to other interface nodes via
 * `refs`. The interpreter materialises calculators based on the kind tag.
 */
export type DataflowNodeKind =
  | { readonly kind: 'input'; readonly path?: string }
  | { readonly kind: 'output' }
  | { readonly kind: 'singleton' }
  | { readonly kind: 'map'; readonly refs: string }
  | { readonly kind: 'list'; readonly refs: string }
  | { readonly kind: 'map_of_lists'; readonly refs: string; readonly accessor: string }
  | { readonly kind: 'subset'; readonly refs: string };

export type DataflowNodeLiteral = DataflowNodeKind & {
  readonly ins?: string | readonly string[];
  readonly refs?: string | readonly string[];
};

export interface DataflowSpecLiteral {
  readonly nodes: Record<string, DataflowNodeLiteral>;
}

/**
 * Interface member descriptors describe both instance members (methods on
 * runtime wrappers) and class members (builders such as `create`). The
 * descriptors are purely declarative; the interpreter maps them to existing
 * runtime helper factories.
 */
export type InterfaceMemberKind =
  | { readonly kind: 'call'; readonly accessor: string }
  | { readonly kind: 'fetch' }
  | { readonly kind: 'lookupArg'; readonly accessor?: string }
  | { readonly kind: 'lookupFVal'; readonly accessor: string }
  | { readonly kind: 'lookupKVal' }
  | { readonly kind: 'subgraph' };

export type InterfaceClassMemberKind =
  | { readonly kind: 'createable'; readonly flow: string };

export type InterfaceNodeLiteral =
  | string
  | InterfaceNodeLiteralObject;

export interface InterfaceNodeLiteralObject {
  readonly alias?: string;
  readonly members?: Record<string, InterfaceMemberKind>;
  readonly classMembers?: Record<string, InterfaceClassMemberKind>;
}

export interface InterfaceEdgeLiteral {
  readonly source: string;
  readonly target: string;
  readonly name: string;
  readonly deps?: string | readonly string[];
  readonly member?: InterfaceMemberKind;
}

export interface InterfaceSpecLiteral {
  readonly nodes: Record<string, InterfaceNodeLiteral>;
  readonly edges: Record<string, InterfaceEdgeLiteral>;
}

/**
 * Full pattern spec literal combines payload buckets, accessors, interface
 * wiring, and dataflow graph. Generic parameters retain the type-level linkage
 * between these sections without requiring runtime duplication.
 */
export interface PatternSpecLiteral<
  Payloads extends PayloadBuckets = PayloadBuckets,
  AccessorFns extends object = Record<string, (...args: any[]) => unknown>
> {
  readonly payloads: Payloads;
  readonly accessors: AccessorDeclarations<AccessorFns>;
  readonly dataflow: DataflowSpecLiteral;
  readonly interface: InterfaceSpecLiteral;
}

/**
 * Utility types that extract literal keys for downstream typing.
 */
export type AccessorMapOf<S extends PatternSpecLiteral> =
  S extends PatternSpecLiteral<any, infer AccessorFns> ? AccessorFns : Record<string, (...args: any[]) => unknown>;
export type AccessorKeys<S extends PatternSpecLiteral> = Extract<keyof AccessorMapOf<S>, string>;
export type DataflowNodeKeys<S extends PatternSpecLiteral> = Extract<keyof S['dataflow']['nodes'], string>;
export type InterfaceNodeKeys<S extends PatternSpecLiteral> = Extract<keyof S['interface']['nodes'], string>;
export type InterfaceNodeMap<S extends PatternSpecLiteral> = S['interface']['nodes'];

export type PayloadsOf<S extends PatternSpecLiteral> = S['payloads'];
export type PayloadKeys<S extends PatternSpecLiteral> = Extract<keyof PayloadsOf<S>, string>;
export type PayloadBucket<S extends PatternSpecLiteral, K extends PayloadKeys<S>> = PayloadsOf<S>[K];

export type AccessorFunction<S extends PatternSpecLiteral, K extends AccessorKeys<S>> =
  S['accessors'][K] extends AccessorDescriptor<infer Fn> ? Fn : (...args: any[]) => unknown;

/**
 * Runtime accessor map expected by interpreters.
 */
export type AccessorImplementations<S extends PatternSpecLiteral> = {
  readonly [K in AccessorKeys<S>]: AccessorFunction<S, K>;
};

/**
 * Runtime calculator factory interface shared with dataflow interpreters.
 */
export interface DataflowCalculatorFactory {
  readonly kind: DataflowNodeKind['kind'];
  readonly create: (
    nodeKey: string,
    literal: DataflowNodeLiteral,
    resolveAccessor: (key: string) => (...args: unknown[]) => unknown
  ) => {
    readonly calc: FlowFunction;
  };
}
