metagraph.dataflow = function(spec, options) {
    var flowgraph = mg.graph(spec.nodes, spec.edges, options);
    var _flow = {
        create: function(instance) {
            var _inst = {
                calc: function(id) {
                    if(!instance[id]) {
                        var n = flowgraph.node(id);
                        instance[id] = n.value().calc.apply(null, n.ins().map(function(e) {
                            return _inst.calc(e.source().key());
                        }));
                    }
                    return instance[id];
                }
            };
            return _inst;
        }
    };
    return _flow;
};
