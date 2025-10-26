import type { Graph, Node as PatternNode, Edge as PatternEdge } from './types.js';
import { as_array } from './core.js';
import { topological_sort } from './topological_sort.js';
import { graph_detect } from './graph.js';
import type { PatternSpecLiteral, AccessorImplementations } from './spec.js';
import { toLegacyPatternSpec, buildLegacyPatternGraph } from './pattern.js';

interface CompositionNode<S extends PatternSpecLiteral = PatternSpecLiteral> {
  spec: S;
  accessors: AccessorImplementations<S>;
}

interface CompositionEdge {
  input: string;
}

/**
 * Composes multiple pattern specs into a single runtime pattern. Each node in
 * the composition graph supplies a frozen spec literal alongside the runtime
 * accessor implementations required by that spec.
 */
export const compose = (composition: Graph<CompositionNode, CompositionEdge>) => {
  const sorted = topological_sort(composition);
  const composedInterfaces: Record<string, Graph> = {};
  const flowspecs: Record<string, Graph> = {};

  const inputEdgeFor = (patnode: PatternNode<CompositionNode>, name: string) =>
    patnode.ins().find((edge: PatternEdge<CompositionEdge>) => edge.value().input === name);

  sorted.forEach(patnode => {
    const { spec, accessors } = patnode.value();
    const legacySpec = toLegacyPatternSpec(spec, accessors);
    const flowspecGraph = graph_detect(legacySpec.dataflow);

    const remappedFlowNodes = flowspecGraph.nodes().map(fnode => {
      const value = { ...fnode.value() } as Record<string, unknown>;
      if (value.refs) {
        value.refs = as_array(value.refs).map((ref: string) => {
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

    composedInterfaces[patnode.key()] = graph_detect(legacySpec.interface);
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

  return buildLegacyPatternGraph(
    {
      interface: {
        nodes: finalNodes,
        edges: finalEdges
      }
    },
    flowspecs
  );
};
