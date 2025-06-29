import { InterfaceSpec, PatternDefinition, DataflowInstance, Graph, Edge, Node } from './types.js';
import { as_array } from './core.js';
import { define_dataflow } from './pattern.js';

export const createable = (flowkey: string) => ({
  class_members: {
    create: (flowspec: Graph, inode: Node) => ({
      defn: (defn: PatternDefinition) => {
        const flowg = define_dataflow(flowspec, defn);
        return (data: any) => {
          const env: any = {};
          const flow = flowg.instantiate(env, { data });
          env[flowkey] = defn.node[inode.key()].wrap(flow, data[inode.key()]);
          return env[flowkey];
        };
      }
    })
  }
});

export const call = (methodname: string) => (f: (val: any) => any) => ({
  members: [{
    key: methodname,
    value: (flowspec: Graph, inode: Node) => ({
      accessor: f,
      defn: (defn: PatternDefinition, flow: DataflowInstance, val: any) => () => f(val)
    })
  }]
});

export const key = call('key');
export const value = call('value');

export const reference = (inode: Node) => ({
  reference: inode
});

export const fetch = () => ({
  funfun: (flowspec: Graph, iedge: Edge) => 
    (defn: PatternDefinition, flow: DataflowInstance) => 
      (x: any) => () => x
});

export const lookupArg = (access?: (x: any) => any) => ({
  funfun: (flowspec: Graph, iedge: Edge) => {
    const accessor = access || ((x: any) => x);
    return (defn: PatternDefinition, flow: DataflowInstance, val: any) => 
      (map: Record<string, any>) => 
        (key: any) => map[accessor(key)];
  }
});

export const lookupFVal = (access: (val: any) => any) => ({
  funfun: (flowspec: Graph, iedge: Edge) =>
    (defn: PatternDefinition, flow: DataflowInstance, val: any) =>
      (map: Record<string, any>) => () => map[access(val)]
});

export const lookupKVal = () => ({
  funfun: (flowspec: Graph, iedge: Edge) =>
    (defn: PatternDefinition, flow: DataflowInstance, val: any) =>
      (map: Record<string, any>) => () =>
        map[defn.node[iedge.source().key()].members.key.accessor(val)] || []
});

export const subgraph = () => ({
  funfun: (flowspec: Graph, iedge: Edge, flowspecs?: Record<string, Graph>) =>
    (defn: PatternDefinition, flow: DataflowInstance, val: any) => {
      const subflow = define_dataflow(flowspec, defn);
      let graflow = subflow;
      const parts = iedge.target().key().split('.');
      if (parts.length > 1) {
        const dest = parts[0];
        graflow = define_dataflow(flowspecs![dest], defn);
      }
      return () => (nodeKeys: string[], edgeKeys: string[], gdata: any) => {
        const sgflow = subflow.instantiate({}, {
          data: {
            nodeKeys,
            edgeKeys
          },
          parent: flow
        });
        const genv: any = {};
        const gflow = graflow.instantiate(genv, {
          data: sgflow
        });
        genv.graph = defn.node[iedge.target().key()].wrap(gflow, gdata);
        return genv.graph;
      };
    }
});