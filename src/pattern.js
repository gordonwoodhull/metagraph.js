/**
 * The reason there are so many higher-order functions is that there are five
 * stages of a pattern's life:
 * - specification - the pattern author specifies a pattern in terms of its dataflow and
 *   interface. the pattern is parameterized on user-supplied data accessors
 * - definition (compilation) - the pattern walks the resulting graph and
 *   defines the functions that will respond to data
 * - instantiation - data is provided to the pattern to create objects
 * - binding - if the action needs other indices built, they are built on demand
 *   and provided to the action before it's run
 * - action - responding to user code
 **/
metagraph.pattern = function(spec) {
    var flowspec = mg.graph_detect(spec.dataflow),
        interf = mg.graph_detect(spec.interface);
    var defn = {node: {}, edge: {}};

    interf.nodes().forEach(function(node) {
        defn.node[node.key()] = {
            members: {},
            class_members: {}
        };
    });
    function resolve(deps, funfun) {
        return function(defn, flow, val) {
            var action = funfun(defn, flow, val);
            return function() {
                return action.apply(null, deps.map(function(dep) {
                    return flow.calc(dep);
                })).apply(null, arguments);
            };
        };
    }
    interf.edges().forEach(function(edge) {
        var ekey = edge.key(), evalue = edge.value();
        var action = evalue.member;
        if(action && action.funfun) {
            var funfun = action.funfun(edge);
            var deps = as_array(evalue.deps);
            funfun = deps.length ? resolve(deps, funfun) : funfun;
            defn.node[edge.source().key()].members[evalue.name] = {defn: funfun};
        }
    });
    interf.nodes().forEach(function(node) {
        var nkey = node.key(), nvalue = node.value();
        if(nvalue.data)
            defn.indices['node.' + nkey] = nvalue.data(node);
        as_array(node.value()).forEach(function(spec) {
            as_keyvalue(spec.class_members).forEach(function(cmemspec) {
                defn.node[nkey].class_members[cmemspec.key] = cmemspec.value(flowspec, node);
            });
            as_keyvalue(spec.members).forEach(function(memspec) {
                var mem = memspec.value(flowspec, node);
                defn.node[nkey].members[memspec.key] = {
                    accessor: mem.accessor,
                    defn: mem.defn
                };
            });
        });
        defn.node[nkey].wrap = function(flow, val) {
            var wrapper = {}, members = defn.node[nkey].members;
            Object.keys(members).forEach(function(name) {
                wrapper[name] = members[name].defn(defn, flow, val);
            });
            return wrapper;
        };
    });

    var nodes2 = interf.nodes().map(function(n) {
        var n2 = {key: n.key(), value: {}}, class_members = defn.node[n.key()].class_members;
        Object.keys(class_members).forEach(function(name) {
            n2.value[name] = class_members[name].defn(defn);
        });
        return n2;
    });
    var edges2 = interf.edges().map(function(e) {
        var e2 = {
            key: e.key(),
            value: {
                source: e.source().key(),
                target: e.target().key()
            }
        };
    });
    return mg.graph(nodes2, edges2);
};

function realize_dataflow(flowspec, defn, inputs) {
    var flownodes = flowspec.nodes().map(function(fsn) {
        return {
            key: fsn.key(),
            value: {
                calc: fsn.value().node.calc(fsn)(defn, inputs)
            }
        };
    });
    return mg.dataflow({
        nodes: flownodes,
        edges: flowspec.edges().map(e => ({key: e.key(), value: e.value()}))
    });
}
