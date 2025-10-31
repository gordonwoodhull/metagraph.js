import { describe, it, expectTypeOf } from 'vitest';
import { graph_pattern } from '../../src/index.js';

const graph = graph_pattern();

const graphNode = graph.node('Graph');
const nodeNode = graph.node('Node');
const edgeNode = graph.node('Edge');

type GraphWrapper = ReturnType<typeof graphNode['value']>;
type NodeWrapper = ReturnType<typeof nodeNode['value']>;
type EdgeWrapper = ReturnType<typeof edgeNode['value']>;

describe('graph_pattern type inference', () => {
  it('Graph.nodes returns Node wrappers', () => {
    expectTypeOf<ReturnType<ReturnType<GraphWrapper['nodes']>>>().toEqualTypeOf<NodeWrapper[]>();
  });

  it('Node.key returns string', () => {
    expectTypeOf<ReturnType<ReturnType<NodeWrapper['key']>>>().toEqualTypeOf<string>();
  });

  it('Edge.source returns Node wrapper', () => {
    expectTypeOf<ReturnType<ReturnType<EdgeWrapper['source']>>>().toEqualTypeOf<NodeWrapper>();
  });
});
