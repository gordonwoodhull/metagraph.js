import {
  PatternSpec as LegacyPatternSpec,
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
  InterfaceClassMemberKind
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

export const pattern = <S extends PatternSpecLiteral>(
  spec: S,
  options: PatternOptions<S>
): Graph => {
  const legacy = convertPatternSpec(spec, options.accessors);
  return buildLegacyPattern(legacy, options.flowspecs);
};

const convertPatternSpec = <S extends PatternSpecLiteral>(
  spec: S,
  accessors: AccessorImplementations<S>
): LegacyPatternSpec => {
  const resolveAccessor = createAccessorResolver(spec, accessors);

  const dataflowNodes = Object.entries(spec.dataflow.nodes).reduce(
    (acc, [key, literal]) => {
      acc[key] = convertDataflowNode(key, literal, resolveAccessor);
      return acc;
    },
    {} as Record<string, Record<string, unknown>>
  );

  const interfaceNodes = Object.entries(spec.interface.nodes).reduce(
    (acc, [key, literal]) => {
      if (typeof literal === 'string') {
        acc[key] = literal;
        return acc;
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
        acc[key] = {};
      } else if (pieces.length === 1) {
        acc[key] = pieces[0];
      } else {
        acc[key] = pieces;
      }
      return acc;
    },
    {} as Record<string, unknown>
  );

  const interfaceEdges = Object.entries(spec.interface.edges).reduce(
    (acc, [key, literal]) => {
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
      acc[key] = edge;
      return acc;
    },
    {} as Record<string, Record<string, unknown>>
  );

  return {
    dataflow: {
      incidences: dataflowNodes
    },
    interface: {
      nodes: interfaceNodes,
      edges: interfaceEdges
    }
  };
};

export const toLegacyPatternSpec = <S extends PatternSpecLiteral>(
  spec: S,
  accessors: AccessorImplementations<S>
) => convertPatternSpec(spec, accessors);

const createAccessorResolver = <S extends PatternSpecLiteral>(
  spec: S,
  accessors: AccessorImplementations<S>
) => {
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
  _key: string,
  literal: DataflowNodeLiteral,
  resolveAccessor: (key: string) => (...args: unknown[]) => unknown
) => {
  const result: Record<string, unknown> = {
    node: resolveDataflowNode(literal, resolveAccessor)
  };
  if (literal.refs) {
    result.refs = literal.refs;
  }
  if (literal.ins) {
    result.ins = literal.ins;
  }
  return result;
};

const resolveDataflowNode = (
  literal: DataflowNodeLiteral,
  resolveAccessor: (key: string) => (...args: unknown[]) => unknown
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

const convertMember = (
  name: string,
  descriptor: InterfaceMemberKind,
  resolveAccessor: (key: string) => (...args: unknown[]) => unknown
) => {
  switch (descriptor.kind) {
    case 'call':
      return call(name)(resolveAccessor(descriptor.accessor));
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
    default: {
      const exhaustiveCheck: never = descriptor;
      throw new Error(`Unsupported interface class member: ${(exhaustiveCheck as any).kind}`);
    }
  }
};

const convertEdgeMember = (
  descriptor: InterfaceMemberKind,
  resolveAccessor: (key: string) => (...args: unknown[]) => unknown
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
    default: {
      const exhaustiveCheck: never = descriptor;
      throw new Error(`Unsupported edge member kind: ${(exhaustiveCheck as any).kind}`);
    }
  }
};

const buildLegacyPattern = (spec: LegacyPatternSpec, flowspecs?: Record<string, Graph>): Graph => {
  const flowspec = spec.dataflow && graph_detect(spec.dataflow);
  const interf = graph_detect(spec.interface);
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
    const action = (evalue as { member?: { funfun?: Function } }).member;

    if (action && action.funfun) {
      const funfun = action.funfun!(fs, iedge, flowspecs);
      const deps = as_array((evalue as { deps?: string | string[] }).deps);
      const resolvedFunfun = resolve(deps, funfun);
      defn.node[iedge.source().key()].members[(evalue as { name: string }).name] = { defn: resolvedFunfun };
    }
  });

  interf.nodes().forEach(inode => {
    const nkey = inode.key();
    const fs = flowspec || flowspecs?.[nkey.split('.')[0]];

    as_array(inode.value()).forEach((spec: Record<string, unknown>) => {
      as_keyvalue((spec as { class_members?: Record<string, unknown> }).class_members).forEach((cmemspec: KeyValue) => {
        defn.node[nkey].class_members[cmemspec.key] = (cmemspec.value as Function)(fs!, inode);
      });
      as_keyvalue((spec as { members?: Record<string, unknown> }).members).forEach((memspec: KeyValue) => {
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

  return graph_detect({ nodes: inodes2, edges: iedges2 });
};

export const buildLegacyPatternGraph = (spec: LegacyPatternSpec, flowspecs?: Record<string, Graph>) =>
  buildLegacyPattern(spec, flowspecs);

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
