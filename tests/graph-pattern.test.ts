import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pattern, graph_pattern } from '../src/index.js';

describe('graph_pattern', () => {
  let graph: any;

  const get_key = (n: any) => n.key();

  describe('adcdefg', () => {
    beforeEach(() => {
      graph = pattern(graph_pattern()).node('Graph').value().create({
        nodes: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c', value: { n: 17 } },
          { key: 'd' }
        ],
        edges: [
          { key: 'e', value: { source: 'a', target: 'b' } },
          { key: 'f', value: { source: 'a', target: 'c', n: 42 } },
          { key: 'g', value: { source: 'c', target: 'd' } }
        ]
      });
    });

    it('has nodes a,b,c,d', () => {
      expect(graph.nodes().map(get_key)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('has edges e,f,g', () => {
      expect(graph.edges().map(get_key)).toEqual(['e', 'f', 'g']);
    });

    it('nodes b,c have graph', () => {
      expect(graph.node('b').graph()).toBe(graph);
      expect(graph.node('c').graph()).toBe(graph);
    });

    it('edges e,f have graph', () => {
      expect(graph.edge('e').graph()).toBe(graph);
      expect(graph.edge('f').graph()).toBe(graph);
    });

    it('a has outs e,f', () => {
      expect(graph.node('a').outs().map(get_key)).toEqual(['e', 'f']);
    });

    it('c has out g', () => {
      expect(graph.node('c').outs().map(get_key)).toEqual(['g']);
    });

    it('a has no ins', () => {
      expect(graph.node('a').ins()).toEqual([]);
    });

    it('d has no outs', () => {
      expect(graph.node('d').outs()).toEqual([]);
    });

    it('b has in e', () => {
      expect(graph.node('b').ins().map(get_key)).toEqual(['e']);
    });

    it('f has source a', () => {
      expect(graph.edge('f').source().key()).toEqual('a');
    });

    it('g has target d', () => {
      expect(graph.edge('g').target().key()).toEqual('d');
    });

    it('node c has data', () => {
      expect(graph.node('c').value().n).toEqual(17);
    });

    it('edge f has data', () => {
      expect(graph.edge('f').value().n).toEqual(42);
    });
  });

  describe('two graphs with one pattern', () => {
    let patternObj: any;
    let graph1: any;
    let graph2: any;

    beforeEach(() => {
      patternObj = pattern(graph_pattern());
      graph1 = patternObj.node('Graph').value().create({
        nodes: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c', value: { n: 17 } }
        ],
        edges: [
          { key: 'e', value: { source: 'a', target: 'b' } },
          { key: 'f', value: { source: 'b', target: 'c', n: 42 } }
        ]
      });
      graph2 = patternObj.node('Graph').value().create({
        nodes: [
          { key: 'A' },
          { key: 'B' },
          { key: 'C', value: { n: -17 } }
        ],
        edges: [
          { key: 'E', value: { source: 'A', target: 'B' } },
          { key: 'F', value: { source: 'B', target: 'C', n: -42 } }
        ]
      });
    });

    it('have their own nodes', () => {
      expect(graph1.nodes().map(get_key)).toEqual(['a', 'b', 'c']);
      expect(graph2.nodes().map(get_key)).toEqual(['A', 'B', 'C']);
    });

    it('have their own edges', () => {
      expect(graph1.edges().map(get_key)).toEqual(['e', 'f']);
      expect(graph2.edges().map(get_key)).toEqual(['E', 'F']);
    });

    it('nodes have their own graphs', () => {
      expect(graph1.node('b').graph()).toBe(graph1);
      expect(graph1.node('c').graph()).toBe(graph1);
      expect(graph2.node('B').graph()).toBe(graph2);
      expect(graph2.node('C').graph()).toBe(graph2);
    });

    it('edges have their own graphs', () => {
      expect(graph1.edge('e').graph()).toBe(graph1);
      expect(graph1.edge('f').graph()).toBe(graph1);
      expect(graph2.edge('E').graph()).toBe(graph2);
      expect(graph2.edge('F').graph()).toBe(graph2);
    });

    it('nodes have their own out-edges', () => {
      expect(graph1.node('a').outs().map(get_key)).toEqual(['e']);
      expect(graph2.node('A').outs().map(get_key)).toEqual(['E']);
      expect(graph1.node('b').outs().map(get_key)).toEqual(['f']);
      expect(graph2.node('B').outs().map(get_key)).toEqual(['F']);
    });

    it('nodes have their own in-edges', () => {
      expect(graph1.node('b').ins().map(get_key)).toEqual(['e']);
      expect(graph2.node('B').ins().map(get_key)).toEqual(['E']);
      expect(graph1.node('c').ins().map(get_key)).toEqual(['f']);
      expect(graph2.node('C').ins().map(get_key)).toEqual(['F']);
    });

    it('edges have their own sources', () => {
      expect(graph1.edge('e').source().key()).toEqual('a');
      expect(graph2.edge('E').source().key()).toEqual('A');
    });

    it('edges have their own targets', () => {
      expect(graph1.edge('f').target().key()).toEqual('c');
      expect(graph2.edge('F').target().key()).toEqual('C');
    });

    it('nodes have their own data', () => {
      expect(graph1.node('c').value().n).toEqual(17);
      expect(graph2.node('C').value().n).toEqual(-17);
    });

    it('edges have their own data', () => {
      expect(graph1.edge('f').value().n).toEqual(42);
      expect(graph2.edge('F').value().n).toEqual(-42);
    });
  });

  // Note: Laziness tests with spies are complex to convert and may need the actual pattern implementation
  // to be working first. For now, I'll skip the spy-based tests as they require deeper integration.
  describe('laziness', () => {
    let accessors: any;

    beforeEach(() => {
      accessors = {
        nodeKey: vi.fn((kv: any) => kv.key),
        edgeKey: vi.fn((kv: any) => kv.key),
        nodeValue: vi.fn((kv: any) => kv.value),
        edgeValue: vi.fn((kv: any) => kv.value),
        edgeSource: vi.fn((kv: any) => kv.value.source),
        edgeTarget: vi.fn((kv: any) => kv.value.target)
      };

      graph = pattern(graph_pattern(accessors)).node('Graph').value().create({
        nodes: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c', value: { n: 17 } },
          { key: 'd' }
        ],
        edges: [
          { key: 'e', value: { source: 'a', target: 'b' } },
          { key: 'f', value: { source: 'a', target: 'c', n: 42 } },
          { key: 'g', value: { source: 'c', target: 'd' } }
        ]
      });
    });

    it('instantiation doesn\'t call any accessors', () => {
      expect(accessors.nodeKey).not.toHaveBeenCalled();
      expect(accessors.edgeKey).not.toHaveBeenCalled();
      expect(accessors.nodeValue).not.toHaveBeenCalled();
      expect(accessors.edgeValue).not.toHaveBeenCalled();
      expect(accessors.edgeSource).not.toHaveBeenCalled();
      expect(accessors.edgeTarget).not.toHaveBeenCalled();
    });

    it('calling graph.nodes invokes nodeKey only', () => {
      graph.nodes();
      expect(accessors.nodeKey).toHaveBeenCalled();
      expect(accessors.edgeKey).not.toHaveBeenCalled();
      expect(accessors.nodeValue).not.toHaveBeenCalled();
      expect(accessors.edgeValue).not.toHaveBeenCalled();
      expect(accessors.edgeSource).not.toHaveBeenCalled();
      expect(accessors.edgeTarget).not.toHaveBeenCalled();
    });

    it('calling graph.edges invokes edgeKey only', () => {
      graph.edges();
      expect(accessors.nodeKey).not.toHaveBeenCalled();
      expect(accessors.edgeKey).toHaveBeenCalled();
      expect(accessors.nodeValue).not.toHaveBeenCalled();
      expect(accessors.edgeValue).not.toHaveBeenCalled();
      expect(accessors.edgeSource).not.toHaveBeenCalled();
      expect(accessors.edgeTarget).not.toHaveBeenCalled();
    });
  });
});