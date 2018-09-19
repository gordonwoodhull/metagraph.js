metagraph.subgraph_pattern = function(opts) {
    var options = graph_options(opts);

    return function({parent, child}) {
        return {
            dataflow: {
                incidences: {
                    parent_nodes: {node: mg.input('parent.nodes')},
                    parent_edges: {node: mg.input('parent.edges')},
                    node_keys: {node: mg.input('nodeKeys')},
                    edge_keys: {node: mg.input('edgeKeys')},
                    subset_nodes: {
                        node: mg.subset(),
                        refs: 'Node',
                        ins: ['parent_nodes', 'node_keys']
                    },
                    subset_edges: {
                        node: mg.subset(),
                        refs: 'Edge',
                        ins: ['parent_edges', 'edge_keys']
                    },
                    nodes: {
                        node: mg.output(),
                        ins: 'subset_nodes'
                    },
                    edges: {
                        node: mg.output(),
                        ins: 'subset_edges'
                    }
                }
            },
            pattern: {
                nodes: {
                    ParentGraph: 'parent.Graph',
                    ChildGraph: 'child.Graph'
                },
                edges: {
                    subgraph: {
                        source: 'ParentGraph', target: 'ChildGraph',
                        dir: 'both',
                        member: mg.subgraph()
                    },
                    subnode: {
                        source: 'ParentGraph', target: 'ChildGraph',
                        dir: 'both',
                        deps: 'child.node_by_key',
                        member: mg.lookup()
                    },
                    subedge: {
                        source: 'ParentGraph', target: 'ChildGraph',
                        dir: 'both',
                        deps: 'child.node_by_key',
                        flow: mg.lookup()
                    },
                }
            }
        };
    };
};
