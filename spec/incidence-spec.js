describe('incidences', function() {
    var graph;
    var nodes, edges;

    function get_key(n) {
        return n.key();
    }
    describe('adcdefg edges implicit outward', function() {
        beforeEach(function() {
            nodes = [
                {key: 'a', value: {edges: ['b', 'c']}},
                {key: 'b'},
                {key: 'c', value: {n: 17, edges: 'd'}},
                {key: 'd'}
            ];
            graph = metagraph.graph_incidence(nodes);
        });
        it('has nodes a,b,c,d', function() {
            expect(graph.nodes().map(get_key)).toEqual(['a','b','c','d']);
        });
        it('has edges a-b,a-c,c-d', function() {
            expect(graph.edges().map(get_key)).toEqual(['a-b','a-c','c-d']);
        });
        it('nodes b,c have graph', function() {
            expect(graph.node('b').graph()).toBe(graph);
            expect(graph.node('c').graph()).toBe(graph);
        });
        it('edges a-b,a-c have graph', function() {
            expect(graph.edge('a-b').graph()).toBe(graph);
            expect(graph.edge('a-c').graph()).toBe(graph);
        });
        it('a has outs a-b,a-c', function() {
            expect(graph.node('a').outs().map(get_key)).toEqual(['a-b','a-c']);
        });
        it('c has out c-d', function() {
            expect(graph.node('c').outs().map(get_key)).toEqual(['c-d']);
        });
        it('a has no ins', function() {
            expect(graph.node('a').ins()).toEqual([]);
        });
        it('d has no outs', function() {
            expect(graph.node('d').outs()).toEqual([]);
        });
        it('b has in a-b', function() {
            expect(graph.node('b').ins().map(get_key)).toEqual(['a-b']);
        });
        it('a-b has source a', function() {
            expect(graph.edge('a-b').source().key()).toEqual('a');
        });
        it('c-d has target d', function() {
            expect(graph.edge('c-d').target().key()).toEqual('d');
        });
        it('node c has data', function() {
            expect(graph.node('c').value().n).toEqual(17);
        });
        it('edges only have source,target as data', function() {
            graph.edges().forEach(function(e) {
                expect(Object.keys(e.value())).toEqual(['source', 'target']);
            });
        });
    });
});

