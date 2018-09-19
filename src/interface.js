metagraph.createable = function(flowkey) {
    return {
        class_members: {
            create: function(flowspec, inode) {
                return {
                    defn: function(defn) {
                        var flowg = define_dataflow(flowspec, defn);
                        return function(data) {
                            var env = {};
                            var flow = flowg.instantiate(env, {data: data});
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
metagraph.reference = function(inode) {
    return {
        reference: inode
    };
};
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
metagraph.subgraph = function() {
    return {
        funfun: function(flowspec, iedge, flowspecs) {
            return function(defn, flow, val) {
                var subflow = define_dataflow(flowspec, defn), graflow = subflow;
                var parts = iedge.target().key().split('.');
                if(parts.length > 1) {
                    var dest = parts[0];
                    graflow = define_dataflow(flowspecs[dest], defn);
                }
                return function() {
                    return function(nodeKeys, edgeKeys, gdata) {
                        // two environments, one for the sub-pattern and one for the graph pattern
                        var sgflow = subflow.instantiate({}, {
                            data: {
                                nodeKeys: nodeKeys,
                                edgeKeys: edgeKeys
                            },
                            parent: flow});
                        var genv = {};
                        var gflow = graflow.instantiate(genv, {
                            data: sgflow
                        });
                        genv.graph = defn.node[iedge.target().key()].wrap(gflow, gdata);
                        return genv.graph;
                    };
                };
            };
        }
    };
};

