metagraph.input = function(path) {
    return {
        calc: function(fnode) {
            path = path || fnode.key();
            var parts = path.split('.');
            var [namespace, name] = parts.length > 1 ? parts : ['data', path];
            return function(defn) {
                return function(flow) {
                    return function() {
                        return flow.input(namespace, name);
                    };
                };
            };
        }
    };
};
// pass-through
metagraph.output = function(name, namespace) {
    return {
        calc: function(fnode) {
            return function(defn) {
                return function(flow) {
                    return function(x) {
                        return x;
                    };
                };
            };
        }
    };
};
metagraph.map = function() {
    return {
        calc: function(fnode) {
            var iref = as_array(fnode.value().refs)[0];
            return function(defn) {
                return function(flow) {
                    return function(data) {
                        return build_map(data,
                                         defn.node[iref].members.key.accessor,
                                         defn.node[iref].wrap.bind(null, flow));
                    };
                };
            };
        }
    };
};
metagraph.singleton = function() {
    return {
        calc: function(fnode) {
            return function(defn) {
                return function(flow) {
                    return function() {
                        throw new Error('singleton not initialized');
                    };
                };
            };
        }
    };
};
metagraph.list = function() {
    return {
        calc: function(fnode) {
            var iref = as_array(fnode.value().refs)[0];
            return function(defn) {
                return function(flow) {
                    return function(data, map) {
                        return data.map(function(val) {
                            return map[defn.node[iref].members.key.accessor(val)];
                        });
                    };
                };
            };
        }
    };
};
metagraph.map_of_lists = function(accessor) {
    return {
        calc: function(fnode) {
            return function(defn) {
                return function(flow) {
                    return function(data, map) {
                        var iref = as_array(fnode.value().refs)[0];
                        return data.reduce(function(o, v) {
                            var key = accessor(v);
                            var list = o[key] = o[key] || [];
                            list.push(map[defn.node[iref].members.key.accessor(v)]);
                            return o;
                        }, {});
                    };
                };
            };
        }
    };
};
metagraph.subset = function() {
    return {
        calc: function(fnode) {
            var iref = as_array(fnode.value().refs)[0];
            return function(defn) {
                return function(flow) {
                    return function(items, keys) {
                        var set = new Set(keys);
                        return items.filter(function(r) {
                            return set.has(defn.node[iref].members.key.accessor(r));
                        });
                    };
                };
            };
        }
    };
};
