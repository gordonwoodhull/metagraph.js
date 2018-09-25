describe('subgraph', function() {
    var mg = metagraph;
    var pattern;
    function get_key(n) {
        return n.key();
    }
    describe('with two graph patterns', function() {
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
            it('edges e,f have graph', function() {
                expect(graph.edge('e').graph()).toBe(graph);
                expect(graph.edge('f').graph()).toBe(graph);
            });
            it('a has outs e,f', function() {
                expect(graph.node('a').outs().map(get_key)).toEqual(['e','f']);
            });
            it('c has out g', function() {
                expect(graph.node('c').outs().map(get_key)).toEqual(['g']);
            });
            it('a has no ins', function() {
                expect(graph.node('a').ins()).toEqual([]);
            });
            it('d has no outs', function() {
                expect(graph.node('d').outs()).toEqual([]);
            });
            it('b has in e', function() {
                expect(graph.node('b').ins().map(get_key)).toEqual(['e']);
            });
            it('f has source a', function() {
                expect(graph.edge('f').source().key()).toEqual('a');
            });
            it('g has target d', function() {
                expect(graph.edge('g').target().key()).toEqual('d');
            });
            it('node c has data', function() {
                expect(graph.node('c').value().n).toEqual(17);
            });
            it('edge f has data', function() {
                expect(graph.edge('f').value().n).toEqual(42);
            });
            describe('subgraph', function() {
                var subgraph;
                beforeEach(function() {
                    subgraph = graph.subgraph(['a','b','c'], ['f','g']);
                });
                it('has nodes a,b,c', function() {
                    expect(subgraph.nodes().map(get_key)).toEqual(['a','b','c']);
                });
                it('has edges f,g', function() {
                    expect(subgraph.edges().map(get_key)).toEqual(['f','g']);
                });
                it('nodes b,c have subgraph', function() {
                    expect(subgraph.node('b').graph()).toBe(subgraph);
                    expect(subgraph.node('c').graph()).toBe(subgraph);
                });
                it('edges f,g have subgraph', function() {
                    expect(subgraph.edge('f').graph()).toBe(subgraph);
                    expect(subgraph.edge('g').graph()).toBe(subgraph);
                });
                it('a has out f', function() {
                    expect(subgraph.node('a').outs().map(get_key)).toEqual(['f']);
                });
                it('c has out g', function() {
                    expect(subgraph.node('c').outs().map(get_key)).toEqual(['g']);
                });
                it('a has no ins', function() {
                    expect(subgraph.node('a').ins()).toEqual([]);
                });
                it('does not have node d', function() {
                    expect(subgraph.node('d')).toBeFalsy();
                });
                it('b has no ins', function() {
                    expect(subgraph.node('b').ins().map(get_key)).toEqual([]);
                });
                it('f has source a', function() {
                    expect(subgraph.edge('f').source().key()).toEqual('a');
                });
                it('does not have edge e', function() {
                    expect(subgraph.edge('e')).toBeFalsy();
                });
                it('node c has data', function() {
                    expect(subgraph.node('c').value().n).toEqual(17);
                });
                it('edge f has data', function() {
                    expect(subgraph.edge('f').value().n).toEqual(42);
                });
                it('edge g has source c', function() {
                    expect(subgraph.edge('g').source().key()).toEqual('c');
                });
                // this is weird
                it('edge g has no target', function() {
                    expect(subgraph.edge('g').target()).toBeFalsy();
                });
                it('can fetch subnode a', function() {
                    var sa = subgraph.subnode(graph.node('a'));
                    expect(sa.key()).toEqual('a');
                    expect(sa.graph()).toBe(subgraph);
                });
                it('cannot fetch subnode d', function() {
                    expect(subgraph.subnode(graph.node('d'))).toBeFalsy();
                });

                describe('of subgraph', function() {
                    var subgraph2;
                    beforeEach(function() {
                        subgraph2 = subgraph.subgraph(['a','b','d'], ['e', 'f']);
                    });
                    it('has only the nodes of parent', function() {
                        expect(subgraph2.nodes().map(get_key)).toEqual(['a','b']);
                    });
                    it('has only the edges of parent', function() {
                        expect(subgraph2.edges().map(get_key)).toEqual(['f']);
                    });
                });
            });
        });
    });
});

