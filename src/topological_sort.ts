import { Graph, Node } from './types.js';

export function topological_sort<N = any>(graph: Graph<N>): Node<N>[] {
  // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
  const stacked: Record<string, boolean> = {};
  const marked: Record<string, boolean> = {};
  const sorted: Node<N>[] = [];
  
  function visit(n: Node<N>): void {
    if (stacked[n.key()]) {
      throw new Error('not a DAG');
    }
    if (!marked[n.key()]) {
      stacked[n.key()] = true;
      n.outs().forEach(e => {
        visit(e.target());
      });
      marked[n.key()] = true;
      stacked[n.key()] = false;
      sorted.unshift(n);
    }
  }
  
  let i = 0;
  const nodes = graph.nodes();
  while (Object.keys(marked).length < nodes.length) {
    while (marked[nodes[i].key()]) ++i;
    visit(nodes[i]);
  }
  
  return sorted;
}