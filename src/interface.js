metagraph.createable = function(flowkey) {
    return {
        class_members: {
            create: function(flowspec, inode) {
                return {
                    defn: function(defn) {
                        return function(data) {
                            var flowg = realize_dataflow(flowspec, defn, {data: data});
                            var env = {};
                            var flow = flowg.instantiate(env);
                            env[flowkey] = defn.node[inode.key()].wrap(flow, data[inode.key()]);
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
                value: function(flowspec, inode) {
                    return {
                        accessor: f,
                        defn: function(defn, flow, val) {
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
        funfun: function(flowspec, iedge) {
            return function(defn, flow) {
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
        funfun: function(flowspec, iedge) {
            return function(defn, flow, val) {
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
        funfun: function(flowspec, iedge) {
            return function(defn, flow, val) {
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
        funfun: function(flowspec, iedge) {
            return function(defn, flow, val) {
                return function(map) {
                    return function() {
                        return map[defn.node[iedge.source().key()].members.key.accessor(val)] || [];
                    };
                };
            };
        }
    };
};
metagraph.create_subgraph = function() {
    return {
        funfun: function(flowspec, iedge) {
            return function(defn, flow, val) {
                return function() {
                    return function(nodeKeys, edgeKeys) {
                        iedge.target().value().create({
                            ParentNode: impl.source_data[iedge.source()],
                            ParentEdge: impl.source_data
                        });
                    };
                };
            };
        }
    };
};

