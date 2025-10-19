import type { TopoSort } from './type-toposort';

type Nodes10 = readonly ['n0','n1','n2','n3','n4','n5','n6','n7','n8','n9'];
type Edges10 = readonly [
  { source: 'n0'; target: 'n1' },
  { source: 'n1'; target: 'n2' },
  { source: 'n2'; target: 'n3' },
  { source: 'n3'; target: 'n4' },
  { source: 'n4'; target: 'n5' },
  { source: 'n5'; target: 'n6' },
  { source: 'n6'; target: 'n7' },
  { source: 'n7'; target: 'n8' },
  { source: 'n8'; target: 'n9' }
];

type Graph10 = { nodes: Nodes10; edges: Edges10 };

type Assert<T extends true> = T;
type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Test10 = Assert<IsExact<TopoSort<Graph10>, Nodes10>>;
