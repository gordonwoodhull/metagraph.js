import { as_keyvalue } from './core.js';
import { KeyValue, PatternSpecDescriptor, PatternSpecWithAst, PatternAstData, InterfaceNodeValue, DataflowNodeSpec, InterfaceEdgeSpec, AssertPattern } from './types.js';

type ExtractStringKeys<T> = Extract<keyof T, string>;

const toKeyValueArray = <T extends Record<string, unknown>>(record: T) =>
  as_keyvalue(record) as readonly KeyValue<ExtractStringKeys<T>, T[ExtractStringKeys<T>]>[];

export const definePattern = <
  InterfaceNodes extends Record<string, InterfaceNodeValue<ExtractStringKeys<InterfaceNodes>>>,
  DataflowNodes extends Record<string, DataflowNodeSpec>,
  InterfaceEdges extends Record<string, InterfaceEdgeSpec>
>(spec: AssertPattern<InterfaceNodes, DataflowNodes, InterfaceEdges>): PatternSpecWithAst<InterfaceNodes, DataflowNodes, InterfaceEdges> => {
  const dataflowNodes = toKeyValueArray(spec.dataflow.incidences);
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
