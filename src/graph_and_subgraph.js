var graph_and_subgraph = {
    nodes: {
        graph: mg.graph_pattern(),
        sg: mg.subgraph_pattern(),
        subgraph: mg.graph_pattern()
    },
    edges: {
        to_sg: {
            source: 'graph',
            target: 'sg',
            input: 'parent'
        },
        from_sg: {
            source: 'subgraph',
            target: 'sg',
            input: 'child'
        }
    }
};
