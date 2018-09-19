metagraph.compose = function(composition) {
    var sorted = mg.topological_sort(composition);
    var built = {}, flowspecs = {};
    function input_edge(patnode, name) {
        return patnode.ins().find(pe => pe.value().input === name);
    }
    // resolve dependencies and build patterns
    sorted.forEach(function(patnode) {
        var flowspec = mg.graph_detect(patnode.value().dataflow);
        var fnodes = flowspec.nodes().map(function(fn) {
            var v2 = Object.assign({}, fn.value());
            v2.refs = as_array(v2.refs).map(function(ref) {
                var parts = ref.split('.');
                if(parts.length > 1) {
                    var patedge = input_edge(patnode, parts[0]);
                    return patedge.source().key() + '.' + parts[1];
                }
                else return patnode.key() + '.' + parts[0];
            });
            return {
                key: fn.key(),
                value: v2
            };
        });
        var fedges = flowspec.edges().map(e => ({key: e.key(), value: e.value()}));
        flowspecs[patnode.key()] = mg.graph(fnodes, fedges);
        var interf = patnode.value().interface;
        built[patnode.key()] = mg.graph_detect({
            nodes: interf.nodes,
            edges: interf.edges
        });
    });
    // unite patterns
    var nodes = [], edges = [], mappings = {};
    function lookup(key) {
        return mappings[key] || key;
    }
    sorted.forEach(function(patnode) {
        var pattern = built[patnode.key()];
        pattern.nodes().forEach(function(inode) {
            var key = patnode.key() + '.' + inode.key();
            var ref = as_array(inode.value()).find(spec => typeof spec === 'string');
            if(ref) {
                var parts = ref.split('.');
                var patedge = input_edge(patnode, parts[0]);
                var key2 = lookup(patedge.source().key() + '.' + parts[1]);
                mappings[key] = key2;
            }
            else nodes.push({
                key: key,
                value: inode.value()
            });
        });
        pattern.edges().forEach(function(iedge) {
            var val2 = Object.assign({}, iedge.value());
            val2.source = lookup(patnode.key() + '.' + iedge.source().key());
            val2.target = lookup(patnode.key() + '.' + iedge.target().key());
            edges.push({
                key: patnode.key() + '.' + iedge.key(),
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
