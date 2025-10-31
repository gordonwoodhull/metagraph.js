import { describe, it, expectTypeOf } from 'vitest';
import { subgraph_pattern } from '../../src/index.js';

const pattern = subgraph_pattern();

const parentNode = pattern.node('ParentGraph');
const childNode = pattern.node('ChildGraph');

type ParentWrapper = ReturnType<typeof parentNode['value']>;
type ChildWrapper = ReturnType<typeof childNode['value']>;
type ParentSubgraphFn = ParentWrapper['subgraph'];
type ChildCreateFn = ChildWrapper['create'];
type ChildPayload = ChildCreateFn extends (payload: infer P) => unknown ? P : never;
type ParentSubnodeFn = ParentWrapper['subnode'];

describe('subgraph_pattern type inference', () => {
  it('ParentGraph.subgraph returns ChildGraph wrapper', () => {
    expectTypeOf<
      ReturnType<ReturnType<ParentWrapper['subgraph']>>
    >().toEqualTypeOf<ChildWrapper>();
  });

  it('ParentGraph.subgraph expects child payload as third argument', () => {
    expectTypeOf<Parameters<ParentSubgraphFn>[2]>().toEqualTypeOf<ChildPayload>();
  });

  it('ParentGraph.subgraph expects node and edge key arrays', () => {
    type SubgraphInvoke = ReturnType<ParentSubgraphFn>;
    expectTypeOf<Parameters<SubgraphInvoke>[0]>().toEqualTypeOf<string[]>();
    expectTypeOf<Parameters<SubgraphInvoke>[1]>().toEqualTypeOf<string[]>();
  });

  it('ParentGraph.subnode maps to ChildGraph node wrappers', () => {
    expectTypeOf<Parameters<ParentSubnodeFn>[0]>().toMatchTypeOf<Record<string, { key: () => string }>>();
    expectTypeOf<ReturnType<ReturnType<ParentSubnodeFn>>>().toMatchTypeOf<{ key: () => string }>();
  });
});
