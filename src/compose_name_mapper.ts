import { Graph } from './types.js';

export type NameMapper = (patternKey: string, name: string) => string;

export const createNameMapper = (composition: Graph): NameMapper => {
  const patternKeys = new Set<string>();
  composition.nodes().forEach(node => patternKeys.add(node.key()));

  const aliasMap: Record<string, Record<string, string>> = {};
  composition.edges().forEach(edge => {
    const alias = (edge.value() as { input?: string }).input;
    if (!alias) return;
    const target = edge.target().key();
    const source = edge.source().key();
    (aliasMap[target] = aliasMap[target] || {})[alias] = source;
  });

  const mapName = (patternKey: string, name: string): string => {
    if (!name) return name;
    const parts = name.split('.');
    if (parts.length === 1) {
      const key = parts[0];
      return `${patternKey}.${key}`;
    }
    const [prefix, ...restParts] = parts;
    const rest = restParts.join('.');

    if (patternKeys.has(prefix)) {
      return `${prefix}.${rest}`;
    }

    const mappedPattern = aliasMap[patternKey]?.[prefix];
    if (mappedPattern) {
      return `${mappedPattern}.${rest}`;
    }

    // fallback: treat as already namespaced relative to current pattern
    return `${patternKey}.${name}`;
  };

  return mapName;
};
