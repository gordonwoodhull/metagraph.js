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
                {id: 'a'},
                {id: 'b'},
                {id: 'c'},
                {id: 'a+a', calc: add},
                {id: 'b*c', calc: multiply},
                {id: 'b*c/(a+a)', calc: divide}
            ],
            edges: [
                {id: 'a', tail: 'a', head: 'a+a'},
                {id: 'b', tail: 'a', head: 'a+a'},
                {id: 'c', tail: 'b', head: 'b*c'},
                {id: 'd', tail: 'c', head: 'b*c'},
                {id: 'e', tail: 'b*c', head: 'b*c/(a+a)'},
                {id: 'f', tail: 'a+a', head: 'b*c/(a+a)'}
            ]
        };
        var arithflow;
        beforeEach(function() {
            arithflow = metagraph.dataflow(spec, access);
        });
        describe('with 1,2,3', function() {
            var inst = {a: 1, b: 2, c: 3};
            it('results in 3', function() {
                expect(arithflow.instantiate(inst).calc('b*c/(a+a)')).toBe(3);
            });
        });
        describe('with 2,8,8.5', function() {
            var inst = {a: 2, b: 8, c: 8.5};
            it('results in 17', function() {
                expect(arithflow.instantiate(inst).calc('b*c/(a+a)')).toBe(17);
            });
        });
    });
});
