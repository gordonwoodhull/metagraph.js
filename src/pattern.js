metagraph.pattern = function(types, relations) {
    var graph = mg.graph(types, relations);
    var defn = {node: {}, edge: {}, indices: {}};
    graph.nodes().forEach(function(node) {
        defn.node[node.key()] = {
            members: {}
        };
    });
    graph.edges().forEach(function(edge) {
        edge.value().value.add_members(defn, edge);
    });
    return function(data) {
        var impl = {
            indices: {},
            objects: {},
            data: data
        };
        graph.nodes().forEach(function(node) {
            defn.node[node.key()].wrap = function(val) {
                var wrapper = {};
                Object.keys(defn.node[node.key()].members).forEach(function(member) {
                    wrapper[member] = defn.node[node.key()].members[member](defn, impl, val);
                });
                wrapper.value = function() {
                    return val;
                };
                if(node.value().value.keyFunction)
                    wrapper.key = function() {
                        return node.value().value.keyFunction(val);
                    };
                return wrapper;
            };
            if(node.value().value.single)
                impl.objects[node.key()] = defn.node[node.key()].wrap(data[node.key()]);
        });
        return {
            root: function(key) {
                return impl.objects[key];
            }
        };
    };
};

metagraph.basic_type = function() {
    return {
        single: false
    };
};
metagraph.single_type = function() {
    var spec = mg.basic_type();
    spec.single = true;
    return spec;
};
metagraph.table_type = function(keyf) {
    var spec = mg.basic_type();
    spec.keyFunction = keyf;
    return spec;
};

metagraph.one_to_many = function(spec) {
    spec.add_members = function(defn, edge) {
        var indexKey = edge.key() + '-index';
        defn.indices[indexKey] = function(defn, impl) {
            if(!impl.indices[indexKey])
                impl.indices[indexKey] = build_index(impl.data[edge.target().key()],
                                                     edge.target().value().value.keyFunction,
                                                     defn.node[edge.target().key()].wrap);
            return impl.indices[indexKey];
        };
        if(edge.value().value.source_member)
            defn.node[edge.source().key()].members[edge.value().value.source_member] = function(defn, impl, val) {
                return function(key) {
                    return defn.indices[indexKey](defn, impl)[key];
                };
            };
        if(edge.value().value.target_member)
            defn.node[edge.target().key()].members[edge.value().value.target_member] = function(defn, impl, val) {
                return function() {
                    return impl.objects[edge.source().key()];
                };
            };
    };
    return spec;
};
metagraph.get_table = function(spec) {
    spec.add_members = function(defn, edge) {
        var indexKey = edge.value().value.index + '-index';
        var listKey = edge.key() + '-list';
        defn.indices[listKey] = function(defn, impl) {
            if(!impl.indices[listKey]) {
                var index = defn.indices[indexKey](defn, impl);
                impl.indices[listKey] = impl.data[edge.target().key()].map(function(val) {
                    return index[edge.target().value().value.keyFunction(val)];
                });
            }
            return impl.indices[listKey];
        };
        if(edge.value().value.source_member)
            defn.node[edge.source().key()].members[edge.value().value.source_member] = function(defn, impl, val) {
                return function() {
                    return defn.indices[listKey](defn, impl);
                };
            };
    };
    return spec;
};
metagraph.many_to_one = function(spec) {
    spec.add_members = function(defn, edge) {
        var sourceIndexKey = edge.value().value.source_index + '-index';
        var targetIndexKey = edge.value().value.target_index + '-index';
        var twowayKey = edge.key() + '-twoway';
        defn.indices[twowayKey] = function(defn, impl) {
            if(!impl.indices[twowayKey]) {
                var index = defn.indices[sourceIndexKey](defn, impl);
                impl.indices[twowayKey] = impl.data[edge.source().key()].reduce(function(o, v) {
                    var key = edge.value().value.access(v);
                    var list = o[key] = o[key] || [];
                    list.push(index[edge.source().value().value.keyFunction(v)]);
                    return o;
                }, {});
            }
            return impl.indices[twowayKey];
        };
        if(edge.value().value.source_member)
            defn.node[edge.source().key()].members[edge.value().value.source_member] = function(defn, impl, val) {
                return function() {
                    var index = defn.indices[targetIndexKey](defn, impl);
                    return index[edge.value().value.access(val)];
                };
            };
        if(edge.value().value.target_member)
            defn.node[edge.target().key()].members[edge.value().value.target_member] = function(defn, impl, val) {
                return function() {
                    return defn.indices[twowayKey](defn, impl)[edge.target().value().value.keyFunction(val)];
                };
            };
    };
    return spec;
};
