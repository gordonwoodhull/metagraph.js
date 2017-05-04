metagraph.compose = function(composition) {
    var graph_pattern = mg.pattern(mg.graph_pattern());
    var sorted = mg.topological_sort(composition);
    var built = {};
    // resolve dependencies and build patterns
    sorted.forEach(function(patnode) {
        var build;
        if(patnode.ins().length) {
            var params = {};
            patnode.ins().forEach(function(depedge) {
                params[depedge.key()] = built[depedge().source().key()];
            });
            build = patnode.value().pattern(params);
        } else build = patnode.value().pattern;
        built[patnode.key()] = graph_pattern({
            Graph: patnode.key(),
            Node: build.nodes,
            Edge: build.edges
        }).root('Graph');
    });
    // unite patterns
    var nodes = [], edges = [], mappings = {};
    sorted.forEach(function(patnode) {
        var pattern = built[patnode.key()];
        pattern.nodes().forEach(function(role) {
            var key = patnode.key() + '.' + role.key();
            if(role.value().reference) {
                var ref = role.value().reference,
                    key2 = ref.graph().value() + '.' + ref.key();
                key2 = mappings[key2];
                mappings[key] = key2;
            }
            else nodes.push({
                key: key,
                value: role.value()
            });
        });
        pattern.edges().forEach(function(relation) {
            var rel2 = Object.assign({}, relation);
            rel2.source = mappings[patnode.key() + '.' + relation.source().key()];
            rel2.target = mappings[patnode.key() + '.' + relation.target().key()];
            edges.push(rel2);
        });
    });
    return graph_pattern({
        Node: nodes,
        Edge: edges
    });
};
