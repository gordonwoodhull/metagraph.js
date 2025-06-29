import { KeyValue } from './types.js';

/**
 * The version of the metagraph library.
 */
export const version = '0.0.7';

/**
 * Converts a value to an array. If the value is already an array, returns it as-is.
 * If the value is null/undefined, returns an empty array. Otherwise, wraps the value in an array.
 * 
 * @param a - The value to convert to an array
 * @returns An array containing the value(s)
 * 
 * @example
 * ```typescript
 * as_array(5) // [5]
 * as_array([1, 2, 3]) // [1, 2, 3]
 * as_array(null) // []
 * ```
 */
export function as_array<T>(a: T | T[] | null | undefined): T[] {
  return !a ? [] : (Array.isArray(a) ? a : [a]);
}

/**
 * Converts an object or array to a standardized key-value array format.
 * If input is an object, converts it to an array of {key, value} pairs.
 * If input is already an array, returns it as-is.
 * 
 * @param o - The object or array to convert
 * @returns An array of key-value pairs
 * 
 * @example
 * ```typescript
 * as_keyvalue({a: 1, b: 2}) // [{key: 'a', value: 1}, {key: 'b', value: 2}]
 * as_keyvalue([{key: 'x', value: 10}]) // [{key: 'x', value: 10}]
 * ```
 */
export function as_keyvalue<V>(o: KeyValue<string, V>[] | Record<string, V> | null | undefined): KeyValue<string, V>[] {
  return !o ? [] : (Array.isArray(o) ? o : Object.keys(o).map(key => ({
    key,
    value: o[key]
  })));
}

/**
 * Creates a map from an array of values using provided key and value transformation functions.
 * 
 * @param vals - Array of values to transform into a map
 * @param keyf - Function to extract the key from each value
 * @param wrap - Function to transform each value
 * @returns A record/map from keys to transformed values
 * 
 * @example
 * ```typescript
 * build_map([{id: 'a', name: 'Alice'}], x => x.id, x => x.name)
 * // Result: {a: 'Alice'}
 * ```
 */
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