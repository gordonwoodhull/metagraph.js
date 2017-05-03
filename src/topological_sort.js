metagraph.topological_sort = function(graph) {
    // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
    var stacked = {}, marked = {}, sorted = [];
    function visit(n) {
        if(stacked[n.key()])
            throw new Error('not a DAG');
        if(!marked[n.key()]) {
            stacked[n.key()] = true;
            n.outs().forEach(function(e) {
                visit(e.target());
            });
            marked[n.key()] = true;
            stacked[n.key()] = false;
            sorted.unshift(n);
        }
    }
    var i = 0;
    while(Object.keys(marked).length < graph.nodes().length) {
        while(marked[graph.nodes()[i].key()]) ++i;
        visit(graph.nodes()[i]);
    }
    return sorted;
};

