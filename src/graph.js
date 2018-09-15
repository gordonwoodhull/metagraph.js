function graph_options(opts) {
    return Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
        nodeValue: function(kv) { return kv.value; },
        edgeValue: function(kv) { return kv.value; },
        edgeSource: function(kv) { return kv.value.source; },
        edgeTarget: function(kv) { return kv.value.target; }
    }, opts || {});
}
metagraph.graph = function(nodes, edges, opts) {
    nodes = as_keyvalue(nodes);
    edges = as_keyvalue(edges);
    var options = graph_options(opts);

    var _nodeMap, _edgeMap, _nodesList, _edgesList, _outsList, _insList;

    function build_node_map() {
        if(_nodeMap)
            return;
        _nodeMap = build_map(nodes, options.nodeKey, node_wrapper);
    }
    function build_edge_map() {
        if(_edgeMap)
            return;
        _edgeMap = build_map(edges, options.edgeKey, edge_wrapper);
    }
    function build_nodes_list() {
        if(_nodesList)
            return;
        build_node_map();
        _nodesList = nodes.map(function(v) { return _graph.node(options.nodeKey(v)); });
    }
    function build_edges_list() {
        if(_edgesList)
            return;
        build_edge_map();
        _edgesList = edges.map(function(v) { return _graph.edge(options.edgeKey(v)); });
    }
    function build_directional_edge_lists(acc) {
        build_edge_map();
        return edges.reduce(function(o, v) {
            var l = o[acc(v)] = o[acc(v)] || [];
            l.push(_graph.edge(options.edgeKey(v)));
            return o;
        }, {});
    }
    function build_outs_map() {
        if(_outsList)
            return;
        _outsList = build_directional_edge_lists(options.edgeSource);
    }
    function build_ins_map() {
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
                build_outs_map();
                return _outsList[options.nodeKey(n)] || [];
            },
            ins: function() {
                build_ins_map();
                return _insList[options.nodeKey(n)] || [];
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
            build_node_map();
            return _nodeMap[key];
        },
        edge: function(key) {
            build_edge_map();
            return _edgeMap[key];
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
};

metagraph.graph_adjacency = metagraph.graph;
function incidence_options(opts) {
    var gropts = graph_options(opts);
    return Object.assign({
        nodeIncidences: n => n && (n.edges || n.ins || n.outs) || [],
        incidencesOutward: n => {
            var v = gropts.nodeValue(n);
            return !v /* doesn't matter */ || !!(v.edges || v.outs);
        }
    }, gropts);
}
metagraph.graph_incidence = function(nodes, opts) {
    nodes = as_keyvalue(nodes);
    var options = incidence_options(opts);
    var edges = [];
    function edge_value(outward, nk, ik) {
        return outward ? {
            source: nk,
            target: ik
        } : {
            source: ik,
            target: nk
        };
    }
    function edge_key(outward, nk, ik) {
        return outward ? nk + '-' + ik : ik + '-' + nk;
    }
    nodes.forEach(function(n) {
        var nk = options.nodeKey(n),
            outward = options.incidencesOutward(n);
        as_array(options.nodeIncidences(options.nodeValue(n)))
            .forEach(function(ik) {
                edges.push({
                    key: edge_key(outward, nk, ik),
                    value: edge_value(outward, nk, ik)
                });
            });
    });
    return mg.graph_adjacency(nodes, edges, opts);
};
metagraph.graph_detect = function(spec, opts) {
    if(spec.incidences)
        return mg.graph_incidence(spec.incidences, opts);
    else if(spec.nodes)
        return mg.graph_adjacency(spec.nodes, spec.edges, opts);
};
