function ggraph(nodes, edges, options) {
    // by default, assume crossfilter-like key/value pairs, sourcename&targetname properties
    // but any arrays of nodes and edges should be adaptable
    options = Object.assign({
        nodeKey: function(kv) { return kv.key; },
        edgeKey: function(kv) { return kv.key; },
        edgeSource: function(kv) { return kv.value.sourcename; },
        edgeTarget: function(kv) { return kv.value.targetname; }
    }, options || {});

    var _nodeIndex, _edgeIndex, _outsList, _insList;

    function build_index(vs, acc, wrap) {
        return vs.reduce(function(o, v) {
            o[acc(v)] = wrap(v);
            return o;
        }, {});
    }
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
    function build_edge_list(acc) {
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
        _outsList = build_edge_list(options.edgeSource);
    }
    function build_ins_index() {
        if(_insList)
            return;
        _insList = build_edge_list(options.edgeTarget);
    }
    function node_wrapper(n) {
        return {
            value: function() {
                return n;
            },
            name: function() {
                return options.nodeKey(n);
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
            name: function() {
                return options.edgeKey(e);
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
        }
    };
    return _graph;
}

