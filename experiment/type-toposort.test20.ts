import type { TopoSort } from './type-toposort';

type Nodes20 = readonly [
  'n0','n1','n2','n3','n4','n5','n6','n7','n8','n9',
  'n10','n11','n12','n13','n14','n15','n16','n17','n18','n19'
];

type Edges20 = readonly [
  { source: 'n0'; target: 'n1' },
  { source: 'n1'; target: 'n2' },
  { source: 'n2'; target: 'n3' },
  { source: 'n3'; target: 'n4' },
  { source: 'n4'; target: 'n5' },
  { source: 'n5'; target: 'n6' },
  { source: 'n6'; target: 'n7' },
  { source: 'n7'; target: 'n8' },
  { source: 'n8'; target: 'n9' },
  { source: 'n9'; target: 'n10' },
  { source: 'n10'; target: 'n11' },
  { source: 'n11'; target: 'n12' },
  { source: 'n12'; target: 'n13' },
  { source: 'n13'; target: 'n14' },
  { source: 'n14'; target: 'n15' },
  { source: 'n15'; target: 'n16' },
  { source: 'n16'; target: 'n17' },
  { source: 'n17'; target: 'n18' },
  { source: 'n18'; target: 'n19' }
];

type Graph20 = { nodes: Nodes20; edges: Edges20 };

type Assert<T extends true> = T;
type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Test20 = Assert<IsExact<TopoSort<Graph20>, Nodes20>>;
