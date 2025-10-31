import { describe, it, expectTypeOf } from 'vitest';
import { graph_pattern } from '../../src/index.js';

const graph = graph_pattern();

const graphNode = graph.node('Graph');
const nodeNode = graph.node('Node');
const edgeNode = graph.node('Edge');

type GraphWrapper = ReturnType<typeof graphNode['value']>;
type NodeWrapper = ReturnType<typeof nodeNode['value']>;
type EdgeWrapper = ReturnType<typeof edgeNode['value']>;
type NodeOuts = ReturnType<NodeWrapper['outs']>;
type NodeGraph = ReturnType<NodeWrapper['graph']>;
type NodeNodeLookup = ReturnType<NodeWrapper['node']>;
type GraphNodeLookup = ReturnType<ReturnType<GraphWrapper['node']>>;
type NodeOutsMap = Parameters<NodeWrapper['outs']>[0];
type GraphNodeMap = Parameters<GraphWrapper['node']>[0];

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

  it('Node.outs returns Edge wrapper array', () => {
    expectTypeOf<NodeOuts>().toEqualTypeOf<EdgeWrapper[]>();
  });

  it('Node.graph returns Graph wrapper', () => {
    expectTypeOf<ReturnType<NodeGraph>>().toEqualTypeOf<GraphWrapper>();
  });

  it('Graph.node lookup returns Node wrapper', () => {
    expectTypeOf<GraphNodeLookup>().toEqualTypeOf<NodeWrapper>();
  });

  it('Graph.node lookup map parameter is keyed by string with Node wrapper values', () => {
    expectTypeOf<GraphNodeMap>().toEqualTypeOf<Record<string, NodeWrapper>>();
  });

  it('Node.outs map parameter is keyed by string with Edge wrapper arrays', () => {
    expectTypeOf<NodeOutsMap>().toEqualTypeOf<Record<string, EdgeWrapper[]>>();
  });
});
