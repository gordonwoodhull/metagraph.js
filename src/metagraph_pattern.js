// this is the bootstrap
metagraph.metagraph_pattern = function(options) {
    var pattern = metagraph.graph_pattern(options);

    pattern.edges.same_as = mg.one_to_one({
        source: 'Node', target: 'Node',
        source_member: 'also', target_member: 'also'
    });
    return pattern;
};
