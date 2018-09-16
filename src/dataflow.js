metagraph.dataflow = function(spec, options) {
    var flowgraph = mg.graph_detect(spec, options);
    var _flow = {
        instantiate: function(instance) {
            var _inst = {
                calc: function(id) {
                    if(!instance[id]) {
                        var n = flowgraph.node(id);
                        instance[id] = n.value().calc.apply(null, n.ins().map(function(e) {
                            return _inst.calc(e.source().key());
                        }));
                        console.assert(instance[id]);
                    }
                    return instance[id];
                }
            };
            return _inst;
        }
    };
    return _flow;
};
