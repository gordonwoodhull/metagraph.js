describe('subgraph', function() {
    var mg = metagraph;
    var pattern;
    function get_key(n) {
        return n.key();
    }
    describe('with two graphs', function() {
        beforeEach(function() {
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
            pattern = mg.compose(mg.graph_detect(graph_and_subgraph));
        });
        describe('instantiated from graph data', function() {
            var graph;
            beforeEach(function() {
                graph = pattern.node('graph.Graph').value().create({
                    nodes: [
                        {key: 'a'},
                        {key: 'b'},
                        {key: 'c', value: {n: 17}},
                        {key: 'd'}
                    ],
                    edges: [
                        {key: 'e', value: {source: 'a', target: 'b'}},
                        {key: 'f', value: {source: 'a', target: 'c', n: 42}},
                        {key: 'g', value: {source: 'c', target: 'd'}}
                    ]
                });
            });
            it('has nodes a,b,c,d', function() {
                expect(graph.nodes().map(get_key)).toEqual(['a','b','c','d']);
            });
            it('has edges e,f,g', function() {
                expect(graph.edges().map(get_key)).toEqual(['e','f','g']);
            });
            it('nodes b,c have graph', function() {
                expect(graph.node('b').graph()).toBe(graph);
                expect(graph.node('c').graph()).toBe(graph);
            });
        });
    });
});
