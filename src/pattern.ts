import { PatternSpec, PatternSpecWithAst, PatternDefinition, Graph, PatternGraph, DataflowInstance, KeyValue, Node, FlowFunction, GraphSpec } from './types.js';
import { as_array, as_keyvalue } from './core.js';
import { graph, graph_incidence, graph_detect } from './graph.js';
import { dataflow } from './dataflow.js';

/**
 * Creates a reusable graph pattern that can generate graph instances from data.
 * Patterns define the structure and behavior of graphs through dataflow and interface specifications.
 * 
 * @param spec - Pattern specification containing dataflow computation and interface definition
 * @param flowspecs - Optional additional flowspecs for composed patterns
 * @returns A pattern graph that can create instances via the 'create' method
 * 
 * @example
 * ```typescript
 * const graphPattern = pattern(graph_pattern());
 * const instance = graphPattern.node('Graph').value().create({
 *   nodes: [{key: 'a'}, {key: 'b'}],
 *   edges: [{key: 'e', value: {source: 'a', target: 'b'}}]
 * });
 * ```
 */
export function pattern(spec: PatternSpec, flowspecs?: Record<string, Graph>): Graph;

export function pattern<const Spec extends PatternSpec>(spec: Spec, flowspecs?: Record<string, Graph>): PatternGraph<Spec>;
export function pattern(spec: { dataflow?: GraphSpec; interface: GraphSpec }, flowspecs?: Record<string, Graph>): Graph;

export function pattern(
  spec: PatternSpec | { dataflow?: GraphSpec; interface: GraphSpec },
  flowspecs?: Record<string, Graph>
): Graph {
  const flowspec = spec.dataflow
    ? ('incidences' in spec.dataflow
        ? graph_incidence((spec.dataflow as { incidences: Record<string, unknown> }).incidences)
        : graph_detect(spec.dataflow))
    : undefined;
  const ast = hasPatternAst(spec) ? spec.ast : undefined;
  const interfaceNodes = ast?.interface.nodes ?? as_keyvalue(spec.interface.nodes);
  const interfaceEdges = ast?.interface.edges ?? as_keyvalue(spec.interface.edges);
  const interf = graph(interfaceNodes, interfaceEdges);
  const defn: PatternDefinition = { node: {}, edge: {} };

  interf.nodes().forEach(inode => {
    defn.node[inode.key()] = {
      members: {},
      class_members: {},
      wrap: (flow: DataflowInstance, val: unknown) => {
        const wrapper: Record<string, unknown> = {};
        const members = defn.node[inode.key()].members;
        Object.keys(members).forEach(name => {
          wrapper[name] = members[name].defn!(defn, flow, val);
        });
        return wrapper;
      }
    };
  });

  const resolve = (deps: string[], funfun: FlowFunction) => 
    (defn: PatternDefinition, flow: DataflowInstance, val: unknown) => {
      const action = funfun(defn, flow, val);
      return (...args: unknown[]) => 
        (action as Function).apply(null, deps.map(dep => {
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
    const evalue = iedge.value() as Record<string, unknown>;
    const fs = flowspec || flowspecs?.[ekey.split('.')[0]];
    const action = (evalue as {member?: {funfun?: Function}}).member;
    
    if (action && action.funfun) {
      const funfun = action.funfun!(fs, iedge, flowspecs);
      const deps = as_array((evalue as {deps?: string | string[]}).deps);
      const resolvedFunfun = resolve(deps, funfun);
      defn.node[iedge.source().key()].members[(evalue as {name: string}).name] = { defn: resolvedFunfun };
    }
  });

  interf.nodes().forEach(inode => {
    const nkey = inode.key();
    const nvalue = inode.value();
    const fs = flowspec || flowspecs?.[nkey.split('.')[0]];
    
    as_array(inode.value()).forEach((spec: Record<string, unknown>) => {
      as_keyvalue((spec as {class_members?: Record<string, unknown>}).class_members).forEach((cmemspec: KeyValue) => {
        defn.node[nkey].class_members[cmemspec.key] = (cmemspec.value as Function)(fs!, inode);
      });
      as_keyvalue((spec as {members?: Record<string, unknown>}).members).forEach((memspec: KeyValue) => {
        const mem = (memspec.value as Function)(fs!, inode);
        defn.node[nkey].members[memspec.key] = {
          accessor: mem.accessor,
          defn: mem.defn
        };
      });
    });
  });

  const inodes2 = interf.nodes().map(n => {
    const n2: KeyValue = { key: n.key(), value: {} as Record<string, unknown> };
    const class_members = defn.node[n.key()].class_members;
    Object.keys(class_members).forEach(name => {
      (n2.value as Record<string, unknown>)[name] = class_members[name].defn(defn);
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

  const patternGraph = graph_detect({ nodes: inodes2, edges: iedges2 });
  if (hasPatternAst(spec)) {
    return patternGraph as PatternGraph<typeof spec>;
  }
  return patternGraph;
}

function hasPatternAst(spec: PatternSpec | PatternSpecWithAst | { dataflow?: GraphSpec; interface: GraphSpec }): spec is PatternSpecWithAst {
  return typeof spec === 'object' && spec !== null && 'ast' in spec;
}

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
