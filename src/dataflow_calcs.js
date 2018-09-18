metagraph.input = function(name) {
    return {
        calc: function(fnode) {
            name = name || fnode.key();
            return function(defn, inputs) {
                return function() {
                    return inputs.data[name];
                };
            };
        }
    };
};
metagraph.map = function() {
    return {
        calc: function(fnode) {
            var iref = as_array(fnode.value().refs)[0];
            return function(defn, inputs) {
                return function(data) {
                    return build_map(data,
                                     defn.node[iref].members.key.accessor,
                                     defn.node[iref].wrap.bind(null, this));
                };
            };
        }
    };
};
metagraph.singleton = function() {
    return {
        calc: function(fnode) {
            return function(defn, inputs) {
                return function() {
                    throw new Error('singleton not initialized');
                };
            };
        }
    };
};
metagraph.list = function() {
    return {
        calc: function(fnode) {
            var iref = as_array(fnode.value().refs)[0];
            return function(defn, inputs) {
                return function(data, map) {
                    return data.map(function(val) {
                        return map[defn.node[iref].members.key.accessor(val)];
                    });
                };
            };
        }
    };
};
metagraph.map_of_lists = function(accessor) {
    return {
        calc: function(fnode) {
            return function(defn, inputs) {
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
        }
    };
};
metagraph.subset = function() {
    return {
        calc: function(fnode) {
            var iref = as_array(fnode.value().refs)[0];
            return function(defn, inputs) {
                return function(items, keys) {
                    var set = d3.set(keys);
                    return items.filter(function(r) {
                        return set.has(defn.node[iref].members.key.accessor(r));
                    });
                };
            };
        }
    };
};
