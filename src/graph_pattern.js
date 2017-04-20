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
                name: 'node',
                source: 'Graph', target: 'Node',
                deps: 'node.Node',
                member: mg.lookup()
            },
            node_graph: {
                name: 'graph',
                source: 'Node', target: 'Graph',
                member: mg.one()
            },
            graph_nodes: {
                name: 'nodes',
                source: 'Graph', target: 'Node',
                deps: ['node.Node', 'graph_node'],
                member: mg.list()
            },
            graph_edge: {
                name: 'edge',
                source: 'Graph', target: 'Edge',
                deps: 'node.Edge',
                member: mg.lookup()
            },
            edge_graph: {
                name: 'graph',
                source: 'Edge', target: 'Graph',
                member: mg.one()
            },
            graph_edges: {
                name: 'edges',
                source: 'Graph', target: 'Edge',
                deps: ['node.Edge', 'graph_edge'],
                member: mg.list()
            },
            edge_source: {
                name: 'source',
                source: 'Edge', target: 'Node',
                deps: 'graph_node',
                member: mg.lookupFrom(options.edgeSource)
            },
            node_outs: {
                name: 'outs',
                source: 'Node', target: 'Edge',
                deps: ['node.Edge', 'graph_edge'],
                member: mg.listFrom(options.edgeSource)
            },
            edge_target: {
                name: 'target',
                source: 'Edge', target: 'Node',
                deps: 'graph_node',
                member: mg.lookupFrom(options.edgeTarget)
            },
            node_ins: {
                name: 'ins',
                source: 'Node', target: 'Edge',
                deps: ['node.Edge', 'graph_edge'],
                member: mg.listFrom(options.edgeTarget)
            }
        }};
};
