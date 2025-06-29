import { Graph } from './types.js';
import { as_array, as_keyvalue } from './core.js';
import { topological_sort } from './topological_sort.js';
import { graph_detect } from './graph.js';
import { pattern } from './pattern.js';

export const compose = (composition: Graph) => {
  const sorted = topological_sort(composition);
  const built: Record<string, Graph> = {};
  const flowspecs: Record<string, Graph> = {};

  const input_edge = (patnode: any, name: string) =>
    patnode.ins().find((pe: any) => pe.value().input === name);

  // resolve dependencies and build patterns
  sorted.forEach(patnode => {
    const flowspec = graph_detect(patnode.value().dataflow);
    const fnodes = flowspec.nodes().map(fn => {
      const v2 = Object.assign({}, fn.value());
      v2.refs = as_array(v2.refs).map((ref: string) => {
        const parts = ref.split('.');
        if (parts.length > 1) {
          const patedge = input_edge(patnode, parts[0]);
          return patedge.source().key() + '.' + parts[1];
        }
        else return patnode.key() + '.' + parts[0];
      });
      return {
        key: fn.key(),
        value: v2
      };
    });
    const fedges = flowspec.edges().map(e => ({ key: e.key(), value: e.value() }));
    flowspecs[patnode.key()] = graph_detect({ nodes: fnodes, edges: fedges });
    const interf = patnode.value().interface;
    built[patnode.key()] = graph_detect({
      nodes: interf.nodes,
      edges: interf.edges
    });
  });

  // unite patterns
  const nodes: any[] = [];
  const edges: any[] = [];
  const mappings: Record<string, string> = {};
  
  const lookup = (key: string) => mappings[key] || key;

  sorted.forEach(patnode => {
    const pattern = built[patnode.key()];
    pattern.nodes().forEach(inode => {
      const key = patnode.key() + '.' + inode.key();
      const ref = as_array(inode.value()).find((spec: any) => typeof spec === 'string');
      if (ref) {
        const parts = ref.split('.');
        const patedge = input_edge(patnode, parts[0]);
        const key2 = lookup(patedge.source().key() + '.' + parts[1]);
        mappings[key] = key2;
      }
      else nodes.push({
        key: key,
        value: inode.value()
      });
    });
    pattern.edges().forEach(iedge => {
      const val2 = Object.assign({}, iedge.value());
      val2.source = lookup(patnode.key() + '.' + iedge.source().key());
      val2.target = lookup(patnode.key() + '.' + iedge.target().key());
      edges.push({
        key: patnode.key() + '.' + iedge.key(),
        value: val2
      });
    });
  });

  return pattern({
    interface: {
      nodes,
      edges
    }
  }, flowspecs);
};