var metagraph = {
    version: '<%= conf.pkg.version %>'
};
var mg = metagraph;

function as_array(a) {
    return !a && [] || (Array.isArray(a) ? a : [a]);
}

function as_keyvalue(o) {
    return !o && [] || (Array.isArray(o) ? o : Object.keys(o).map(function(key) {
        return {key: key, value: o[key]};
    }));
}

function build_map(vals, keyf, wrap) {
    return vals.reduce(function(o, val) {
        o[keyf(val)] = wrap(val);
        return o;
    }, {});
}
