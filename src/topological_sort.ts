import { Graph, Node } from './types.js';

/**
 * Performs a topological sort on a directed acyclic graph (DAG).
 * Returns nodes in an order where all dependencies come before dependents.
 * 
 * @param graph - The directed graph to sort (must be acyclic)
 * @returns Array of nodes in topological order
 * @throws Error if the graph contains cycles (is not a DAG)
 * 
 * @example
 * ```typescript
 * const g = graph(
 *   [{key: 'a'}, {key: 'b'}, {key: 'c'}],
 *   [{key: 'e1', value: {source: 'a', target: 'b'}}, 
 *    {key: 'e2', value: {source: 'b', target: 'c'}}]
 * );
 * const sorted = topological_sort(g);
 * console.log(sorted.map(n => n.key())); // ['a', 'b', 'c']
 * ```
 */
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