import type { TopoSort } from './type-toposort';

type Nodes45 = readonly [
  'n0','n1','n2','n3','n4','n5','n6','n7','n8','n9',
  'n10','n11','n12','n13','n14','n15','n16','n17','n18','n19',
  'n20','n21','n22','n23','n24','n25','n26','n27','n28','n29',
  'n30','n31','n32','n33','n34','n35','n36','n37','n38','n39',
  'n40','n41','n42','n43','n44'
];

type Edges45 = readonly [
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
  { source: 'n18'; target: 'n19' },
  { source: 'n19'; target: 'n20' },
  { source: 'n20'; target: 'n21' },
  { source: 'n21'; target: 'n22' },
  { source: 'n22'; target: 'n23' },
  { source: 'n23'; target: 'n24' },
  { source: 'n24'; target: 'n25' },
  { source: 'n25'; target: 'n26' },
  { source: 'n26'; target: 'n27' },
  { source: 'n27'; target: 'n28' },
  { source: 'n28'; target: 'n29' },
  { source: 'n29'; target: 'n30' },
  { source: 'n30'; target: 'n31' },
  { source: 'n31'; target: 'n32' },
  { source: 'n32'; target: 'n33' },
  { source: 'n33'; target: 'n34' },
  { source: 'n34'; target: 'n35' },
  { source: 'n35'; target: 'n36' },
  { source: 'n36'; target: 'n37' },
  { source: 'n37'; target: 'n38' },
  { source: 'n38'; target: 'n39' },
  { source: 'n39'; target: 'n40' },
  { source: 'n40'; target: 'n41' },
  { source: 'n41'; target: 'n42' },
  { source: 'n42'; target: 'n43' },
  { source: 'n43'; target: 'n44' }
];

type Graph45 = { nodes: Nodes45; edges: Edges45 };

type Assert<T extends true> = T;
type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Test45 = Assert<IsExact<TopoSort<Graph45>, Nodes45>>;
