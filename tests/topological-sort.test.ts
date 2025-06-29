import { describe, it, expect, beforeEach } from 'vitest';
import { pattern, graph_pattern, topological_sort } from '../src/index.js';

describe('topological sort', () => {
  let graph: any;

  const get_key = (n: any) => n.key();
  
  const get_nodes = (graph: any, keys: any[]) => 
    keys.map(i => graph.node(i));

  const topologically_sorted = (graph: any, list: any[]) => {
    const id = list.reduce((p, v, i) => {
      p[v.key()] = i;
      return p;
    }, {} as Record<string, number>);
    return graph.edges().every((e: any) => 
      id[e.source().key()] < id[e.target().key()]
    );
  };

  describe('adcdefg', () => {
    beforeEach(() => {
      graph = pattern(graph_pattern()).node('Graph').value().create({
        nodes: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c' },
          { key: 'd' }
        ],
        edges: [
          { key: 'e', value: { source: 'a', target: 'b' } },
          { key: 'f', value: { source: 'a', target: 'c', n: 42 } },
          { key: 'g', value: { source: 'c', target: 'd' } }
        ]
      });
    });

    it('is already topologically sorted', () => {
      expect(topologically_sorted(graph, graph.nodes())).toBeTruthy();
    });

    it('and sorting leaves it so', () => {
      expect(topologically_sorted(graph, topological_sort(graph))).toBeTruthy();
    });
  });

  describe('gfedcba', () => {
    beforeEach(() => {
      graph = pattern(graph_pattern()).node('Graph').value().create({
        nodes: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c' },
          { key: 'd' }
        ],
        edges: [
          { key: 'e', value: { source: 'b', target: 'a' } },
          { key: 'f', value: { source: 'c', target: 'a' } },
          { key: 'g', value: { source: 'd', target: 'c' } }
        ]
      });
    });

    it('is not already topologically sorted', () => {
      expect(topologically_sorted(graph, graph.nodes())).toBeFalsy();
    });

    it('but sorting leaves it so', () => {
      expect(topologically_sorted(graph, topological_sort(graph))).toBeTruthy();
    });
  });

  describe('binary tree', () => {
    beforeEach(() => {
      graph = pattern(graph_pattern()).node('Graph').value().create({
        nodes: [
          { key: 0 },
          { key: 1 },
          { key: 2 },
          { key: 3 },
          { key: 4 },
          { key: 5 },
          { key: 6 }
        ],
        edges: [
          { key: 0, value: { source: 1, target: 0 } },
          { key: 1, value: { source: 1, target: 2 } },
          { key: 2, value: { source: 3, target: 2 } },
          { key: 3, value: { source: 3, target: 5 } },
          { key: 4, value: { source: 5, target: 4 } },
          { key: 5, value: { source: 5, target: 6 } }
        ]
      });
    });

    it('is not already topologically sorted', () => {
      expect(topologically_sorted(graph, graph.nodes())).toBeFalsy();
    });

    it('but sorting leaves it so', () => {
      expect(topologically_sorted(graph, topological_sort(graph))).toBeTruthy();
    });

    describe('verify the verifier', () => {
      it('3564120 is a topological sort', () => {
        expect(topologically_sorted(graph, get_nodes(graph, [3, 5, 6, 4, 1, 2, 0]))).toBeTruthy();
      });

      it('3120564 is a topological sort', () => {
        expect(topologically_sorted(graph, get_nodes(graph, [3, 1, 2, 0, 5, 6, 4]))).toBeTruthy();
      });

      it('3156240 is a topological sort', () => {
        expect(topologically_sorted(graph, get_nodes(graph, [3, 1, 5, 6, 2, 4, 0]))).toBeTruthy();
      });

      it('3150426 is a topological sort', () => {
        expect(topologically_sorted(graph, get_nodes(graph, [3, 1, 5, 0, 4, 2, 6]))).toBeTruthy();
      });

      it('3145026 is not a topological sort', () => {
        expect(topologically_sorted(graph, get_nodes(graph, [3, 1, 4, 5, 0, 2, 6]))).toBeFalsy();
      });
    });
  });
});