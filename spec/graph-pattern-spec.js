describe('graph_pattern', function() {
    var graph;

    function get_key(n) {
        return n.key();
    }
    describe('adcdefg', function() {
        beforeEach(function() {
            graph = metagraph.pattern(metagraph.graph_pattern())({
                Graph: {},
                Node: [
                    {key: 'a'},
                    {key: 'b'},
                    {key: 'c', value: {n: 17}},
                    {key: 'd'}
                ],
                Edge: [
                    {key: 'e', value: {source: 'a', target: 'b'}},
                    {key: 'f', value: {source: 'a', target: 'c', n: 42}},
                    {key: 'g', value: {source: 'c', target: 'd'}}
                ]
            }).root('Graph');
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
    });
});
