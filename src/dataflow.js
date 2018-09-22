metagraph.dataflow = function(spec, options) {
    var flowgraph = mg.graph_detect(spec, options);
    var _flow = {
        instantiate: function(instance, inputs) {
            var _inst = {
                _yes_i_am_really_dataflow: true,
                calc: function(id) {
                    if(!instance[id]) {
                        var n = flowgraph.node(id);
                        instance[id] = n.value().calc(_inst).apply(null, n.ins().map(function(e) {
                            return _inst.calc(e.source().key());
                        }));
                        console.assert(instance[id]);
                    }
                    return instance[id];
                },
                input: function(namespace, field) {
                    var input = inputs[namespace];
                    if(input._yes_i_am_really_dataflow)
                        return input.calc(field);
                    else return input[field];
                }
            };
            return _inst;
        }
    };
    return _flow;
};
