import { Graph, InterfaceNodeValue, InterfaceEdgeSpec, PatternSpecWithAst, PatternGraph, CompositionSpec, ComposePatternSpec, KeyValue, DataflowNodeAst } from './types.js';
import { as_array } from './core.js';
import { topological_sort } from './topological_sort.js';
import { graph, graph_detect, graph_incidence } from './graph.js';
import { pattern } from './pattern.js';
import { definePattern } from './pattern_spec.js';
import { buildDataflowIncidences } from './dataflow_ast.js';
import { createNameMapper, NameMapper } from './compose_name_mapper.js';

/**
 * Composes multiple graph patterns into a single unified pattern.
 * Resolves dependencies between patterns and creates a combined interface.
 *
 * @param composition - A graph where nodes are patterns and edges define dependencies
 * @returns A composed pattern that combines all input patterns
 */
export function compose<const Spec extends CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, { source: Extract<keyof Spec['nodes'], string>; target: Extract<keyof Spec['nodes'], string>; input?: string }>>>(
  composition: Spec
): PatternGraph<ComposePatternSpec<Spec>>;
export function compose(composition: Graph): Graph;
export function compose(
  composition: Graph | CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, { source: string; target: string; input?: string }>>
): Graph {
  const isGraphInput = isGraphInstance(composition);
  const compositionGraph = isGraphInput ? composition : graph_detect(composition as CompositionSpec<Record<string, PatternSpecWithAst>, Record<string, { source: string; target: string; input?: string }>>);
  const sorted = topological_sort(compositionGraph);
  const mapName = createNameMapper(compositionGraph);

  const flowspecs: Record<string, Graph> = {};
  const globalDataflowNodes: DataflowNodeAst<string>[] = [];
  const interfaceNodeEntries: KeyValue<string, InterfaceNodeValue<string>>[] = [];
  const interfaceEdgeEntries: KeyValue<string, InterfaceEdgeSpec>[] = [];
  const originalDataflowKeys: Record<string, Set<string>> = {};

  sorted.forEach(patnode => {
    const patternKey = patnode.key();
    const spec = patnode.value() as PatternSpecWithAst;
    if (!hasPatternAst(spec)) {
      throw new Error(`compose() requires patterns defined via definePattern; pattern "${patternKey}" is missing AST data`);
    }

    originalDataflowKeys[patternKey] = new Set(spec.ast.dataflow.nodes.map(node => node.key));
    const patternDataflowNodes = spec.ast.dataflow.nodes.map(node => namespaceDataflowNode(patternKey, node, mapName));
    globalDataflowNodes.push(...patternDataflowNodes);
    flowspecs[patternKey] = graph_incidence(buildDataflowIncidences(patternDataflowNodes));

    const patternInterfaceNodes = spec.ast.interface.nodes.map(node => namespaceInterfaceNode(patternKey, node, mapName));
    interfaceNodeEntries.push(...patternInterfaceNodes);

    const patternInterfaceEdges = spec.ast.interface.edges.map(edge => namespaceInterfaceEdge(patternKey, edge, mapName, originalDataflowKeys));
    if (process.env.DEBUG_DEPS === 'true' && patternKey === 'sg') {
      patternInterfaceEdges.forEach(edge => {
        console.log('namespaced edge', edge.key, edge.value.deps, edge.value.depsOriginal);
      });
    }
    interfaceEdgeEntries.push(...patternInterfaceEdges);
  });

  const interfaceGraph = graph(interfaceNodeEntries, interfaceEdgeEntries);
  const nodes: KeyValue<string, InterfaceNodeValue<string>>[] = [];
  const edges: KeyValue<string, InterfaceEdgeSpec>[] = [];
  const mappings: Record<string, string> = {};

  const lookup = (key: string) => mappings[key] || key;

  interfaceGraph.nodes().forEach(inode => {
    const key = inode.key();
    const ref = as_array(inode.value()).find((spec: unknown) => typeof spec === 'string') as string | undefined;
    if (ref) {
      const patternKey = key.split('.')[0];
      mappings[key] = mapName(patternKey, ref);
    } else {
      nodes.push({ key, value: inode.value() as InterfaceNodeValue<string> });
    }
  });

  interfaceGraph.edges().forEach(iedge => {
    const evalue = iedge.value() as InterfaceEdgeSpec;
    const edgePatternKey = iedge.key().split('.')[0];
    const source = lookup(evalue.source);
    const target = lookup(evalue.target);
    const deps = resolveDeps(
      edgePatternKey,
      evalue.deps,
      evalue.depsOriginal,
      source,
      target,
      mapName,
      originalDataflowKeys
    );
    edges.push({
      key: iedge.key(),
      value: {
        name: evalue.name,
        source,
        target,
        deps,
        depsOriginal: evalue.depsOriginal,
        member: evalue.member,
        flow: evalue.flow
      }
    });
  });

  const interfaceNodeRecord = nodes.reduce<Record<string, InterfaceNodeValue<string>>>((acc, kv) => {
    acc[kv.key] = kv.value;
    return acc;
  }, {});

  const interfaceEdgeRecord = edges.reduce<Record<string, InterfaceEdgeSpec>>((acc, kv) => {
    acc[kv.key] = kv.value;
    return acc;
  }, {});

  const composedSpec = definePattern({
    dataflow: { incidences: buildDataflowIncidences(globalDataflowNodes) },
    interface: { nodes: interfaceNodeRecord, edges: interfaceEdgeRecord }
  });

  const result = pattern(composedSpec, flowspecs);
  return isGraphInput ? result : result as PatternGraph<ComposePatternSpec<typeof composition>>;
}

const isGraphInstance = (value: unknown): value is Graph =>
  !!value && typeof value === 'object' && typeof (value as Graph).nodes === 'function' && typeof (value as Graph).edges === 'function';

const hasPatternAst = (value: unknown): value is PatternSpecWithAst =>
  !!value && typeof value === 'object' && 'ast' in value;

const namespaceDataflowNode = (patternKey: string, node: DataflowNodeAst<string>, mapName: NameMapper): DataflowNodeAst<string> => ({
  key: mapName(patternKey, node.key),
  factory: node.factory,
  refs: mapDataflowList(patternKey, node.refs, mapName),
  ins: mapDataflowList(patternKey, node.ins, mapName),
  deps: mapDataflowList(patternKey, node.deps, mapName),
  original: node.original ?? {
    key: node.key,
    refs: node.refs,
    ins: node.ins,
    deps: node.deps
  }
});

const mapDataflowList = (patternKey: string, list: readonly string[], mapName: NameMapper): readonly string[] =>
  list.map(item => mapName(patternKey, item));

const namespaceInterfaceNode = (
  patternKey: string,
  node: KeyValue<string, InterfaceNodeValue<string>>,
  mapName: NameMapper
): KeyValue<string, InterfaceNodeValue<string>> => ({
  key: mapName(patternKey, node.key),
  value: namespaceInterfaceNodeValue(patternKey, node.value, mapName)
});

const namespaceInterfaceNodeValue = (
  patternKey: string,
  value: InterfaceNodeValue<string>,
  mapName: NameMapper
): InterfaceNodeValue<string> => {
  if (typeof value === 'string') {
    return mapName(patternKey, value);
  }
  if (Array.isArray(value)) {
    return value.map(item =>
      typeof item === 'string'
        ? mapName(patternKey, item)
        : namespaceInterfaceNodeValue(patternKey, item as InterfaceNodeValue<string>, mapName)
    ) as InterfaceNodeValue<string>;
  }
  return value;
};

const namespaceInterfaceEdge = (
  patternKey: string,
  edge: KeyValue<string, InterfaceEdgeSpec>,
  mapName: NameMapper,
  dataflowKeys: Record<string, Set<string>>
): KeyValue<string, InterfaceEdgeSpec> => {
  const source = mapName(patternKey, edge.value.source);
  const target = mapName(patternKey, edge.value.target);
  return {
    key: mapName(patternKey, edge.key),
    value: {
      name: edge.value.name,
      source,
      target,
      deps: edge.value.deps,
      depsOriginal: edge.value.depsOriginal ?? edge.value.deps,
      member: edge.value.member,
      flow: edge.value.flow
    }
  };
};

const resolveDeps = (
  patternKey: string,
  deps: InterfaceEdgeSpec['deps'],
  depsOriginal: InterfaceEdgeSpec['depsOriginal'],
  source: string,
  target: string,
  mapName: NameMapper,
  dataflowKeys: Record<string, Set<string>>
): InterfaceEdgeSpec['deps'] => {
  const toArray = (value: InterfaceEdgeSpec['deps']): string[] => {
    if (value == null) return [];
    return Array.isArray(value) ? value as string[] : [value as string];
  };

  const originals = toArray(depsOriginal ?? deps);
  if (originals.length === 0) return undefined;

  const mapped = originals.map(name => mapDependency(patternKey, name, source, target, mapName, dataflowKeys));
  if (mapped.length === 1) return mapped[0];
  return mapped;
};

const mapDependency = (
  patternKey: string,
  name: string,
  source: string,
  target: string,
  mapName: NameMapper,
  dataflowKeys: Record<string, Set<string>>
): string => {
  if (!name) return name;
  if (name.includes('.')) {
    return mapName(patternKey, name);
  }
  const sourcePattern = source.split('.')[0];
  const targetPattern = target.split('.')[0];
  const hasKey = (key: string | undefined, dep: string) => (key ? dataflowKeys[key]?.has(dep) : false);

  if (hasKey(sourcePattern, name)) {
    return `${sourcePattern}.${name}`;
  }
  if (hasKey(patternKey, name)) {
    return `${patternKey}.${name}`;
  }
  if (hasKey(targetPattern, name)) {
    return `${targetPattern}.${name}`;
  }
  return mapName(patternKey, name);
};
