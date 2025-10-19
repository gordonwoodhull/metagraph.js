import { KeyValue, PatternSpecDescriptor, PatternSpecWithAst, PatternAstData, InterfaceNodeValue, DataflowNodeSpec, InterfaceEdgeSpec, AssertPattern, DataflowNodeAst } from './types.js';

type ExtractStringKeys<T> = Extract<keyof T, string>;

const toKeyValueArray = <T extends Record<string, unknown>>(record: T) => {
  const keys = Object.keys(record) as ExtractStringKeys<T>[];
  return keys.map((key) => ({
    key,
    value: record[key]
  })) as readonly KeyValue<ExtractStringKeys<T>, T[ExtractStringKeys<T>]>[];
};

const normalizeList = (value: DataflowNodeSpec['refs']): readonly string[] => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map(item => item as string);
};

export const definePattern = <
  InterfaceNodes extends Record<string, InterfaceNodeValue<ExtractStringKeys<InterfaceNodes>>>,
  DataflowNodes extends Record<string, DataflowNodeSpec>,
  InterfaceEdges extends Record<string, InterfaceEdgeSpec>
>(spec: AssertPattern<InterfaceNodes, DataflowNodes, InterfaceEdges>): PatternSpecWithAst<InterfaceNodes, DataflowNodes, InterfaceEdges> => {
  const dataflowNodes: DataflowNodeAst<ExtractStringKeys<DataflowNodes>>[] =
    Object.keys(spec.dataflow.incidences).map(key => {
      const nodeSpec = spec.dataflow.incidences[key as ExtractStringKeys<DataflowNodes>];
      return {
        key: key as ExtractStringKeys<DataflowNodes>,
        factory: nodeSpec.node,
        refs: normalizeList(nodeSpec.refs),
        ins: normalizeList(nodeSpec.ins),
        deps: normalizeList(nodeSpec.deps),
        original: {
          key: key as ExtractStringKeys<DataflowNodes>,
          refs: normalizeList(nodeSpec.refs),
          ins: normalizeList(nodeSpec.ins),
          deps: normalizeList(nodeSpec.deps)
        }
      };
    });
  const interfaceNodes = toKeyValueArray(spec.interface.nodes);
  const interfaceEdges = toKeyValueArray(spec.interface.edges);

  const ast: PatternAstData<InterfaceNodes, DataflowNodes, InterfaceEdges> = {
    dataflow: { nodes: dataflowNodes },
    interface: {
      nodes: interfaceNodes,
      edges: interfaceEdges
    }
  };

  return Object.assign({ ast }, spec);
};

export const makePatternSpec = definePattern;
