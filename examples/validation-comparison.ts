/**
 * Validation Comparison: Type-Level vs Runtime
 * Demonstrates the differences between compile-time and runtime validation
 */

import { validateGraphAtRuntime, getValidationInfo, type ValidGraph } from '../src/index.js';

console.log('=== Validation System Comparison ===\\n');

// 1. Static literal data - BOTH systems can validate
console.log('1. Static Literal Data (both systems work):');

const staticGraph = {
  nodes: [
    { key: 'a', value: 1 },
    { key: 'b', value: 2 }
  ],
  edges: [
    { key: 'edge1', value: { source: 'a', target: 'missing' }} // Invalid!
  ]
} as const;

// Type-level validation (shows error in IDE)
type StaticValidation = ValidGraph<typeof staticGraph>;
// This type resolves to: { error: 'Some edges reference non-existent nodes' }

// Runtime validation
try {
  validateGraphAtRuntime(staticGraph);
} catch (error) {
  console.log('  ❌ Runtime caught:', (error as Error).message.split('\\n')[0]);
}

// 2. Dynamic data - ONLY runtime can validate
console.log('\\n2. Dynamic Data (only runtime works):');

// Simulate data from API/user input
const dynamicNodeCount = Math.floor(Math.random() * 3) + 1;
const dynamicGraph = {
  nodes: Array.from({ length: dynamicNodeCount }, (_, i) => ({ 
    key: `node${i}`, 
    value: `data${i}` 
  })),
  edges: [
    { key: 'dynamic_edge', value: { source: 'node0', target: 'node999' }} // Might be invalid
  ]
};

console.log(`  Dynamic graph has ${dynamicNodeCount} nodes`);

// Type-level validation CAN'T work here (TypeScript doesn't know the structure)
// type DynamicValidation = ValidGraph<typeof dynamicGraph>; // Would be 'never' or error

// Runtime validation DOES work
try {
  validateGraphAtRuntime(dynamicGraph);
  console.log('  ✅ Runtime validation passed');
} catch (error) {
  console.log('  ❌ Runtime caught:', (error as Error).message.split('\\n')[0]);
}

// 3. Record-style vs Array-style - Different handling
console.log('\\n3. Record vs Array Format:');

const recordStyleGraph = {
  nodes: {
    'user': { name: 'Alice' },
    'profile': { bio: 'Engineer' }
  },
  edges: {
    'connection': { source: 'user', target: 'nonexistent' }
  }
};

// Type system has limited support for record-style validation
// Runtime handles both formats seamlessly
const recordInfo = getValidationInfo(recordStyleGraph);
console.log(`  Record format - Nodes: ${recordInfo.nodeCount}, Errors: ${recordInfo.errors.length}`);

// 4. Computed/transformed data - Runtime only
console.log('\\n4. Computed Data (runtime only):');

const userInput = '{"nodes":[{"key":"a"}],"edges":[{"key":"e","value":{"source":"a","target":"b"}}]}';
const parsedGraph = JSON.parse(userInput);

// Type system can't validate JSON.parse results
// Runtime validation works perfectly
try {
  validateGraphAtRuntime(parsedGraph);
} catch (error) {
  console.log('  ❌ Runtime caught JSON validation error:', (error as Error).message.split('\\n')[0]);
}

// 5. Complex validation scenarios
console.log('\\n5. Complex Scenarios:');

// Self-loop detection
const selfLoopGraph = {
  nodes: [{ key: 'recursive', value: 'data' }],
  edges: [{ key: 'self', value: { source: 'recursive', target: 'recursive' }}]
};

const selfLoopInfo = getValidationInfo(selfLoopGraph);
console.log(`  Self-loops detected: ${selfLoopInfo.selfLoops.length > 0 ? '✅' : '❌'}`);

// Multiple validation errors
const multiErrorGraph = {
  nodes: [
    { key: 'dup', value: 1 },
    { key: 'dup', value: 2 }, // Duplicate
    { key: 'valid', value: 3 }
  ],
  edges: [
    { key: 'bad1', value: { source: 'dup', target: 'missing1' }}, // Dangling
    { key: 'bad2', value: { source: 'valid', target: 'missing2' }}, // Dangling
    { key: 'bad1', value: { source: 'valid', target: 'dup' }} // Duplicate edge key
  ]
};

const multiErrorInfo = getValidationInfo(multiErrorGraph);
console.log(`  Multiple errors detected: ${multiErrorInfo.errors.length} errors`);
console.log(`    - Duplicate nodes: ${multiErrorInfo.duplicateNodes.length}`);
console.log(`    - Duplicate edges: ${multiErrorInfo.duplicateEdges.length}`);
console.log(`    - Dangling references: ${multiErrorInfo.danglingReferences.length}`);

console.log('\\n=== Summary ===');
console.log('Type-Level Validation:');
console.log('  ✅ Static literal graphs with const assertions');
console.log('  ✅ IDE feedback and IntelliSense');
console.log('  ❌ Dynamic/computed graphs');
console.log('  ❌ Runtime data (JSON, APIs, user input)');
console.log('  ❌ Complex format variations');

console.log('\\nRuntime Validation:');
console.log('  ✅ Any graph data structure');
console.log('  ✅ Dynamic and computed graphs');
console.log('  ✅ All format variations (arrays, records)');
console.log('  ✅ Detailed error reporting');
console.log('  ✅ JSON and external data');

export { staticGraph, dynamicGraph, recordStyleGraph };