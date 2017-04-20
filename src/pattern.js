/**
 * The reason there are so many higher-order functions is that there are five
 * stages of a pattern's life:
 * - specification - the pattern author specifies a pattern by calling lookup and
 *   friends. the pattern make take options with accessors for reading raw array data
 * - definition (compilation) - the pattern walks the resulting graph and
 *   defines the functions that will respond to data
 * - instantiation - data is provided to the pattern to create objects
 * - binding - if the action needs other indices built, they are built on demand
 *   and provided to the action before it's run (*)
 * - action - responding to user code
 * (*) for buildIndex, the binding and action happen in one step. members first
 * bind to the indices and return the function and responds to the user, in
 * order not to pollute the signature.
 **/
metagraph.pattern = function(spec) {
    var graph = mg.graph(spec.nodes, spec.edges);
    var defn = {node: {}, edge: {}, indices: {}};
    graph.nodes().forEach(function(node) {
        defn.node[node.key()] = {
            members: {}
        };
    });
    function resolve(deps, funfun) {
        return function(defn, impl, val) {
            var action = funfun(defn, impl, val);
            return function() {
                return action.apply(null, deps.map(function(dep) {
                    return defn.indices[dep](defn, impl);
                })).apply(null, arguments);
            };
        };
    }

    graph.edges().forEach(function(edge) {
        var ekey = edge.key(), evalue = edge.value();
        if(evalue.member.data) {
            var buind = evalue.member.data(edge);
            defn.indices[ekey] = function(defn, impl) {
                if(!impl.indices[ekey]) {
                    var args = [defn, impl], index;
                    if(evalue.deps) {
                        var deps = Array.isArray(evalue.deps) ? evalue.deps : [evalue.deps];
                        args = args.concat(deps.map(function(dep) {
                            return defn.indices[dep](defn, impl);
                        }));
                        index = buind.apply(null, args);
                    }
                    else index = buind(defn, impl);
                    impl.indices[ekey] = index;
                }
                return impl.indices[ekey];
            };
        }
        if(evalue.member.member) {
            var mem = evalue.member.member(edge);
            var deps;
            if(evalue.member.data)
                deps = [ekey];
            else if(evalue.deps)
                deps = Array.isArray(evalue.deps) ? evalue.deps : [evalue.deps];
            var funfun = deps ? resolve(deps, mem.funfun) : mem.funfun;
            defn.node[edge.source().key()].members[mem.name] = funfun;
        }
    });
    graph.nodes().forEach(function(node) {
        var nkey = node.key(), nvalue = node.value();
        if(nvalue.data)
            defn.indices['node.' + nkey] = nvalue.data(node);
        defn.node[nkey].wrap = function(impl, val) {
            var wrapper = {};
            Object.keys(defn.node[nkey].members).forEach(function(member) {
                wrapper[member] = defn.node[nkey].members[member](defn, impl, val);
            });
            // these two seem somewhat specific; should *_type also contribute to interface?
            if(nvalue.keyFunction)
                wrapper.key = function() {
                    return nvalue.keyFunction(val);
                };
            if(nvalue.valueFunction)
                wrapper.value = function() {
                    return nvalue.valueFunction(val);
                };
            return wrapper;
        };
    });

    return function(data) {
        var impl = {
            indices: {},
            objects: {},
            source_data: data
        };
        return {
            root: function(key) {
                var node = graph.node(key);
                if(!node)
                    throw new Error("'" + key + "' is not a type in this pattern");
                if(!graph.node(key).value().single)
                    throw new Error("the type '" + key + "' is not a root");
                if(!impl.objects[key])
                    impl.objects[key] = defn.node[node.key()].wrap(impl, data[node.key()]);
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
    return Object.assign(mg.basic_type(), {
        single: true
    });
};
metagraph.table_type = function(keyf, valuef) {
    return Object.assign(mg.basic_type(), {
        keyFunction: keyf,
        valueFunction: valuef,
        data: function(node) {
            return function(defn, impl) {
                return impl.source_data[node.key()];
            };
        }
    });
};

metagraph.lookup = function(memberName) {
    return {
        data: function(edge) {
            return function(defn, impl, data) {
                return build_index(data,
                                   edge.target().value().keyFunction,
                                   defn.node[edge.target().key()].wrap.bind(null, impl));
            };
        },
        member: function(edge) {
            return {
                name: memberName,
                funfun: function(defn, impl, val) {
                    return function(index) {
                        return function(key) {
                            return index[key];
                        };
                    };
                }
            };
        }
    };
};
metagraph.one = function(memberName) {
    return {
        member: function(edge) {
            return {
                name: memberName,
                funfun: function(defn, impl, val) {
                    return function() {
                        return impl.objects[edge.target().key()];
                    };
                }
            };
        }
    };
};
metagraph.list = function(memberName) {
    return {
        data: function(edge) {
            return function(defn, impl, data, index) {
                return data.map(function(val) {
                    return index[edge.target().value().keyFunction(val)];
                });
            };
        },
        member: function(edge) {
            return {
                name: memberName,
                funfun: function(defn, impl, val) {
                    return function(list) {
                        return function() {
                            return list;
                        };
                    };
                }
            };
        }
    };
};
metagraph.lookupFrom = function(memberName, access) {
    return {
        member: function(edge) {
            return {
                name: memberName,
                funfun: function(defn, impl, val) {
                    return function(index) {
                        return function() {
                            return index[access(val)];
                        };
                    };
                }
            };
        }
    };
};
metagraph.listFrom = function(memberName, access) {
    return {
        data: function(edge) {
            return function(defn, impl, data, index) {
                return data.reduce(function(o, v) {
                    var key = access(v);
                    var list = o[key] = o[key] || [];
                    list.push(index[edge.target().value().keyFunction(v)]);
                    return o;
                }, {});
            };
        },
        member: function(edge) {
            return {
                name: memberName,
                funfun: function(defn, impl, val) {
                    return function(index) {
                        return function() {
                            return index[edge.source().value().keyFunction(val)] || [];
                        };
                    };
                }
            };
        }
    };
}
