import { DataflowAst, DataflowNodeSpec, GraphSpec, KeyValue } from './types.js';

export interface DataflowTransformOptions {
  key?: (key: string) => string;
  ref?: (ref: string) => string;
  link?: (node: string) => string;
  dep?: (dep: string) => string;
}

const applyTransform = (value: string, transform?: (value: string) => string): string =>
  transform ? transform(value) : value;

const toNamespacedList = (values: readonly string[], transform?: (value: string) => string) => {
  if (!values.length) return undefined;
  const mapped = values.map(value => applyTransform(value, transform));
  if (!mapped.length) return undefined;
  return mapped.length === 1 ? mapped[0] : mapped;
};

export const buildDataflowIncidences = (
  nodes: DataflowAst,
  options: DataflowTransformOptions = {}
): Record<string, DataflowNodeSpec> => {
  const incidences: Record<string, DataflowNodeSpec> = {};

  nodes.forEach(node => {
    const key = applyTransform(node.key, options.key);
    incidences[key] = {
      node: node.factory,
      refs: toNamespacedList(node.refs, options.ref),
      ins: toNamespacedList(node.ins, options.link),
      deps: toNamespacedList(node.deps, options.dep ?? options.link)
    };
  });

  return incidences;
};

export const buildDataflowGraphSpec = (
  nodes: DataflowAst,
  options: DataflowTransformOptions = {}
): GraphSpec<DataflowNodeSpec> => {
  const incidences = buildDataflowIncidences(nodes, options);
  return { incidences };
};
