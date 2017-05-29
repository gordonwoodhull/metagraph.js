metagraph.subgraph_pattern = function(options) {
    options = Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
        nodeValue: function(kv) { return kv.value; },
        edgeValue: function(kv) { return kv.value; },
        edgeSource: function(kv) { return kv.value.source; },
        edgeTarget: function(kv) { return kv.value.target; }
    }, options || {});

    return function({parent, child}) {
        return {
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
                    flow: mg.select(options.nodeKey)
                },
                subedge: {
                    source: 'ParentEdge', target: 'ChildEdge',
                    deps: ['node.ParentEdge', 'other.EdgeKeys'],
                    flow: mg.select(options.edgeKey)
                },
                create: {
                    name: 'subgraph',
                    source: 'ParentGraph', target: 'ChildGraph',
                    member: mg.create_subgraph()
                }
            }
        };
    };
};
