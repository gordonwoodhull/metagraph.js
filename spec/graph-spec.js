describe('graph', function() {
    var graph;
    var nodes, edges;

    function Name(n) {
        return n.name();
    }
    describe('adcdefg', function() {
        beforeEach(function() {
            nodes = [
                {key: 'a'},
                {key: 'b'},
                {key: 'c'},
                {key: 'd'}
            ];
            edges = [
                {key: 'e', value: {source: 'a', target: 'b'}},
                {key: 'f', value: {source: 'a', target: 'c'}},
                {key: 'g', value: {source: 'c', target: 'd'}}
            ];
            graph = metagraph.graph(nodes, edges);
        });
        it('has nodes a,b,c', function() {
            expect(graph.nodes().map(Name)).toEqual(['a','b','c','d']);
        });
        it('has edges e,f,g', function() {
            expect(graph.edges().map(Name)).toEqual(['e','f','g']);
        });
        it('a has outs e,f', function() {
            expect(graph.node('a').outs().map(Name)).toEqual(['e','f']);
        });
        it('c has out g', function() {
            expect(graph.node('c').outs().map(Name)).toEqual(['g']);
        });
        it('b has in e', function() {
            expect(graph.node('b').ins().map(Name)).toEqual(['e']);
        });
        it('f has source a', function() {
            expect(graph.edge('f').source().name()).toEqual('a');
        });
        it('g has target d', function() {
            expect(graph.edge('g').target().name()).toEqual('d');
        });
    });
});

