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
        var action = evalue.member || evalue.flow;
        if(action.data) {
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
        if(evalue.member && evalue.member.funfun) {
            var funfun = evalue.member.funfun(edge);
            var deps;
            if(evalue.member.data)
                deps = [ekey];
            else if(evalue.deps)
                deps = Array.isArray(evalue.deps) ? evalue.deps : [evalue.deps];
            funfun = deps ? resolve(deps, funfun) : funfun;
            defn.node[edge.source().key()].members[evalue.name] = funfun;
        }
        if(evalue.flow)
            edge.target().value().data = function(node) {
                return defn.indices[ekey];
            };
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
            return wrapper;
        };
    });

    var nodes2 = graph.nodes().map(function(n) {
        var n2 = {key: n.key(), value: {}};
        return n2;
    });
    var edges2 = graph.edges().map(function(e) {
        var e2 = {
            key: e.key(),
            value: {
                source: e.source().key(),
                target: e.target().key()
            }
        };
    });
    return mg.graph(nodes2, edges2);
};

metagraph.input = function(name) {
    return {
        data: function(node) {
            name = name || node.key();
            return function(defn, impl) {
                return impl.source_data[name];
            };
        }
    };
};
metagraph.map = function() {
    return {
        data: function(edge) {
            return function(defn, impl, data) {
                return build_map(data,
                                   edge.target().value().keyFunction,
                                   defn.node[edge.target().key()].wrap.bind(null, impl));
            };
        }
    };
};
metagraph.singleton = function() {
    return {
    };
};
metagraph.list = function() {
    return {
    };
};
metagraph.map_of_lists = function() {
    return {
    };
};
metagraph.createable = function() {
    return {
        class_members: {
            create: function(flow, node) {
                return function(defn) {
                    return function(data) {
                        var impl = {
                            flow: flow.create({}),
                            source_data: data
                        };
                        return (impl.objects[node.key()] = defn.node[node.key()].wrap(impl, data[node.key()]));
                    };
                };
            }
        }
    };
};
metagraph.call = function(methodname) {
    return function(f) {
        return function(impl, val) {
            var spec = {members: {}};
            spec.members[methodname] = function() {
                return f(val);
            };
            return spec;
        };
    };
};
metagraph.key = mg.call('key');
metagraph.value = mg.call('value');

metagraph.basic_type = function() {
    return {
        single: false
    };
};
metagraph.single_type = function() {
    return Object.assign(mg.basic_type(), {
        single: true,
        valueFunction: function(val) {
            return val;
        }
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
metagraph.reference = function(role) {
    return {
        single: role.value().single,
        reference: role
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
metagraph.one = function() {
    return {
        funfun: function(edge) {
            return function(defn, impl, val) {
                return function() {
                    return impl.objects[edge.target().key()];
                };
            };
        }
    };
};
metagraph.list = function() {
    return {
        data: function(edge) {
            return function(defn, impl, data, map) {
                return data.map(function(val) {
                    return map[edge.target().value().keyFunction(val)];
                });
            };
        },
        funfun: function(edge) {
            return function(defn, impl, val) {
                return function(list) {
                    return function() {
                        return list;
                    };
                };
            };
        }
    };
};
metagraph.lookupFrom = function(access) {
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
metagraph.listFrom = function(access) {
    return {
        data: function(edge) {
            return function(defn, impl, data, map) {
                return data.reduce(function(o, v) {
                    var key = access(v);
                    var list = o[key] = o[key] || [];
                    list.push(map[edge.target().value().keyFunction(v)]);
                    return o;
                }, {});
            };
        },
        funfun: function(edge) {
            return function(defn, impl, val) {
                return function(map) {
                    return function() {
                        return map[edge.source().value().keyFunction(val)] || [];
                    };
                };
            };
        }
    };
metagraph.select = function() {
    return {
        data: function(edge) {
            return function(defn, impl, items, keys) {
                var set = d3.set(keys);
                return items.filter(function(r) {
                    return set.has(edge.source().value().keyFunction(r));
                });
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
};
