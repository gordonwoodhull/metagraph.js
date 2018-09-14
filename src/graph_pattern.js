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
        dataflow: {
            incidences: {
                nodes: {node: mg.input()},
                edges: {node: mg.input()},
                node_by_key: {
                    node: mg.map(options.nodeKey),
                    edges: 'nodes'
                },
                edge_by_key: {
                    node: mg.map(options.edgeKey),
                    edges: 'edges'
                },
                graph: mg.singleton(),
                node_list: {
                    node: mg.list(),
                    edges: ['nodes', 'node_by_key']
                },
                node_list: {
                    node: mg.list(),
                    edges: ['edges', 'edge_by_key']
                },
                node_outs: {
                    node: mg.map_of_lists(),
                    edges: ['edges', 'edge_by_key']
                },
                node_ins: {
                    node: mg.map_of_lists(),
                    edges: ['edges', 'edge_by_key']
                }
            }
        },
        pattern: {
            nodes: {
                Graph: mg.createable(),
                Node: [mg.key(options.nodeKey), mg.value(options.nodeValue)],
                Edge: [mg.key(options.edgeKey), mg.value(options.edgeValue)]
            },
            edges: {
                graph_node: {
                    name: 'node',
                    source: 'Graph', target: 'Node',
                    deps: 'node_by_key',
                    member: mg.lookup()
                },
                node_graph: {
                    name: 'graph',
                    source: 'Node', target: 'Graph',
                    deps: 'graph',
                    member: mg.one()
                },
                graph_nodes: {
                    name: 'nodes',
                    source: 'Graph', target: 'Node',
                    deps: 'node_list',
                    member: mg.list()
                },
                graph_edge: {
                    name: 'edge',
                    source: 'Graph', target: 'Edge',
                    deps: 'edge_by_key',
                    member: mg.lookup()
                },
                edge_graph: {
                    name: 'graph',
                    source: 'Edge', target: 'Graph',
                    deps: 'graph',
                    member: mg.one()
                },
                graph_edges: {
                    name: 'edges',
                    source: 'Graph', target: 'Edge',
                    deps: 'edge_list',
                    member: mg.list()
                },
                edge_source: {
                    name: 'source',
                    source: 'Edge', target: 'Node',
                    deps: 'node_by_key',
                    member: mg.lookupFrom(options.edgeSource)
                },
                node_outs: {
                    name: 'outs',
                    source: 'Node', target: 'Edge',
                    deps: 'node_outs',
                    member: mg.listFrom(options.edgeSource)
                },
                edge_target: {
                    name: 'target',
                    source: 'Edge', target: 'Node',
                    deps: 'node_by_key',
                    member: mg.lookupFrom(options.edgeTarget)
                },
                node_ins: {
                    name: 'ins',
                    source: 'Node', target: 'Edge',
                    deps: 'node_ins',
                    member: mg.listFrom(options.edgeTarget)
                }
            }
        }
    };
};
