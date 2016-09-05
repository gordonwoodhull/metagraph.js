var graph_pattern = metagraph([
    {name: 'graph', interface: function(g, options) {
        return {};
    }},
    {name: 'node', interface: function(n, options) {
        return {
            value: function() {
                return n;
            },
            name: function() {
                return options.nodeKey(n);
            }
        };
    }},
    {name: 'edge', interface: function(e, options) {
        return {
            value: function() {
                return e;
            },
            name: function() {
                return options.edgeKey(e);
            }
        };
    }}
], [
    {name: 'node', source: 'graph', target: 'node',
     index: function(mg, graph, nodes, edges) {
         return metagraph.build_index(nodes, mg.options().nodeKey, mg.reify('node'));
     },
     impl: function(mg, index) {
         return function(key) {
             return index[key];
         };
     }},
    {name: 'nodes', source: 'graph', target: 'node',
     index: function(mg, graph, nodes, edges) {
         return nodes.map(function(n) { return graph.node(mg.options().nodeKey(n)); });
     },
     impl: function(mg, index) {
         return function() {
             return index;
         };
     }},
    {name: 'outs', source: 'node', target: 'edge',
     index: function(mg, graph, nodes, edges) {
         return graph_pattern.build_directional_edge_lists(graph, edges, mg.options().edgeSource);
     },
     impl: function(mg, index, node) {
         return function() {
             return index[node.name()];
         };
     }},
    {name: 'source', source: 'edge', target: 'node',
     impl: function(mg, _, edge) {
         return function() {
             return 
         };
     }}
]);

graph_pattern.build_directional_edge_lists = function(mg, graph, edges, acc) {
    return edges.reduce(function(o, v) {
        var l = o[acc(v)] = o[acc(v)] || [];
        l.push(graph.edge(mg.options().edgeKey(v)));
        return o;
    }, {});
};
