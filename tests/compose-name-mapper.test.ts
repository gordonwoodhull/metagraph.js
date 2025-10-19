import { describe, it, expect } from 'vitest';
import { graph_pattern, subgraph_pattern, graph_detect } from '../src/index.js';
import { createNameMapper } from '../src/compose_name_mapper.js';

describe('compose name mapper', () => {
  const composition = graph_detect({
    nodes: {
      graph: graph_pattern(),
      sg: subgraph_pattern(),
      subgraph: graph_pattern()
    },
    edges: {
      to_sg: { source: 'graph', target: 'sg', input: 'parent' },
      from_sg: { source: 'subgraph', target: 'sg', input: 'child' }
    }
  });

  const mapName = createNameMapper(composition);

  it('maps local names', () => {
    expect(mapName('sg', 'node_by_key')).toEqual('sg.node_by_key');
  });

  it('maps alias names to upstream pattern', () => {
    expect(mapName('sg', 'parent.node_by_key')).toEqual('graph.node_by_key');
    expect(mapName('sg', 'child.node_by_key')).toEqual('subgraph.node_by_key');
  });

  it('leaves global names unchanged', () => {
    expect(mapName('sg', 'graph.node_by_key')).toEqual('graph.node_by_key');
  });
});
