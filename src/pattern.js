/**
 * The reason there are so many higher-order functions is that there are five
 * stages of a pattern's life:
 * - specification - the pattern author specifies a pattern by calling lookup and
 *   friends. the pattern may take options with accessors for reading raw array data
 * - definition (compilation) - the pattern walks the resulting graph and
 *   defines the functions that will respond to data
 * - instantiation - data is provided to the pattern to create objects
 * - binding - if the action needs other indices built, they are built on demand
 *   and provided to the action before it's run (*)
 * - action - responding to user code
 * (*) for building indices, the binding and action happen in one step. when
 * creating member functions, we bind to the indices first, and then return the
 * function that responds to the user, in order not to pollute the signature.
 **/
metagraph.pattern = function(spec) {
    var flowspec = mg.graph_detect(spec.dataflow),
        pattern = mg.graph_detect(spec.pattern);
    var defn = {node: {}, edge: {}};

    pattern.nodes().forEach(function(node) {
        defn.node[node.key()] = {
            members: {},
            class_members: {}
        };
    });
    function resolve(deps, funfun) {
        return function(defn, impl, val) {
            var action = funfun(defn, impl, val);
            return function() {
                return action.apply(null, deps.map(function(dep) {
                    return impl.flow.calc(dep);
                })).apply(null, arguments);
            };
        };
    }
    pattern.edges().forEach(function(edge) {
        var ekey = edge.key(), evalue = edge.value();
        var action = evalue.member;
        if(action && action.funfun) {
            var funfun = action.funfun(edge);
            var deps = as_array(evalue.deps);
            funfun = deps.length ? resolve(deps, funfun) : funfun;
            defn.node[edge.source().key()].members[evalue.name] = {defn: funfun};
        }
    });
    pattern.nodes().forEach(function(node) {
        var nkey = node.key(), nvalue = node.value();
        if(nvalue.data)
            defn.indices['node.' + nkey] = nvalue.data(node);
        as_array(node.value()).forEach(function(spec) {
            as_keyvalue(spec.class_members).forEach(function(cmemspec) {
                defn.node[nkey].class_members[cmemspec.key] = cmemspec.value(flowspec, node);
            });
            as_keyvalue(spec.members).forEach(function(memspec) {
                var mem = memspec.value(flowspec, node);
                defn.node[nkey].members[memspec.key] = {
                    accessor: mem.accessor,
                    defn: mem.defn
                };
            });
        });
        defn.node[nkey].wrap = function(impl, val) {
            var wrapper = {}, members = defn.node[nkey].members;
            Object.keys(members).forEach(function(name) {
                wrapper[name] = members[name].defn(defn, impl, val);
            });
            return wrapper;
        };
    });

    var nodes2 = pattern.nodes().map(function(n) {
        var n2 = {key: n.key(), value: {}}, class_members = defn.node[n.key()].class_members;
        Object.keys(class_members).forEach(function(name) {
            n2.value[name] = class_members[name].defn(defn);
        });
        return n2;
    });
    var edges2 = pattern.edges().map(function(e) {
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

// dataflow nodes
metagraph.input = function(name) {
    return {
        data: function(pattern, fnode) {
            name = name || fnode.key();
            return function(defn, impl) {
                return impl.source_data[name];
            };
        }
    };
};
metagraph.map = function() {
    return {
        data: function(pattern, fnode) {
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
        data: function(pattern, fnode) {
            return function(defn, impl) {
                throw new Error('singleton not initialized');
            };
        }
    };
};
metagraph.list = function() {
    return {
        data: function(pattern, fnode) {
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
        data: function(pattern, fnode) {
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
        data: function(pattern, fnode) {
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

// pattern nodes
function realize_dataflow(flowspec, pattern, defn, impl) {
    var flownodes = flowspec.nodes().map(function(fsn) {
        return {
            key: fsn.key(),
            value: {
                calc: fsn.value().node.data(pattern, fsn).bind(null, defn, impl)
            }
        };
    });
    return mg.dataflow({
        nodes: flownodes,
        edges: flowspec.edges().map(e => ({key: e.key(), value: e.value()}))
    });
}
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

// pattern edges
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
