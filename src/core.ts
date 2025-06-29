import { KeyValue } from './types.js';

export const version = '0.0.7';

export function as_array<T>(a: T | T[] | null | undefined): T[] {
  return !a ? [] : (Array.isArray(a) ? a : [a]);
}

export function as_keyvalue<V>(o: KeyValue<string, V>[] | Record<string, V> | null | undefined): KeyValue<string, V>[] {
  return !o ? [] : (Array.isArray(o) ? o : Object.keys(o).map(key => ({
    key,
    value: o[key]
  })));
}

export function build_map<T, K extends string | number | symbol, V>(
  vals: T[], 
  keyf: (val: T) => K, 
  wrap: (val: T) => V
): Record<K, V> {
  return vals.reduce((o, val) => {
    o[keyf(val)] = wrap(val);
    return o;
  }, {} as Record<K, V>);
}