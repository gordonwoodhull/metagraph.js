/*!
 *  metagraph.js 0.0.3
 *  http://gordonwoodhull.github.io/metagraph.js/
 *  Copyright 2017 AT&T Intellectual Property
 *
 *  Licensed under the MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a
 *  copy of this software and associated documentation files (the "Software"),
 *  to deal in the Software without restriction, including without limitation
 *  the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *  and/or sell copies of the Software, and to permit persons to whom the
 *  Software is furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 *  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *  DEALINGS IN THE SOFTWARE.
 */

(function() { function _metagraph() {
'use strict';

var metagraph = {
    version: '0.0.3'
};
var mg = metagraph;

function object_to_keyvalue(o) {
    return Object.keys(o).map(function(key) {
        return {key: key, value: o[key]};
    });
}

function build_index(vals, keyf, wrap) {
    return vals.reduce(function(o, val) {
        o[keyf(val)] = wrap(val);
        return o;
    }, {});
}

metagraph.graph = function(nodes, edges, options) {
    if(!Array.isArray(nodes))
        nodes = object_to_keyvalue(nodes);
    if(!Array.isArray(edges))
        edges = object_to_keyvalue(edges);
    options = Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
        nodeValue: function(kv) { return kv.value; },
        edgeValue: function(kv) { return kv.value; },
        edgeSource: function(kv) { return kv.value.source; },
        edgeTarget: function(kv) { return kv.value.target; }
    }, options || {});

    var _nodeIndex, _edgeIndex, _nodesList, _edgesList, _outsList, _insList;

    function build_node_index() {
        if(_nodeIndex)
            return;
        _nodeIndex = build_index(nodes, options.nodeKey, node_wrapper);
    }
    function build_edge_index() {
        if(_edgeIndex)
            return;
        _edgeIndex = build_index(edges, options.edgeKey, edge_wrapper);
    }
    function build_nodes_list() {
        if(_nodesList)
            return;
        build_node_index();
        _nodesList = nodes.map(function(v) { return _graph.node(options.nodeKey(v)); });
    }
    function build_edges_list() {
        if(_edgesList)
            return;
        build_edge_index();
        _edgesList = edges.map(function(v) { return _graph.edge(options.edgeKey(v)); });
    }
    function build_directional_edge_lists(acc) {
        build_edge_index();
        return edges.reduce(function(o, v) {
            var l = o[acc(v)] = o[acc(v)] || [];
            l.push(_graph.edge(options.edgeKey(v)));
            return o;
        }, {});
    }
    function build_outs_index() {
        if(_outsList)
            return;
        _outsList = build_directional_edge_lists(options.edgeSource);
    }
    function build_ins_index() {
        if(_insList)
            return;
        _insList = build_directional_edge_lists(options.edgeTarget);
    }
    function node_wrapper(n) {
        return {
            value: function() {
                return options.nodeValue(n);
            },
            key: function() {
                return options.nodeKey(n);
            },
            graph: function() {
                return _graph;
            },
            outs: function() {
                build_outs_index();
                return _outsList[options.nodeKey(n)];
            },
            ins: function() {
                build_ins_index();
                return _insList[options.nodeKey(n)];
            }
        };
    }
    function edge_wrapper(e) {
        return {
            value: function() {
                return options.edgeValue(e);
            },
            key: function() {
                return options.edgeKey(e);
            },
            graph: function() {
                return _graph;
            },
            source: function() {
                return _graph.node(options.edgeSource(e));
            },
            target: function() {
                return _graph.node(options.edgeTarget(e));
            }
        };
    }
    var _graph = {
        node: function(key) {
            build_node_index();
            return _nodeIndex[key];
        },
        edge: function(key) {
            build_edge_index();
            return _edgeIndex[key];
        },
        nodes: function() {
            build_nodes_list();
            return _nodesList;
        },
        edges: function() {
            build_edges_list();
            return _edgesList;
        }
    };
    return _graph;
}


/**
 * The reason there are so many higher-order functions is that there are five
 * stages of a pattern's life:
 * - specification - the pattern author specifies a pattern by calling one_to_many and
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
        var evalue = edge.value();
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
                // these two seem somewhat specific; should *_type also contribute to interface?
                if(node.value().keyFunction)
                    wrapper.key = function() {
                        return node.value().keyFunction(val);
                    };
                if(node.value().valueFunction)
                    wrapper.value = function() {
                        return node.value().valueFunction(val);
                    };
                return wrapper;
            };
            if(node.value().single)
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
metagraph.table_type = function(keyf, valuef) {
    return Object.assign(mg.basic_type(), {
        keyFunction: keyf,
        valueFunction: valuef
    });
};

metagraph.one_to_many = function(spec) {
    return Object.assign(spec, {
        buildIndex: function(edge) {
            return {
                funfun: function(defn, impl) {
                    return build_index(impl.data[edge.target().key()],
                                       edge.target().value().keyFunction,
                                       defn.node[edge.target().key()].wrap);
                }
            };
        },
        sourceMember: function(edge) {
            return {
                name: edge.value().source_member,
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
                name: edge.value().target_member,
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
                deps: edge.value().index,
                funfun: function(defn, impl, index) {
                    return impl.data[edge.target().key()].map(function(val) {
                        return index[edge.target().value().keyFunction(val)];
                    });
                }
            };
        },
        sourceMember: function(edge) {
            return {
                name: edge.value().source_member,
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
                deps: edge.value().target_deps,
                funfun: function(defn, impl, index) {
                        return impl.data[edge.source().key()].reduce(function(o, v) {
                            var key = edge.value().access(v);
                            var list = o[key] = o[key] || [];
                            list.push(index[edge.source().value().keyFunction(v)]);
                            return o;
                        }, {});
                }
            };
        },
        sourceMember: function(edge) {
            return {
                name: edge.value().source_member,
                deps: edge.value().source_deps,
                funfun: function(defn, impl, val) {
                    return function(index) {
                        return function() {
                            return index[edge.value().access(val)];
                        };
                    };
                }
            };
        },
        targetMember: function(edge) {
            return {
                name: edge.value().target_member,
                deps: edge.key(),
                funfun: function(defn, impl, val) {
                    return function(index) {
                        return function() {
                            return index[edge.target().value().keyFunction(val)];
                        };
                    };
                }
            };
        }
    });
}

metagraph.graph_pattern = function(options) {
    options = Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
        nodeValue: function(kv) { return kv.value; },
        edgeValue: function(kv) { return kv.value; },
        edgeSource: function(kv) { return kv.value.source; },
        edgeTarget: function(kv) { return kv.value.target; }
    }, options || {});

    return {
        nodes: {
            Graph: mg.single_type(),
            Node: mg.table_type(options.nodeKey, options.nodeValue),
            Edge: mg.table_type(options.edgeKey, options.edgeValue)
        },
        edges: {
            graph_node: mg.one_to_many({
                source: 'Graph', target: 'Node',
                source_member: 'node', target_member: 'graph'
            }),
            graph_nodes: mg.get_table({
                source: 'Graph', target: 'Node',
                source_member: 'nodes', index: 'graph_node'
            }),
            graph_edge: mg.one_to_many({
                source: 'Graph', target: 'Edge',
                source_member: 'edge', target_member: 'graph'
            }),
            graph_edges: mg.get_table({
                source: 'Graph', target: 'Edge',
                source_member: 'edges', index: 'graph_edge'
            }),
            edge_source: mg.many_to_one({
                source: 'Edge', target: 'Node',
                source_member: 'source', source_deps: 'graph_node',
                target_member: 'outs', target_deps: 'graph_edge',
                access: options.edgeSource
            }),
            edge_target: mg.many_to_one({
                source: 'Edge', target: 'Node',
                source_member: 'target', source_deps: 'graph_node',
                target_member: 'ins', target_deps: 'graph_edge',
                access: options.edgeTarget
            })
        }};
};

return metagraph;
}
    if (typeof define === 'function' && define.amd) {
        define([], _metagraph);
    } else if (typeof module == "object" && module.exports) {
        module.exports = _metagraph();
    } else {
        this.metagraph = _metagraph();
    }
}
)();

//# sourceMappingURL=metagraph.js.map