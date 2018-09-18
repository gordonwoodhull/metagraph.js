metagraph.input = function(name) {
    return {
        calc: function(interf, fnode) {
            name = name || fnode.key();
            return function(defn, impl) {
                return impl.source_data[name];
            };
        }
    };
};
metagraph.map = function() {
    return {
        calc: function(interf, fnode) {
            var patref = as_array(fnode.value().refs)[0];
            return function(defn, impl, data) {
                return build_map(data,
                                 defn.node[patref].members.key.accessor,
                                 defn.node[patref].wrap.bind(null, impl));
            };
        }
    };
};
metagraph.singleton = function() {
    return {
        calc: function(interf, fnode) {
            return function(defn, impl) {
                throw new Error('singleton not initialized');
            };
        }
    };
};
metagraph.list = function() {
    return {
        calc: function(interf, fnode) {
            var patref = as_array(fnode.value().refs)[0];
            return function(defn, impl, data, map) {
                return data.map(function(val) {
                    return map[defn.node[patref].members.key.accessor(val)];
                });
            };
        }
    };
};
metagraph.map_of_lists = function(accessor) {
    return {
        calc: function(interf, fnode) {
            return function(defn, impl, data, map) {
                var patref = as_array(fnode.value().refs)[0];
                return data.reduce(function(o, v) {
                    var key = accessor(v);
                    var list = o[key] = o[key] || [];
                    list.push(map[defn.node[patref].members.key.accessor(v)]);
                    return o;
                }, {});
            };
        }
    };
};
metagraph.subset = function() {
    return {
        calc: function(interf, fnode) {
            var patref = as_array(fnode.value().refs)[0];
            return function(defn, impl, items, keys) {
                var set = d3.set(keys);
                return items.filter(function(r) {
                    return set.has(defn.node[patref].members.key.accessor(r));
                });
            };
        }
    };
};
