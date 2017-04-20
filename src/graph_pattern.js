metagraph.graph_pattern = function(options) {
    options = Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
        nodeValue: function(kv) { return kv.value; },
        edgeValue: function(kv) { return kv.value; },
        edgeSource: function(kv) { return kv.value.source; },
        edgeTarget: function(kv) { return kv.value.target; }
    }, options || {});

    return {
        nodes: {
            Graph: mg.single_type(),
            Node: mg.table_type(options.nodeKey, options.nodeValue),
            Edge: mg.table_type(options.edgeKey, options.edgeValue)
        },
        edges: {
            graph_node: {
                source: 'Graph', target: 'Node',
                deps: 'node.Node',
                member: mg.lookup('node')
            },
            node_graph: {
                source: 'Node', target: 'Graph',
                member: mg.one('graph')
            },
            graph_nodes: {
                source: 'Graph', target: 'Node',
                deps: ['node.Node', 'graph_node'],
                member: mg.list('nodes')
            },
            graph_edge: {
                source: 'Graph', target: 'Edge',
                deps: 'node.Edge',
                member: mg.lookup('edge')
            },
            edge_graph: {
                source: 'Edge', target: 'Graph',
                member: mg.one('graph')
            },
            graph_edges: {
                source: 'Graph', target: 'Edge',
                deps: ['node.Edge', 'graph_edge'],
                member: mg.list('edges')
            },
            edge_source: {
                source: 'Edge', target: 'Node',
                deps: 'graph_node',
                member: mg.lookupFrom('source', options.edgeSource)
            },
            node_outs: {
                source: 'Node', target: 'Edge',
                deps: ['node.Edge', 'graph_edge'],
                member: mg.listFrom('outs', options.edgeSource)
            },
            edge_target: {
                source: 'Edge', target: 'Node',
                deps: 'graph_node',
                member: mg.lookupFrom('target', options.edgeTarget)
            },
            node_ins: {
                source: 'Node', target: 'Edge',
                deps: ['node.Edge', 'graph_edge'],
                member: mg.listFrom('ins', options.edgeTarget)
            }
        }};
};
