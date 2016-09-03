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

    function build_index(vs, acc) {
        return vs.reduce(function(o, v) {
            o[acc(v)] = v;
            return o;
        }, {});
    }
    function build_node_index() {
        if(_nodeIndex)
            return;
        _nodeIndex = build_index(nodes, options.nodeKey);
    }
    function build_edge_index() {
        if(_edgeIndex)
            return;
        _edgeIndex = build_index(edges, options.edgeKey);
    }
    function node_wrapper(n) {
        return {
            value: function() {
                return n;
            },
            name: function() {
                return options.nodeKey(n);
            }
        };
    }
    return {
        node: function(key) {
            build_node_index();
            return _nodeIndex[key];
        },
        edge: function(key) {
            build_edge_index();
            return _edgeIndex[key];
        }
    };
}

