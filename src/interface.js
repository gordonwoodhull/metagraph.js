metagraph.createable = function(flowkey) {
    return {
        class_members: {
            create: function(flowspec, pnode) {
                return {
                    defn: function(defn) {
                        return function(data) {
                            var impl = {
                                source_data: data
                            };
                            var flow = realize_dataflow(flowspec, pnode.graph(), defn, impl);
                            var env = {};
                            env[flowkey] = defn.node[pnode.key()].wrap(impl, data[pnode.key()]);
                            impl.flow = flow.instantiate(env);
                            return env[flowkey];
                        };
                    }
                };
            }
        }
    };
};
metagraph.call = function(methodname) {
    return function(f) {
        return {
            members: [{
                key: methodname,
                value: function(flowspec, pnode) {
                    return {
                        accessor: f,
                        defn: function(defn, impl, val) {
                            return function() {
                                return f(val);
                            };
                        }
                    };
                }
            }]
        };
    };
};
metagraph.key = mg.call('key');
metagraph.value = mg.call('value');

// interface edges
// metagraph.reference = function(role) {
//     return {
//         single: role.value().single,
//         reference: role
//     };
// };
metagraph.fetch = function() {
    return {
        funfun: function(edge) {
            return function(defn, impl) {
                return function(x) {
                    return function() {
                        return x;
                    };
                };
            };
        }
    };
};
metagraph.lookup = function() {
    return {
        funfun: function(edge) {
            return function(defn, impl, val) {
                return function(map) {
                    return function(key) {
                        return map[key];
                    };
                };
            };
        }
    };
};
metagraph.lookupField = function(access) {
    return {
        funfun: function(edge) {
            return function(defn, impl, val) {
                return function(map) {
                    return function() {
                        return map[access(val)];
                    };
                };
            };
        }
    };
};
metagraph.lookupSource = function() {
    return {
        funfun: function(edge) {
            return function(defn, impl, val) {
                return function(map) {
                    return function() {
                        return map[defn.node[edge.source().key()].members.key.accessor(val)] || [];
                    };
                };
            };
        }
    };
};
metagraph.create_subgraph = function() {
    return {
        funfun: function(edge) {
            return function(defn, impl, val) {
                return function() {
                    return function(nodeKeys, edgeKeys) {
                        edge.target().value().create({
                            ParentNode: impl.source_data[edge.source()],
                            ParentEdge: impl.source_data
                        });
                    };
                };
            };
        }
    };
};

