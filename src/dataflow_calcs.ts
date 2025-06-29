import { DataflowNode, PatternDefinition, DataflowInstance } from './types.js';
import { as_array, build_map } from './core.js';

export const input = (path?: string) => ({
  calc: (fnode: any) => {
    const actualPath = path || fnode.key();
    const parts = actualPath.split('.');
    const [namespace, name] = parts.length > 1 ? parts : ['data', actualPath];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => () => 
      flow.input(namespace, name);
  }
});

export const output = (name?: string, namespace?: string) => ({
  calc: (fnode: any) => (defn: PatternDefinition) => (flow: DataflowInstance) => (x: any) => x
});

export const map = () => ({
  calc: (fnode: any) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (data: any[]) =>
      build_map(
        data,
        defn.node[iref].members.key.accessor,
        defn.node[iref].wrap.bind(null, flow)
      );
  }
});

export const singleton = () => ({
  calc: (fnode: any) => (defn: PatternDefinition) => (flow: DataflowInstance) => () => {
    throw new Error('singleton not initialized');
  }
});

export const list = () => ({
  calc: (fnode: any) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (data: any[], map: Record<string, any>) =>
      data.map(val => map[defn.node[iref].members.key.accessor(val)]);
  }
});

export const map_of_lists = (accessor: (val: any) => string) => ({
  calc: (fnode: any) => (defn: PatternDefinition) => (flow: DataflowInstance) => (data: any[], map: Record<string, any>) => {
    const iref = as_array(fnode.value().refs)[0];
    return data.reduce((o, v) => {
      const key = accessor(v);
      const list = o[key] = o[key] || [];
      list.push(map[defn.node[iref].members.key.accessor(v)]);
      return o;
    }, {} as Record<string, any[]>);
  }
});

export const subset = () => ({
  calc: (fnode: any) => {
    const iref = as_array(fnode.value().refs)[0];
    return (defn: PatternDefinition) => (flow: DataflowInstance) => (items: any[], keys: string[]) => {
      const keySet = new Set(keys);
      return items.filter(r => keySet.has(defn.node[iref].members.key.accessor(r)));
    };
  }
});