metagraph.pattern = function(types, relations) {
    var graph = mg.graph(types, relations);
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
        var evalue = edge.value().value;
        if(evalue.buildIndex) {
            var buind = evalue.buildIndex(edge);
            defn.indices[edge.key()] = function(defn, impl) {
                if(!impl.indices[edge.key()]) {
                    var args = [defn, impl], index;
                    if(buind.deps) {
                        var deps = Array.isArray(buind.deps) ? buind.deps : [buind.deps];
                        args = args.concat(deps.map(function(dep) {
                            return defn.indices[dep](defn, impl);
                        }));
                        index = buind.funfun.apply(buind, args);
                    }
                    else index = buind.funfun(defn, impl);
                    impl.indices[edge.key()] = index;
                }
                return impl.indices[edge.key()];
            };
        }
        var deps, funfun;
        if(evalue.sourceMember) {
            var sourmem = evalue.sourceMember(edge);
            funfun = sourmem.funfun;
            if(sourmem.deps) {
                deps = Array.isArray(sourmem.deps) ? sourmem.deps : [sourmem.deps];
                funfun = resolve(deps, funfun);
            }
            defn.node[edge.source().key()].members[sourmem.name] = funfun;
        }
        if(evalue.targetMember) {
            var targmem = evalue.targetMember(edge);
            funfun = targmem.funfun;
            if(targmem.deps) {
                deps = Array.isArray(targmem.deps) ? targmem.deps : [targmem.deps];
                funfun = resolve(deps, funfun);
            }
            defn.node[edge.target().key()].members[targmem.name] = funfun;
        }
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
    return Object.assign(mg.basic_type(), {
        single: true
    });
};
metagraph.table_type = function(keyf) {
    return Object.assign(mg.basic_type(), {
        keyFunction: keyf
    });
};

metagraph.one_to_many = function(spec) {
    return Object.assign(spec, {
        buildIndex: function(edge) {
            return {
                funfun: function(defn, impl) {
                    return build_index(impl.data[edge.target().key()],
                                       edge.target().value().value.keyFunction,
                                       defn.node[edge.target().key()].wrap);
                }
            };
        },
        sourceMember: function(edge) {
            return {
                name: edge.value().value.source_member,
                deps: edge.key(),
                funfun: function(defn, impl, val) {
                    return function(index) {
                        return function(key) {
                            return index[key];
                        };
                    };
                }
            };
        },
        targetMember: function(edge) {
            return {
                name: edge.value().value.target_member,
                funfun: function(defn, impl, val) {
                    return function() {
                        return impl.objects[edge.source().key()];
                    };
                }
            };
        }
    });
};
metagraph.get_table = function(spec) {
    return Object.assign(spec, {
        buildIndex: function(edge) {
            return {
                deps: edge.value().value.index,
                funfun: function(defn, impl, index) {
                    return impl.data[edge.target().key()].map(function(val) {
                        return index[edge.target().value().value.keyFunction(val)];
                    });
                }
            };
        },
        sourceMember: function(edge) {
            return {
                name: edge.value().value.source_member,
                deps: edge.key(),
                funfun: function(defn, impl, val) {
                    return function(list) {
                        return function() {
                            return list;
                        };
                    };
                }
            };
        }
    });
};
metagraph.many_to_one = function(spec) {
    return Object.assign(spec, {
        buildIndex: function(edge) {
            return {
                deps: edge.value().value.target_deps,
                funfun: function(defn, impl, index) {
                        return impl.data[edge.source().key()].reduce(function(o, v) {
                            var key = edge.value().value.access(v);
                            var list = o[key] = o[key] || [];
                            list.push(index[edge.source().value().value.keyFunction(v)]);
                            return o;
                        }, {});
                }
            };
        },
        sourceMember: function(edge) {
            return {
                name: edge.value().value.source_member,
                deps: edge.value().value.source_deps,
                funfun: function(defn, impl, val) {
                    return function(index) {
                        return function() {
                            return index[edge.value().value.access(val)];
                        };
                    };
                }
            };
        },
        targetMember: function(edge) {
            return {
                name: edge.value().value.target_member,
                deps: edge.key(),
                funfun: function(defn, impl, val) {
                    return function(index) {
                        return function() {
                            return index[edge.target().value().value.keyFunction(val)];
                        };
                    };
                }
            };
        }
    });
}
