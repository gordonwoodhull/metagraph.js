metagraph.graph_pattern = function(options) {
    options = Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
        edgeSource: function(kv) { return kv.value.source; },
        edgeTarget: function(kv) { return kv.value.target; }
    }, options || {});

    return {
        nodes: {
            Graph: mg.single_type(),
            Node: mg.table_type(options.nodeKey),
            Edge: mg.table_type(options.edgeKey)
        },
        edges: {
            graph_node: mg.one_to_many({
                source: 'Graph', target: 'Node',
                source_member: 'node', target_member: 'graph'
            }),
            graph_nodes: mg.get_table({
                source: 'Graph', target: 'Node',
                source_member: 'nodes', index: 'graph_node'
            }),
            graph_edge: mg.one_to_many({
                source: 'Graph', target: 'Edge',
                source_member: 'edge', target_member: 'graph'
            }),
            graph_edges: mg.get_table({
                source: 'Graph', target: 'Edge',
                source_member: 'edges', index: 'graph_edge'
            }),
            edge_source: mg.many_to_one({
                source: 'Edge', target: 'Node',
                source_member: 'source', source_deps: 'graph_node',
                target_member: 'outs', target_deps: 'graph_edge',
                access: options.edgeSource
            }),
            edge_target: mg.many_to_one({
                source: 'Edge', target: 'Node',
                source_member: 'target', source_deps: 'graph_node',
                target_member: 'ins', target_deps: 'graph_edge',
                access: options.edgeTarget
            })
        }};
};
