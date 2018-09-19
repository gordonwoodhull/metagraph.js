metagraph.subgraph_pattern = function(opts) {
    var options = graph_options(opts);
    return {
        dataflow: {
            incidences: {
                parent_nodes: {node: mg.input('parent.nodes')},
                parent_edges: {node: mg.input('parent.edges')},
                node_keys: {node: mg.input('nodeKeys')},
                edge_keys: {node: mg.input('edgeKeys')},
                subset_nodes: {
                    node: mg.subset(),
                    refs: 'child.Node',
                    ins: ['parent_nodes', 'node_keys']
                },
                subset_edges: {
                    node: mg.subset(),
                    refs: 'child.Edge',
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
        interface: {
            nodes: {
                ParentGraph: 'parent.Graph',
                ChildGraph: 'child.Graph'
            },
            edges: {
                subgraph: {
                    name: 'subgraph',
                    source: 'ParentGraph', target: 'ChildGraph',
                    dir: 'both',
                    member: mg.subgraph()
                },
                subnode: {
                    name: 'subnode',
                    source: 'ParentGraph', target: 'ChildGraph',
                    dir: 'both',
                    deps: 'child.node_by_key',
                    member: mg.lookup()
                },
                subedge: {
                    name: 'subedge',
                    source: 'ParentGraph', target: 'ChildGraph',
                    dir: 'both',
                    deps: 'child.edge_by_key',
                    flow: mg.lookup()
                }
            }
        }
    };
};
