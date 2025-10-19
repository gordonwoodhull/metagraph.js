// Type-level utilities for compile-time topological sorting.

type Edge = { source: string; target: string };

export type GraphSpec = {
  nodes: readonly string[];
  edges: readonly Edge[];
};

type HasIncoming<Edges extends readonly Edge[], Node extends string> =
  Edges extends readonly []
    ? false
    : Edges extends readonly [infer Head extends Edge, ...infer Tail extends Edge[]]
      ? Head['target'] extends Node
        ? true
        : HasIncoming<Tail, Node>
      : false;

type PartitionNodes<
  Nodes extends readonly string[],
  Edges extends readonly Edge[],
  Roots extends string[] = [],
  NonRoots extends string[] = []
> =
  Nodes extends readonly [infer Head extends string, ...infer Tail extends string[]]
    ? HasIncoming<Edges, Head> extends true
      ? PartitionNodes<Tail, Edges, Roots, [...NonRoots, Head]>
      : PartitionNodes<Tail, Edges, [...Roots, Head], NonRoots>
    : { roots: Roots; nonRoots: NonRoots };

// Helper to remove nodes present in ToRemove from Nodes tuple.
type RemoveNodes<
  Nodes extends readonly string[],
  ToRemove extends readonly string[]
> =
  Nodes extends readonly [infer Head extends string, ...infer Tail extends string[]]
    ? Head extends ToRemove[number]
      ? RemoveNodes<Tail, ToRemove>
      : [Head, ...RemoveNodes<Tail, ToRemove>]
    : [];

// Remove edges whose source is one of the nodes in Sources.
type RemoveEdgesBySources<
  Edges extends readonly Edge[],
  Sources extends readonly string[]
> =
  Edges extends readonly [infer Head extends Edge, ...infer Tail extends Edge[]]
    ? Head['source'] extends Sources[number]
      ? RemoveEdgesBySources<Tail, Sources>
      : [Head, ...RemoveEdgesBySources<Tail, Sources>]
    : [];

// Core topo-sort implementation.
type TopoSortImpl<
  Nodes extends readonly string[],
  Edges extends readonly Edge[],
  Acc extends string[] = []
> =
  Nodes extends readonly []
    ? Acc
    : PartitionNodes<Nodes, Edges> extends {
        roots: infer Roots extends string[];
        nonRoots: infer NonRoots extends string[];
      }
      ? Roots extends []
        ? never // cycle detected
        : TopoSortImpl<
            RemoveNodes<Nodes, Roots>,
            RemoveEdgesBySources<Edges, Roots>,
            [...Acc, ...Roots]
          >
      : never;

type AsReadonlyTuple<T extends string[]> = readonly [...T];

export type TopoSort<Graph extends GraphSpec> = TopoSortImpl<Graph['nodes'], Graph['edges']> extends infer Result extends string[]
  ? AsReadonlyTuple<Result>
  : never;
