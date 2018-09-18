metagraph.subgraph_pattern = function(opts) {
    var options = graph_options(opts);

    return function({parent, child}) {
        return {
            dataflow: {
                incidences: {
                }
            },
            pattern: {
                nodes: {
                    ParentGraph: mg.reference(parent.node('Graph')),
                    ChildGraph: mg.reference(child.node('Graph')),
                    ParentNode: mg.reference(parent.node('Node')),
                    ChildNode: mg.reference(child.node('Node')),
                    ParentEdge: mg.reference(parent.node('Edge')),
                    ChildEdge: mg.reference(child.node('Edge'))
                },
                edges: {
                    subnode: {
                        source: 'ParentNode', target: 'ChildNode',
                        deps: ['node.ParentNode', 'other.NodeKeys'],
                        flow: mg.subset(options.nodeKey)
                    },
                    subedge: {
                        source: 'ParentEdge', target: 'ChildEdge',
                        deps: ['node.ParentEdge', 'other.EdgeKeys'],
                        flow: mg.subset(options.edgeKey)
                    },
                    create: {
                        name: 'subgraph',
                        source: 'ParentGraph', target: 'ChildGraph',
                        member: mg.create_subgraph()
                    }
                }
            }
        };
    };
};
