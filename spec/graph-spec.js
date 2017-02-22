describe('graph', function() {
    var graph;
    var nodes, edges;

    function Name(n) {
        return n.name();
    }
    it('js has Object.assign', function() {
        expect(Object.assign).not.toBeNull();
    });
    describe('adcef', function() {
        beforeEach(function() {
            nodes = [
                {key: 'a'},
                {key: 'b'},
                {key: 'c'}
            ];
            edges = [
                {key: 'e', value: {sourcename: 'a', targetname: 'b'}},
                {key: 'f', value: {sourcename: 'a', targetname: 'c'}}
            ];
            graph = metagraph.graph(nodes, edges);
        });
        it('has nodes abc', function() {
            expect(graph.nodes().map(Name)).toEqual(['a','b','c']);
        });
    });
});

