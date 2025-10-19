import { describe, it, expect } from 'vitest';
import { graph_pattern } from '../src/graph_pattern.js';
import { buildDataflowIncidences } from '../src/dataflow_ast.js';

describe('dataflow AST helper', () => {
  const toList = (value: unknown): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value.slice() : [value as string];
  };

  it('reconstructs original dataflow incidences for graph pattern', () => {
    const spec = graph_pattern();
    const incidencesFromAst = buildDataflowIncidences(spec.ast.dataflow.nodes);
    const originalIncidences = spec.dataflow.incidences;

    expect(Object.keys(incidencesFromAst)).toEqual(Object.keys(originalIncidences));

    Object.keys(originalIncidences).forEach(key => {
      const built = incidencesFromAst[key];
      const original = originalIncidences[key];
      expect(built.node).toBe(original.node);
      expect(toList(built.refs)).toEqual(toList(original.refs));
      expect(toList(built.ins)).toEqual(toList(original.ins));
      expect(toList(built.deps)).toEqual(toList(original.deps));
    });
  });
});
