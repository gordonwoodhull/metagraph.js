import { PatternSpec, PatternDefinition, Graph, DataflowInstance, KeyValue, Node } from './types.js';
import { as_array, as_keyvalue } from './core.js';
import { graph_detect } from './graph.js';
import { dataflow } from './dataflow.js';

export const pattern = (spec: PatternSpec, flowspecs?: Record<string, Graph>): Graph => {
  const flowspec = spec.dataflow && graph_detect(spec.dataflow);
  const interf = graph_detect(spec.interface);
  const defn: PatternDefinition = { node: {}, edge: {} };

  interf.nodes().forEach(inode => {
    defn.node[inode.key()] = {
      members: {},
      class_members: {},
      wrap: (flow: DataflowInstance, val: any) => {
        const wrapper: any = {};
        const members = defn.node[inode.key()].members;
        Object.keys(members).forEach(name => {
          wrapper[name] = members[name].defn(defn, flow, val);
        });
        return wrapper;
      }
    };
  });

  const resolve = (deps: string[], funfun: any) => 
    (defn: PatternDefinition, flow: DataflowInstance, val: any) => {
      const action = funfun(defn, flow, val);
      return (...args: any[]) => 
        action.apply(null, deps.map(dep => {
          const parts = dep.split('.');
          if (parts.length > 1) {
            return flow.input(parts[0], parts[1]);
          } else {
            return flow.calc(dep);
          }
        })).apply(null, args);
    };

  interf.edges().forEach(iedge => {
    const ekey = iedge.key();
    const evalue = iedge.value() as any;
    const fs = flowspec || flowspecs?.[ekey.split('.')[0]];
    const action = evalue.member;
    
    if (action && action.funfun) {
      const funfun = action.funfun(fs, iedge, flowspecs);
      const deps = as_array(evalue.deps);
      const resolvedFunfun = resolve(deps, funfun);
      defn.node[iedge.source().key()].members[evalue.name] = { defn: resolvedFunfun };
    }
  });

  interf.nodes().forEach(inode => {
    const nkey = inode.key();
    const nvalue = inode.value();
    const fs = flowspec || flowspecs?.[nkey.split('.')[0]];
    
    as_array(inode.value()).forEach((spec: any) => {
      as_keyvalue(spec.class_members).forEach((cmemspec: any) => {
        defn.node[nkey].class_members[cmemspec.key] = cmemspec.value(fs!, inode);
      });
      as_keyvalue(spec.members).forEach((memspec: any) => {
        const mem = memspec.value(fs!, inode);
        defn.node[nkey].members[memspec.key] = {
          accessor: mem.accessor,
          defn: mem.defn
        };
      });
    });
  });

  const inodes2 = interf.nodes().map(n => {
    const n2: any = { key: n.key(), value: {} };
    const class_members = defn.node[n.key()].class_members;
    Object.keys(class_members).forEach(name => {
      n2.value[name] = class_members[name].defn(defn);
    });
    return n2;
  });

  const iedges2 = interf.edges().map(e => ({
    key: e.key(),
    value: {
      source: e.source().key(),
      target: e.target().key()
    }
  }));

  return graph_detect({ nodes: inodes2, edges: iedges2 });
};

export const define_dataflow = (flowspec: Graph, defn: PatternDefinition) => {
  const flownodes = flowspec.nodes().map(fsn => ({
    key: fsn.key(),
    value: {
      calc: (fsn.value() as any).node.calc(fsn)(defn)
    }
  }));
  
  return dataflow({
    nodes: flownodes,
    edges: flowspec.edges().map(e => ({ key: e.key(), value: e.value() }))
  });
};