// Type-level utilities for compile-time topological sorting.

type Edge = { source: string; target: string };

type GraphSpec = {
  nodes: readonly string[];
  edges: readonly Edge[];
};

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

type Expect<T extends true> = T;

type IsInList<List extends readonly string[], Item extends string> =
  List extends readonly []
    ? false
    : List extends readonly [infer Head extends string, ...infer Tail extends string[]]
      ? Equal<Head, Item> extends true
        ? true
        : IsInList<Tail, Item>
      : false;

type HasIncoming<
  Edges extends readonly Edge[],
  Node extends string
> =
  Edges extends readonly []
    ? false
    : Edges extends readonly [infer Head extends Edge, ...infer Tail extends Edge[]]
      ? Equal<Head['target'], Node> extends true
        ? true
        : HasIncoming<Tail, Node>
      : false;

type PartitionNodes<
  Nodes extends readonly string[],
  Edges extends readonly Edge[],
  Roots extends readonly string[] = [],
  NonRoots extends readonly string[] = []
> =
  Nodes extends readonly [infer Head extends string, ...infer Tail extends string[]]
    ? HasIncoming<Edges, Head> extends true
      ? PartitionNodes<Tail, Edges, Roots, readonly [...NonRoots, Head]>
      : PartitionNodes<Tail, Edges, readonly [...Roots, Head], NonRoots>
    : { roots: Roots; nonRoots: NonRoots };

type RemoveNodes<
  Nodes extends readonly string[],
  ToRemove extends readonly string[]
> =
  Nodes extends readonly [infer Head extends string, ...infer Tail extends string[]]
    ? IsInList<ToRemove, Head> extends true
      ? RemoveNodes<Tail, ToRemove>
      : readonly [Head, ...RemoveNodes<Tail, ToRemove>]
    : readonly [];

type RemoveEdgesBySources<
  Edges extends readonly Edge[],
  Sources extends readonly string[]
> =
  Edges extends readonly [infer Head extends Edge, ...infer Tail extends Edge[]]
    ? IsInList<Sources, Head['source']> extends true
      ? RemoveEdgesBySources<Tail, Sources>
      : readonly [Head, ...RemoveEdgesBySources<Tail, Sources>]
    : readonly [];

type TopoSortImpl<
  Nodes extends readonly string[],
  Edges extends readonly Edge[],
  Acc extends readonly string[] = []
> =
  Nodes extends readonly []
    ? Acc
    : PartitionNodes<Nodes, Edges> extends {
        roots: infer Roots extends readonly string[];
        nonRoots: infer NonRoots extends readonly string[];
      }
      ? Roots extends readonly []
        ? never
        : TopoSortImpl<
            RemoveNodes<Nodes, Roots>,
            RemoveEdgesBySources<Edges, Roots>,
            readonly [...Acc, ...Roots]
          >
      : never;

export type TopoSort<Graph extends GraphSpec> = TopoSortImpl<Graph['nodes'], Graph['edges']>;

// --- Tests -------------------------------------------------------------------

type GraphLinear = {
  nodes: readonly ['a', 'b', 'c'];
  edges: readonly [
    { source: 'a'; target: 'b' },
    { source: 'b'; target: 'c' }
  ];
};
type ExpectLinear = Expect<
  Equal<TopoSort<GraphLinear>, readonly ['a', 'b', 'c']>
>;

type GraphBranches = {
  nodes: readonly ['start', 'left', 'right', 'end'];
  edges: readonly [
    { source: 'start'; target: 'left' },
    { source: 'start'; target: 'right' },
    { source: 'left'; target: 'end' },
    { source: 'right'; target: 'end' }
  ];
};
type ExpectBranches = Expect<
  Equal<TopoSort<GraphBranches>, readonly ['start', 'left', 'right', 'end']>
>;

type GraphDisconnected = {
  nodes: readonly ['p', 'q'];
  edges: readonly [];
};
type ExpectDisconnected = Expect<
  Equal<TopoSort<GraphDisconnected>, readonly ['p', 'q']>
>;

type GraphCycle = {
  nodes: readonly ['x', 'y'];
  edges: readonly [
    { source: 'x'; target: 'y' },
    { source: 'y'; target: 'x' }
  ];
};
type ExpectCycle = Expect<
  Equal<TopoSort<GraphCycle>, never>
>;

type GraphLarger = {
  nodes: readonly ['a', 'b', 'c', 'd', 'e', 'f'];
  edges: readonly [
    { source: 'a'; target: 'c' },
    { source: 'b'; target: 'c' },
    { source: 'c'; target: 'd' },
    { source: 'c'; target: 'e' },
    { source: 'd'; target: 'f' },
    { source: 'e'; target: 'f' }
  ];
};
type ExpectLarger = Expect<
  Equal<TopoSort<GraphLarger>, readonly ['a', 'b', 'c', 'd', 'e', 'f']>
>;
