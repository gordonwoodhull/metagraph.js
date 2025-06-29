import { describe, it, expect, beforeEach } from 'vitest';
import { graph_incidence } from '../src/index.js';

describe('incidences', () => {
  let graph: any;
  let nodes: any[];

  const get_key = (n: any) => n.key();

  describe('adcdefg edges implicit outward', () => {
    beforeEach(() => {
      nodes = [
        { key: 'a', value: { edges: ['b', 'c'] } },
        { key: 'b' },
        { key: 'c', value: { n: 17, edges: 'd' } },
        { key: 'd' }
      ];
      graph = graph_incidence(nodes);
    });

    it('has nodes a,b,c,d', () => {
      expect(graph.nodes().map(get_key)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('has edges a-b,a-c,c-d', () => {
      expect(graph.edges().map(get_key)).toEqual(['a-b', 'a-c', 'c-d']);
    });

    it('nodes b,c have graph', () => {
      expect(graph.node('b').graph()).toBe(graph);
      expect(graph.node('c').graph()).toBe(graph);
    });

    it('edges a-b,a-c have graph', () => {
      expect(graph.edge('a-b').graph()).toBe(graph);
      expect(graph.edge('a-c').graph()).toBe(graph);
    });

    it('a has outs a-b,a-c', () => {
      expect(graph.node('a').outs().map(get_key)).toEqual(['a-b', 'a-c']);
    });

    it('c has out c-d', () => {
      expect(graph.node('c').outs().map(get_key)).toEqual(['c-d']);
    });

    it('a has no ins', () => {
      expect(graph.node('a').ins()).toEqual([]);
    });

    it('d has no outs', () => {
      expect(graph.node('d').outs()).toEqual([]);
    });

    it('b has in a-b', () => {
      expect(graph.node('b').ins().map(get_key)).toEqual(['a-b']);
    });

    it('a-b has source a', () => {
      expect(graph.edge('a-b').source().key()).toEqual('a');
    });

    it('c-d has target d', () => {
      expect(graph.edge('c-d').target().key()).toEqual('d');
    });

    it('node c has data', () => {
      expect(graph.node('c').value().n).toEqual(17);
    });

    it('edges only have source,target as data', () => {
      graph.edges().forEach((e: any) => {
        expect(Object.keys(e.value())).toEqual(['source', 'target']);
      });
    });
  });

  describe('adcdefg edges explicit outward', () => {
    beforeEach(() => {
      nodes = [
        { key: 'a', value: { outs: ['b', 'c'] } },
        { key: 'b' },
        { key: 'c', value: { n: 17, outs: 'd' } },
        { key: 'd' }
      ];
      graph = graph_incidence(nodes);
    });

    it('has nodes a,b,c,d', () => {
      expect(graph.nodes().map(get_key)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('has edges a-b,a-c,c-d', () => {
      expect(graph.edges().map(get_key)).toEqual(['a-b', 'a-c', 'c-d']);
    });

    it('edges only have source,target as data', () => {
      graph.edges().forEach((e: any) => {
        expect(Object.keys(e.value())).toEqual(['source', 'target']);
      });
    });
  });

  describe('adcdefg edges explicit inward', () => {
    beforeEach(() => {
      nodes = [
        { key: 'a' },
        { key: 'b', value: { ins: 'a' } },
        { key: 'c', value: { n: 17, ins: 'a' } },
        { key: 'd', value: { ins: 'c' } }
      ];
      graph = graph_incidence(nodes);
    });

    it('has nodes a,b,c,d', () => {
      expect(graph.nodes().map(get_key)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('has edges a-b,a-c,c-d', () => {
      expect(graph.edges().map(get_key)).toEqual(['a-b', 'a-c', 'c-d']);
    });

    it('edges only have source,target as data', () => {
      graph.edges().forEach((e: any) => {
        expect(Object.keys(e.value())).toEqual(['source', 'target']);
      });
    });
  });
});