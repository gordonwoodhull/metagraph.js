describe('dataflow', function() {
    var graph;

    function get_key(n) {
        return n.key();
    }
    // use non-standard data shape to test accessor use
    var access = {
        nodeKey: n=>n.id,
        nodeValue: n=>n,
        edgeKey: e=>e.id,
        edgeValue: e=>e,
        edgeSource: e=>e.tail,
        edgeTarget: e=>e.head
    };
    describe('arithmetic', function() {
        function add(a, b) {
            return a+b;
        }
        function subtract(a, b) {
            return a-b;
        }
        function multiply(a, b) {
            return a*b;
        }
        function divide(a, b) {
            return a/b;
        }
        var spec = {
            nodes: [
                {id: 'one', result: 1},
                {id: 'two', result: 2},
                {id: 'three', result: 3},
                {id: 'one+one', calc: add},
                {id: 'two*three', calc: multiply},
                {id: 'two*three/(one+one)', calc: divide}
            ],
            edges: [
                {id: 'a', tail: 'one', head: 'one+one'},
                {id: 'b', tail: 'one', head: 'one+one'},
                {id: 'c', tail: 'two', head: 'two*three'},
                {id: 'd', tail: 'three', head: 'two*three'},
                {id: 'e', tail: 'two*three', head: 'two*three/(one+one)'},
                {id: 'f', tail: 'one+one', head: 'two*three/(one+one)'}
            ]
        };
        var arithflow;
        beforeEach(function() {
            arithflow = metagraph.dataflow(spec, access);
        });
        describe('from head', function() {
            it('results in 3', function() {
                expect(arithflow.calc('two*three/(one+one)')).toBe(3);
            });
        });
    });
});
