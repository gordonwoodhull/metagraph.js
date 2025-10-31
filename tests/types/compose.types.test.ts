import { describe, it, expectTypeOf } from 'vitest';
import {
  compose,
  graphPatternSpec,
  defaultGraphPatternAccessors,
  subgraphPatternSpec,
  defaultSubgraphAccessors
} from '../../src/index.js';

const graphAccessors = defaultGraphPatternAccessors();
const subgraphAccessors = defaultSubgraphAccessors();

const composition = {
  nodes: {
    graph: {
      spec: graphPatternSpec,
      accessors: graphAccessors
    },
    sg: {
      spec: subgraphPatternSpec,
      accessors: subgraphAccessors
    },
    subgraph: {
      spec: graphPatternSpec,
      accessors: graphAccessors
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
} as const;

const pattern = compose(composition);

const parentNode = pattern.node('graph.Graph');
const childNode = pattern.node('subgraph.Graph');
const sgParentNode = pattern.node('sg.ParentGraph');

type ParentWrapper = ReturnType<typeof parentNode['value']>;
type ChildWrapper = ReturnType<typeof childNode['value']>;
type SgParentWrapper = ReturnType<typeof sgParentNode['value']>;

describe('compose type inference', () => {
  it('ParentGraph.subgraph returns ChildGraph wrapper', () => {
    expectTypeOf<
      ReturnType<ReturnType<ParentWrapper['subgraph']>>
    >().toEqualTypeOf<ChildWrapper>();
  });

  it('sg.ParentGraph reuses subgraph wiring', () => {
    expectTypeOf<
      ReturnType<ReturnType<SgParentWrapper['subgraph']>>
    >().toEqualTypeOf<ChildWrapper>();
    expectTypeOf<Parameters<SgParentWrapper['subgraph']>[2]>().toEqualTypeOf<Parameters<ParentWrapper['subgraph']>[2]>();
  });
});
