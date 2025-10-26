import { describe, it, expect, beforeEach } from 'vitest';
import {
  compose,
  graph_detect,
  graphPatternSpec,
  defaultGraphPatternAccessors,
  subgraphPatternSpec,
  defaultSubgraphAccessors
} from '../src/index.js';

describe('subgraph', () => {
  let pattern;

  const get_key = (n: any) => n.key();

  describe('with two graph patterns', () => {
    beforeEach(() => {
      const graph_and_subgraph = {
        nodes: {
          graph: {
            spec: graphPatternSpec,
            accessors: defaultGraphPatternAccessors()
          },
          sg: {
            spec: subgraphPatternSpec,
            accessors: defaultSubgraphAccessors()
          },
          subgraph: {
            spec: graphPatternSpec,
            accessors: defaultGraphPatternAccessors()
          }
        },
        edges: {
          to_sg: {
            source: 'graph',
            target: 'sg',
            input: 'parent'
          },
          from_sg: {
            source: 'subgraph',
            target: 'sg',
            input: 'child'
          }
        }
      };
      pattern = compose(graph_detect(graph_and_subgraph));
    });

    describe('instantiated from graph data', () => {
      let graph: any;

      beforeEach(() => {
        graph = pattern.node('graph.Graph').value().create({
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

      describe('subgraph', () => {
        let subgraph: any;

        beforeEach(() => {
          subgraph = graph.subgraph(['a', 'b', 'c'], ['f', 'g']);
        });

        it('has nodes a,b,c', () => {
          expect(subgraph.nodes().map(get_key)).toEqual(['a', 'b', 'c']);
        });

        it('has edges f,g', () => {
          expect(subgraph.edges().map(get_key)).toEqual(['f', 'g']);
        });

        it('nodes b,c have subgraph', () => {
          expect(subgraph.node('b').graph()).toBe(subgraph);
          expect(subgraph.node('c').graph()).toBe(subgraph);
        });

        it('edges f,g have subgraph', () => {
          expect(subgraph.edge('f').graph()).toBe(subgraph);
          expect(subgraph.edge('g').graph()).toBe(subgraph);
        });

        it('a has out f', () => {
          expect(subgraph.node('a').outs().map(get_key)).toEqual(['f']);
        });

        it('c has out g', () => {
          expect(subgraph.node('c').outs().map(get_key)).toEqual(['g']);
        });

        it('a has no ins', () => {
          expect(subgraph.node('a').ins()).toEqual([]);
        });

        it('does not have node d', () => {
          expect(subgraph.node('d')).toBeFalsy();
        });

        it('b has no ins', () => {
          expect(subgraph.node('b').ins().map(get_key)).toEqual([]);
        });

        it('f has source a', () => {
          expect(subgraph.edge('f').source().key()).toEqual('a');
        });

        it('does not have edge e', () => {
          expect(subgraph.edge('e')).toBeFalsy();
        });

        it('node c has data', () => {
          expect(subgraph.node('c').value().n).toEqual(17);
        });

        it('edge f has data', () => {
          expect(subgraph.edge('f').value().n).toEqual(42);
        });

        it('edge g has source c', () => {
          expect(subgraph.edge('g').source().key()).toEqual('c');
        });

        // this is weird
        it('edge g has no target', () => {
          expect(subgraph.edge('g').target()).toBeFalsy();
        });

        it('can fetch subnode a', () => {
          const sa = subgraph.subnode(graph.node('a'));
          expect(sa.key()).toEqual('a');
          expect(sa.graph()).toBe(subgraph);
        });

        it('cannot fetch subnode d', () => {
          expect(subgraph.subnode(graph.node('d'))).toBeFalsy();
        });

        describe('of subgraph', () => {
          let subgraph2: any;

          beforeEach(() => {
            subgraph2 = subgraph.subgraph(['a', 'b', 'd'], ['e', 'f']);
          });

          it('has only the nodes of parent', () => {
            expect(subgraph2.nodes().map(get_key)).toEqual(['a', 'b']);
          });

          it('has only the edges of parent', () => {
            expect(subgraph2.edges().map(get_key)).toEqual(['f']);
          });
        });
      });
    });
  });
});
