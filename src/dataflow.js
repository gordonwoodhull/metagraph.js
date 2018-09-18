metagraph.dataflow = function(spec, options) {
    var flowgraph = mg.graph_detect(spec, options);
    var _flow = {
        instantiate: function(instance, inputs) {
            var _inst = {
                calc: function(id) {
                    if(!instance[id]) {
                        var n = flowgraph.node(id);
                        instance[id] = n.value().calc.apply(_inst, n.ins().map(function(e) {
                            return _inst.calc(e.source().key());
                        }));
                        console.assert(instance[id]);
                    }
                    return instance[id];
                },
                input: function(namespace, field) {
                    return inputs[namespace][field];
                }
            };
            return _inst;
        }
    };
    return _flow;
};
