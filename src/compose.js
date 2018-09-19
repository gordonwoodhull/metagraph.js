metagraph.compose = function(composition) {
    var sorted = mg.topological_sort(composition);
    var built = {}, flowspecs = {};
    // resolve dependencies and build patterns
    sorted.forEach(function(patnode) {
        flowspecs[patnode.key()] = mg.graph_detect(patnode.value().dataflow);
        var interf = patnode.value().interface;
        built[patnode.key()] = mg.graph_adjacency({
            nodes: interf.nodes,
            edges: interf.edges
        });
    });
    // unite patterns
    var nodes = [], edges = [], mappings = {};
    sorted.forEach(function(patnode) {
        var pattern = built[patnode.key()];
        pattern.nodes().forEach(function(inode) {
            var key = patnode.key() + '.' + inode.key();
            var ref = as_array(inode.value()).find(spec => typeof spec === 'string');
            if(ref) {
                var parts = ref.split('.');
                var patedge = patnode.ins().find(pe => pe.value().input === parts[0]);
                var key2 = patedge.source().key() + '.' + parts[1];
                if(mappings[key2])
                    key2 = mappings[key2];
                mappings[key] = key2;
            }
            else nodes.push({
                key: key,
                value: inode.value()
            });
        });
        pattern.edges().forEach(function(iedge) {
            var val2 = Object.assign({}, iedge.value());
            val2.source = mappings[patnode.key() + '.' + iedge.source().key()];
            val2.target = mappings[patnode.key() + '.' + iedge.target().key()];
            edges.push({
                key: patnode().key() + ',' + iedge.key(),
                value: val2
            });
        });
    });
    return mg.pattern({
        interface: {
            nodes,
            edges
        }
    }, flowspecs);
};
