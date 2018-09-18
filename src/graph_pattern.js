metagraph.graph_pattern = function(opts) {
    var options = graph_options(opts);
    return {
        dataflow: {
            incidences: {
                nodes: {node: mg.input()},
                edges: {node: mg.input()},
                node_by_key: {
                    node: mg.map(),
                    refs: 'Node',
                    ins: 'nodes'
                },
                edge_by_key: {
                    node: mg.map(),
                    refs: 'Edge',
                    ins: 'edges'
                },
                graph: {node: mg.singleton()},
                node_list: {
                    node: mg.list(),
                    refs: 'Node',
                    ins: ['nodes', 'node_by_key']
                },
                edge_list: {
                    node: mg.list(),
                    refs: 'Edge',
                    ins: ['edges', 'edge_by_key']
                },
                node_outs: {
                    node: mg.map_of_lists(options.edgeSource),
                    refs: 'Node',
                    ins: ['edges', 'edge_by_key']
                },
                node_ins: {
                    node: mg.map_of_lists(options.edgeTarget),
                    refs: 'Node',
                    ins: ['edges', 'edge_by_key']
                }
            }
        },
        interface: {
            nodes: {
                Graph: mg.createable('graph'),
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
                    member: mg.fetch()
                },
                graph_nodes: {
                    name: 'nodes',
                    source: 'Graph', target: 'Node',
                    deps: 'node_list',
                    member: mg.fetch()
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
                    member: mg.fetch()
                },
                graph_edges: {
                    name: 'edges',
                    source: 'Graph', target: 'Edge',
                    deps: 'edge_list',
                    member: mg.fetch()
                },
                edge_source: {
                    name: 'source',
                    source: 'Edge', target: 'Node',
                    deps: 'node_by_key',
                    member: mg.lookupField(options.edgeSource)
                },
                edge_target: {
                    name: 'target',
                    source: 'Edge', target: 'Node',
                    deps: 'node_by_key',
                    member: mg.lookupField(options.edgeTarget)
                },
                node_outs: {
                    name: 'outs',
                    source: 'Node', target: 'Edge',
                    deps: 'node_outs',
                    member: mg.lookupSource()
                },
                node_ins: {
                    name: 'ins',
                    source: 'Node', target: 'Edge',
                    deps: 'node_ins',
                    member: mg.lookupSource()
                }
            }
        }
    };
};
