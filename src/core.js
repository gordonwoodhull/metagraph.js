var metagraph = {
    version: '<%= conf.pkg.version %>'
};
var mg = metagraph;

function object_to_keyvalue(o) {
    return Object.keys(o).map(function(key) {
        return {key: key, value: o[key]};
    });
}

function build_map(vals, keyf, wrap) {
    return vals.reduce(function(o, val) {
        o[keyf(val)] = wrap(val);
        return o;
    }, {});
}
