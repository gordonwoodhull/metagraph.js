import { describe, it, expectTypeOf } from 'vitest';
import { subgraph_pattern } from '../../src/index.js';

const pattern = subgraph_pattern();

const parentNode = pattern.node('ParentGraph');
const childNode = pattern.node('ChildGraph');

type ParentWrapper = ReturnType<typeof parentNode['value']>;
type ChildWrapper = ReturnType<typeof childNode['value']>;

describe('subgraph_pattern type inference', () => {
  it('ParentGraph.subgraph returns ChildGraph wrapper', () => {
    expectTypeOf<
      ReturnType<ReturnType<ParentWrapper['subgraph']>>
    >().toEqualTypeOf<ChildWrapper>();
  });
});
