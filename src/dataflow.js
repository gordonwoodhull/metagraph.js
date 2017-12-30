metagraph.dataflow = function(spec, options) {
    var flow = mg.graph(spec.nodes, spec.edges, options);
    return {
        calc: function(id) {
            var that = this;
            var n = flow.node(id);
            if(!n.value().result)
                n.value().result = n.value().calc.apply(null, n.ins().map(function(e) {
                    return that.calc(e.source().key());
                }));
            return n.value().result;
        }
    };
};
