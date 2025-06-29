import { describe, it, expect, beforeEach } from 'vitest';
import { graph } from '../src/index.js';

describe('graph', () => {
  let testGraph: any;
  let nodes: any[];
  let edges: any[];

  const get_key = (n: any) => n.key();

  describe('adcdefg', () => {
    beforeEach(() => {
      nodes = [
        { key: 'a' },
        { key: 'b' },
        { key: 'c', value: { n: 17 } },
        { key: 'd' }
      ];
      edges = [
        { key: 'e', value: { source: 'a', target: 'b' } },
        { key: 'f', value: { source: 'a', target: 'c', n: 42 } },
        { key: 'g', value: { source: 'c', target: 'd' } }
      ];
      testGraph = graph(nodes, edges);
    });

    it('has nodes a,b,c,d', () => {
      expect(testGraph.nodes().map(get_key)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('has edges e,f,g', () => {
      expect(testGraph.edges().map(get_key)).toEqual(['e', 'f', 'g']);
    });

    it('nodes b,c have graph', () => {
      expect(testGraph.node('b').graph()).toBe(testGraph);
      expect(testGraph.node('c').graph()).toBe(testGraph);
    });

    it('edges e,f have graph', () => {
      expect(testGraph.edge('e').graph()).toBe(testGraph);
      expect(testGraph.edge('f').graph()).toBe(testGraph);
    });

    it('a has outs e,f', () => {
      expect(testGraph.node('a').outs().map(get_key)).toEqual(['e', 'f']);
    });

    it('c has out g', () => {
      expect(testGraph.node('c').outs().map(get_key)).toEqual(['g']);
    });

    it('a has no ins', () => {
      expect(testGraph.node('a').ins()).toEqual([]);
    });

    it('d has no outs', () => {
      expect(testGraph.node('d').outs()).toEqual([]);
    });

    it('b has in e', () => {
      expect(testGraph.node('b').ins().map(get_key)).toEqual(['e']);
    });

    it('f has source a', () => {
      expect(testGraph.edge('f').source().key()).toEqual('a');
    });

    it('g has target d', () => {
      expect(testGraph.edge('g').target().key()).toEqual('d');
    });

    it('node c has data', () => {
      expect(testGraph.node('c').value().n).toEqual(17);
    });

    it('edge f has data', () => {
      expect(testGraph.edge('f').value().n).toEqual(42);
    });
  });
});