metagraph.graph = function(nodes, edges, options) {
    if(!Array.isArray(nodes))
        nodes = object_to_keyvalue(nodes);
    if(!Array.isArray(edges))
        edges = object_to_keyvalue(edges);
    options = Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
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
                return n;
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
                return e;
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

