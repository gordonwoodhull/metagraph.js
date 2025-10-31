import { graph_detect } from './graph.js';
import { topological_sort } from './topological_sort.js';
import type { Graph, Node as PatternNode, Edge as PatternEdge } from './types.js';
import { as_array } from './core.js';
import type { PatternSpecLiteral, AccessorImplementations } from './spec.js';
import { buildGraphsFromSpec, realisePatternGraph } from './pattern.js';
import type { PatternGraphType } from './pattern_types.js';
import type { ExternalNamespaceMap, DataflowOutputs, NamespaceDescriptor } from './pattern_dataflow.js';

type CompositionNodeLiteral<
  S extends PatternSpecLiteral = PatternSpecLiteral,
  A extends AccessorImplementations<S> = AccessorImplementations<S>
> = {
  readonly spec: S;
  readonly accessors: A;
};

type CompositionNodes = Record<string, CompositionNodeLiteral>;

type CompositionEdgeLiteral<Nodes extends CompositionNodes = CompositionNodes> = {
  readonly source: keyof Nodes & string;
  readonly target: string;
  readonly input: string;
};

type CompositionEdges<Nodes extends CompositionNodes = CompositionNodes> =
  Record<string, CompositionEdgeLiteral<Nodes>>;

export type CompositionLiteral<
  Nodes extends CompositionNodes = CompositionNodes,
  Edges extends CompositionEdges<Nodes> = CompositionEdges<Nodes>
> = {
  readonly nodes: Nodes;
  readonly edges: Edges;
};

type NamespaceDescriptorFromNode<
  C extends CompositionLiteral,
  Key extends keyof C['nodes'] & string
> = NamespaceDescriptor<
  C['nodes'][Key]['spec'],
  C['nodes'][Key]['accessors'],
  DataflowOutputs<C['nodes'][Key]['spec'], C['nodes'][Key]['accessors']>
>;

type NamespaceMapFromComposition<C extends CompositionLiteral> = {
  [EdgeKey in keyof C['edges'] & string as C['edges'][EdgeKey]['input'] extends infer NS extends string ? NS : never]:
    C['edges'][EdgeKey]['source'] extends infer Source extends keyof C['nodes'] & string
      ? NamespaceDescriptorFromNode<C, Source>
      : never;
};

type MergeNamespaceMaps<Base extends ExternalNamespaceMap, Extra extends ExternalNamespaceMap> =
  Extra & Omit<Base, keyof Extra>;

interface CompositionEdgeValue {
  readonly input: string;
}

export const compose = <
  C extends CompositionLiteral,
  NamespaceOverrides extends ExternalNamespaceMap = {}
>(
  composition: C,
  namespaces?: NamespaceOverrides
): PatternGraphType<
  PatternSpecLiteral,
  AccessorImplementations<PatternSpecLiteral>,
  MergeNamespaceMaps<NamespaceMapFromComposition<C>, NamespaceOverrides>
> => {
  const compositionGraph = graph_detect(composition);
  const sorted = topological_sort(compositionGraph);
  const composedInterfaces: Record<string, Graph> = {};
  const flowspecs: Record<string, Graph> = {};

  const inputEdgeFor = (patnode: PatternNode, name: string) =>
    patnode.ins().find((edge: PatternEdge<CompositionEdgeValue>) => edge.value().input === name);

  sorted.forEach(patnode => {
    const { spec, accessors } = patnode.value() as CompositionNodeLiteral;
    const graphs = buildGraphsFromSpec(spec, accessors);
    const flowspecGraph = graphs.flowspec;

    if (flowspecGraph) {
      const remappedFlowNodes = flowspecGraph.nodes().map(fnode => {
        const value = { ...fnode.value() } as Record<string, unknown>;
        const refs = value.refs as string | readonly string[] | undefined;
        if (refs) {
          const refsArray = Array.isArray(refs) ? [...refs] : refs;
          value.refs = as_array<string>(refsArray as string | string[] | undefined).map(ref => {
            const parts = ref.split('.');
            if (parts.length > 1) {
              const edge = inputEdgeFor(patnode, parts[0]);
              if (!edge) {
                throw new Error(`Missing composition edge for namespace "${parts[0]}"`);
              }
              return `${edge.source().key()}.${parts[1]}`;
            }
            return `${patnode.key()}.${parts[0]}`;
          });
        }
        return {
          key: fnode.key(),
          value
        };
      });

      const remappedFlowEdges = flowspecGraph.edges().map(edge => ({
        key: edge.key(),
        value: edge.value()
      }));

      flowspecs[patnode.key()] = graph_detect({
        nodes: remappedFlowNodes,
        edges: remappedFlowEdges
      });
    }

    composedInterfaces[patnode.key()] = graphs.interfaceGraph;
  });

  const finalNodes: { key: string; value: unknown }[] = [];
  const finalEdges: { key: string; value: Record<string, unknown> }[] = [];
  const aliasMap: Record<string, string> = {};

  const resolveAlias = (key: string): string => aliasMap[key] || key;

  sorted.forEach(patnode => {
    const interf = composedInterfaces[patnode.key()];
    interf.nodes().forEach(inode => {
      const composedKey = `${patnode.key()}.${inode.key()}`;
      const alias = as_array(inode.value()).find((spec: unknown) => typeof spec === 'string');
      if (alias && typeof alias === 'string') {
        const [namespace, target] = alias.split('.');
        const edge = inputEdgeFor(patnode, namespace);
        if (!edge) {
          throw new Error(`Missing composition edge for namespace "${namespace}"`);
        }
        aliasMap[composedKey] = resolveAlias(`${edge.source().key()}.${target}`);
      } else {
        finalNodes.push({
          key: composedKey,
          value: inode.value()
        });
      }
    });

    interf.edges().forEach(iedge => {
      const edgeValue = { ...iedge.value() } as Record<string, unknown>;
      edgeValue.source = resolveAlias(`${patnode.key()}.${iedge.source().key()}`);
      edgeValue.target = resolveAlias(`${patnode.key()}.${iedge.target().key()}`);
      finalEdges.push({
        key: `${patnode.key()}.${iedge.key()}`,
        value: edgeValue
      });
    });
  });

  const interfaceGraph = graph_detect({
    nodes: finalNodes,
    edges: finalEdges
  });

  return realisePatternGraph(
    {
      spec: undefined,
      accessors: {} as AccessorImplementations<PatternSpecLiteral>,
      interfaceGraph,
      namespaces: undefined
    },
    flowspecs
  );
};
