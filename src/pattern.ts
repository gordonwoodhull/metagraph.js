import {
  PatternDefinition,
  Graph,
  DataflowInstance,
  KeyValue,
  Node,
  FlowFunction
} from './types.js';
import { as_array, as_keyvalue } from './core.js';
import { graph_detect } from './graph.js';
import { dataflow } from './dataflow.js';
import type {
  PatternSpecLiteral,
  AccessorImplementations,
  DataflowNodeLiteral,
  InterfaceMemberKind,
  InterfaceClassMemberKind,
  InterfaceNodeLiteral,
  InterfaceEdgeLiteral
} from './spec.js';
import {
  input,
  output,
  map,
  singleton,
  list,
  map_of_lists,
  subset
} from './dataflow_calcs.js';
import {
  createable,
  call,
  fetch,
  lookupArg,
  lookupFVal,
  lookupKVal,
  subgraph
} from './interface.js';

export interface PatternOptions<S extends PatternSpecLiteral> {
  accessors: AccessorImplementations<S>;
  flowspecs?: Record<string, Graph>;
}

type AccessorResolver = (key: string) => (...args: unknown[]) => unknown;

export interface PreparedPatternGraphs<S extends PatternSpecLiteral = PatternSpecLiteral> {
  spec?: S;
  flowspec?: Graph;
  interfaceGraph: Graph;
}

export const pattern = <S extends PatternSpecLiteral>(
  spec: S,
  options: PatternOptions<S>
): Graph => {
  const graphs = buildGraphsFromSpec(spec, options.accessors);
  return realisePatternGraph(graphs, options.flowspecs);
};

export const buildGraphsFromSpec = <S extends PatternSpecLiteral>(
  spec: S,
  accessors: AccessorImplementations<S>
): PreparedPatternGraphs<S> => {
  const resolveAccessor = createAccessorResolver(spec, accessors);
  return buildGraphs(spec, resolveAccessor);
};

export const realisePatternGraph = <S extends PatternSpecLiteral>(
  graphs: PreparedPatternGraphs<S>,
  flowspecs?: Record<string, Graph>
): Graph => {
  return instantiatePattern(graphs, flowspecs);
};

const buildGraphs = <S extends PatternSpecLiteral>(
  spec: S,
  resolveAccessor: AccessorResolver
): PreparedPatternGraphs<S> => {
  const dataflowNodes = Object.entries(spec.dataflow.nodes).map(([key, literal]) => ({
    key,
    value: convertDataflowNode(literal, resolveAccessor)
  }));

  const flowspec = dataflowNodes.length > 0
    ? graph_detect({ incidences: dataflowNodes })
    : undefined;

  const interfaceNodes = Object.entries(spec.interface.nodes).map(([key, literal]) => ({
    key,
    value: convertInterfaceNode(literal, resolveAccessor)
  }));

  const interfaceEdges = Object.entries(spec.interface.edges).map(([key, literal]) => ({
    key,
    value: convertInterfaceEdge(literal, resolveAccessor)
  }));

  const interfaceGraph = graph_detect({
    nodes: interfaceNodes,
    edges: interfaceEdges
  });

  return {
    spec,
    flowspec,
    interfaceGraph
  };
};

const createAccessorResolver = <S extends PatternSpecLiteral>(
  spec: S,
  accessors: AccessorImplementations<S>
): AccessorResolver => {
  const declared = new Set(Object.keys(spec.accessors));
  return (key: string) => {
    if (!declared.has(key)) {
      throw new Error(`Accessor "${key}" not declared in spec.`);
    }
    const fn = (accessors as Record<string, (...args: unknown[]) => unknown>)[key];
    if (!fn) {
      throw new Error(`Accessor "${key}" has no runtime implementation.`);
    }
    return fn;
  };
};

const convertDataflowNode = (
  literal: DataflowNodeLiteral,
  resolveAccessor: AccessorResolver
) => {
  const node: Record<string, unknown> = {
    node: resolveDataflowNode(literal, resolveAccessor)
  };
  if (literal.refs) {
    node.refs = literal.refs;
  }
  if (literal.ins) {
    node.ins = literal.ins;
  }
  return node;
};

const resolveDataflowNode = (
  literal: DataflowNodeLiteral,
  resolveAccessor: AccessorResolver
) => {
  switch (literal.kind) {
    case 'input':
      return input(literal.path);
    case 'output':
      return output();
    case 'singleton':
      return singleton();
    case 'map':
      return map();
    case 'list':
      return list();
    case 'map_of_lists': {
      const accessor = resolveAccessor(literal.accessor);
      return map_of_lists(accessor as (val: unknown) => string);
    }
    case 'subset':
      return subset();
    default: {
      const exhaustiveCheck: never = literal;
      throw new Error(`Unknown dataflow node kind: ${(exhaustiveCheck as any).kind}`);
    }
  }
};

const convertInterfaceNode = (
  literal: InterfaceNodeLiteral,
  resolveAccessor: AccessorResolver
) => {
  if (typeof literal === 'string') {
    return literal;
  }

  const pieces: Record<string, unknown>[] = [];

  if (literal.classMembers) {
    Object.entries(literal.classMembers).forEach(([name, descriptor]) => {
      pieces.push(convertClassMember(name, descriptor));
    });
  }

  if (literal.members) {
    Object.entries(literal.members).forEach(([name, descriptor]) => {
      pieces.push(convertMember(name, descriptor, resolveAccessor));
    });
  }

  if (pieces.length === 0) {
    return {};
  }
  if (pieces.length === 1) {
    return pieces[0];
  }
  return pieces;
};

const convertInterfaceEdge = (
  literal: InterfaceEdgeLiteral,
  resolveAccessor: AccessorResolver
) => {
  const edge: Record<string, unknown> = {
    source: literal.source,
    target: literal.target,
    name: literal.name
  };

  if (literal.deps) {
    edge.deps = literal.deps;
  }

  if (literal.member) {
    edge.member = convertEdgeMember(literal.member, resolveAccessor);
  }

  return edge;
};

const convertMember = (
  name: string,
  descriptor: InterfaceMemberKind,
  resolveAccessor: AccessorResolver
) => {
  switch (descriptor.kind) {
    case 'call':
      return call(name)(resolveAccessor(descriptor.accessor));
    case 'lookupArg':
      return descriptor.accessor
        ? lookupArg(resolveAccessor(descriptor.accessor))
        : lookupArg();
    case 'lookupFVal':
      return lookupFVal(resolveAccessor(descriptor.accessor));
    case 'lookupKVal':
      return lookupKVal();
    case 'fetch':
      return fetch();
    case 'subgraph':
      return subgraph();
    default: {
      const exhaustiveCheck: never = descriptor;
      throw new Error(`Unsupported interface member kind for node "${name}": ${(exhaustiveCheck as any).kind}`);
    }
  }
};

const convertClassMember = (name: string, descriptor: InterfaceClassMemberKind) => {
  switch (descriptor.kind) {
    case 'createable':
      if (name !== 'create') {
        throw new Error(`Unsupported class member "${name}" for createable descriptor.`);
      }
      return createable(descriptor.flow);
    default:
      throw new Error(`Unsupported interface class member: ${(descriptor as { kind: string }).kind}`);
  }
};

const convertEdgeMember = (
  descriptor: InterfaceMemberKind,
  resolveAccessor: AccessorResolver
) => {
  switch (descriptor.kind) {
    case 'fetch':
      return fetch();
    case 'lookupArg':
      return descriptor.accessor
        ? lookupArg(resolveAccessor(descriptor.accessor))
        : lookupArg();
    case 'lookupFVal':
      return lookupFVal(resolveAccessor(descriptor.accessor));
    case 'lookupKVal':
      return lookupKVal();
    case 'subgraph':
      return subgraph();
    default:
      throw new Error(`Unsupported edge member kind: ${(descriptor as { kind: string }).kind}`);
  }
};

const instantiatePattern = <S extends PatternSpecLiteral>(
  graphs: PreparedPatternGraphs<S>,
  flowspecs?: Record<string, Graph>
): Graph => {
  const { interfaceGraph, flowspec: baseFlowspec } = graphs;
  const defn: PatternDefinition = { node: {}, edge: {} };

  interfaceGraph.nodes().forEach(inode => {
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

  interfaceGraph.edges().forEach(iedge => {
    const ekey = iedge.key();
    const evalue = iedge.value() as Record<string, unknown>;
    const namespace = ekey.split('.')[0];
    const flowspec = baseFlowspec || flowspecs?.[namespace];
    const action = (evalue as { member?: { funfun?: Function } }).member;

    if (action && action.funfun) {
      const funfun = action.funfun!(flowspec, iedge, flowspecs);
      const deps = as_array((evalue as { deps?: string | string[] }).deps);
      const resolvedFunfun = resolve(deps, funfun);
      defn.node[iedge.source().key()].members[(evalue as { name: string }).name] = { defn: resolvedFunfun };
    }
  });

  interfaceGraph.nodes().forEach(inode => {
    const nkey = inode.key();
    const namespace = nkey.split('.')[0];
    const flowspec = baseFlowspec || flowspecs?.[namespace];

    as_array(inode.value()).forEach((spec: Record<string, unknown>) => {
      as_keyvalue((spec as { class_members?: Record<string, unknown> }).class_members).forEach((cmemspec: KeyValue<string, unknown>) => {
        defn.node[nkey].class_members[cmemspec.key] = (cmemspec.value as Function)(flowspec!, inode);
      });
      as_keyvalue((spec as { members?: Record<string, unknown> }).members).forEach((memspec: KeyValue<string, unknown>) => {
        const mem = (memspec.value as Function)(flowspec!, inode);
        defn.node[nkey].members[memspec.key] = {
          accessor: mem.accessor,
          defn: mem.defn
        };
      });
    });
  });

  const inodes = interfaceGraph.nodes().map(n => {
    const vnode: KeyValue = { key: n.key(), value: {} as Record<string, unknown> };
    const class_members = defn.node[n.key()].class_members;
    Object.keys(class_members).forEach(name => {
      (vnode.value as Record<string, unknown>)[name] = class_members[name].defn(defn);
    });
    return vnode;
  });

  const iedges = interfaceGraph.edges().map(e => ({
    key: e.key(),
    value: {
      source: e.source().key(),
      target: e.target().key()
    }
  }));

  return graph_detect({ nodes: inodes, edges: iedges });
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
