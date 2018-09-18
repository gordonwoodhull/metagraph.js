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

    interf.nodes().forEach(function(inode) {
        defn.node[inode.key()] = {
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
    interf.edges().forEach(function(iedge) {
        var ekey = iedge.key(), evalue = iedge.value();
        var action = evalue.member;
        if(action && action.funfun) {
            var funfun = action.funfun(iedge);
            var deps = as_array(evalue.deps);
            funfun = deps.length ? resolve(deps, funfun) : funfun;
            defn.node[iedge.source().key()].members[evalue.name] = {defn: funfun};
        }
    });
    interf.nodes().forEach(function(inode) {
        var nkey = inode.key(), nvalue = inode.value();
        if(nvalue.data)
            defn.indices['node.' + nkey] = nvalue.data(inode);
        as_array(inode.value()).forEach(function(spec) {
            as_keyvalue(spec.class_members).forEach(function(cmemspec) {
                defn.node[nkey].class_members[cmemspec.key] = cmemspec.value(flowspec, inode);
            });
            as_keyvalue(spec.members).forEach(function(memspec) {
                var mem = memspec.value(flowspec, inode);
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

    var inodes2 = interf.nodes().map(function(n) {
        var n2 = {key: n.key(), value: {}}, class_members = defn.node[n.key()].class_members;
        Object.keys(class_members).forEach(function(name) {
            n2.value[name] = class_members[name].defn(defn);
        });
        return n2;
    });
    var iedges2 = interf.edges().map(function(e) {
        var e2 = {
            key: e.key(),
            value: {
                source: e.source().key(),
                target: e.target().key()
            }
        };
    });
    return mg.graph(inodes2, iedges2);
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
