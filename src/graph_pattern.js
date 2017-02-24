metagraph.graph_pattern = function(options) {
    options = Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
        edgeSource: function(kv) { return kv.value.source; },
        edgeTarget: function(kv) { return kv.value.target; }
    }, options || {});

    return mg.pattern({
        Graph: mg.single_type(),
        Node: mg.table_type(options.nodeKey),
        Edge: mg.table_type(options.edgeKey)
    }, {
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
            source_member: 'source', target_member: 'outs',
            access: options.edgeSource, source_index: 'graph_edge', target_index: 'graph_node'
        }),
        edge_target: mg.many_to_one({
            source: 'Edge', target: 'Node',
            source_member: 'target', target_member: 'ins',
            access: options.edgeTarget, source_index: 'graph_edge', target_index: 'graph_node'
        })
    });
};
