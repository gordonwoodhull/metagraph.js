/**
 * Compile-Time Graph Validation Demo
 * 
 * This example showcases the advanced compile-time validation system that catches
 * graph structure errors at build time, preventing runtime failures.
 */

import { 
  validateGraph, 
  validateGraphWithOptions,
  createValidatedGraph,
  getValidationInfo,
  validateGraphAtRuntime,
  assertValidGraph,
  type ValidGraph,
  type GraphValidationError,
  type ValidatedGraph
} from '../src/index.js';

console.log('=== Compile-Time Graph Validation Demo ===\\n');

// ✅ Example 1: Valid Graph Structure
console.log('1. Valid Graph Structure:');
const validUserGraph = {
  nodes: [
    { key: 'user1', value: { name: 'Alice', role: 'admin' }},
    { key: 'user2', value: { name: 'Bob', role: 'user' }},
    { key: 'project1', value: { title: 'Website', status: 'active' }},
    { key: 'project2', value: { title: 'Mobile App', status: 'planning' }}
  ],
  edges: [
    { key: 'owns1', value: { source: 'user1', target: 'project1' }},
    { key: 'owns2', value: { source: 'user1', target: 'project2' }},
    { key: 'collaborates', value: { source: 'user2', target: 'project1' }}
  ]
} as const;

// This validates at compile-time AND runtime
const validatedGraph = validateGraph(validUserGraph);
console.log('✅ Valid graph created successfully');
console.log(`   Nodes: ${validatedGraph.nodes.length}, Edges: ${validatedGraph.edges.length}`);

// Create actual graph instance with validation
const graphInstance = createValidatedGraph(validUserGraph);
console.log(`   Graph instance created with ${graphInstance.nodes().length} nodes and ${graphInstance.edges().length} edges`);

// ❌ Example 2: Invalid Graph - Dangling Edge Reference
console.log('\\n2. Invalid Graph - Dangling Edge Reference:');
const invalidGraphDangling = {
  nodes: [
    { key: 'user1', value: { name: 'Alice' }}
  ],
  edges: [
    { key: 'bad_edge', value: { source: 'user1', target: 'nonexistent_user' }}
  ]
} as const;

// Check validation info
const danglingInfo = getValidationInfo(invalidGraphDangling);
console.log('❌ Validation failed:');
console.log(`   Errors: ${danglingInfo.errors.join(', ')}`);
console.log(`   Dangling references: ${danglingInfo.danglingReferences.join(', ')}`);

try {
  validateGraphAtRuntime(invalidGraphDangling);
} catch (error) {
  console.log(`   Runtime validation caught: ${(error as Error).message.split('\\n')[0]}`);
}

// ❌ Example 3: Invalid Graph - Duplicate Keys
console.log('\\n3. Invalid Graph - Duplicate Keys:');
const invalidGraphDuplicates = {
  nodes: [
    { key: 'user', value: { name: 'Alice' }},
    { key: 'user', value: { name: 'Bob' }} // Duplicate key!
  ],
  edges: [
    { key: 'edge1', value: { source: 'user', target: 'user' }},
    { key: 'edge1', value: { source: 'user', target: 'user' }} // Duplicate key!
  ]
} as const;

const duplicateInfo = getValidationInfo(invalidGraphDuplicates);
console.log('❌ Validation failed:');
console.log(`   Duplicate nodes: ${duplicateInfo.duplicateNodes.join(', ')}`);
console.log(`   Duplicate edges: ${duplicateInfo.duplicateEdges.join(', ')}`);

// ⚠️  Example 4: Self-Loops (conditionally invalid)
console.log('\\n4. Self-Loops - Conditional Validation:');
const graphWithSelfLoop = {
  nodes: [
    { key: 'recursive_node', value: { type: 'self-referential' }}
  ],
  edges: [
    { key: 'self_ref', value: { source: 'recursive_node', target: 'recursive_node' }}
  ]
} as const;

const selfLoopInfo = getValidationInfo(graphWithSelfLoop);
console.log('⚠️  Self-loop detected (may be invalid by default):');
console.log(`   Self-loops: ${selfLoopInfo.selfLoops.join(', ')}`);

// But we can allow self-loops with options
const validatedWithSelfLoops = validateGraphWithOptions(graphWithSelfLoop, { 
  allowSelfLoops: true 
});
console.log('✅ Self-loop allowed with options');

// 🔧 Example 5: Advanced Validation Options
console.log('\\n5. Advanced Validation Options:');
const flexibleGraph = {
  nodes: [
    { key: 'node1', value: 'data1' },
    { key: 'node2', value: 'data2' }
  ],
  edges: [
    { key: 'connection', value: { source: 'node1', target: 'node2' }}
  ]
} as const;

// Validate with different option combinations
const strictValidation = validateGraphWithOptions(flexibleGraph, {
  requireUniqueKeys: true,
  allowSelfLoops: false,
  allowDisconnectedNodes: false
});

const lenientValidation = validateGraphWithOptions(flexibleGraph, {
  requireUniqueKeys: false,
  allowSelfLoops: true,
  allowDisconnectedNodes: true
});

console.log('✅ Both strict and lenient validation passed for well-formed graph');

// 📊 Example 6: Detailed Validation Information
console.log('\\n6. Detailed Validation Analysis:');
const complexGraph = {
  nodes: [
    { key: 'frontend', value: { type: 'web', framework: 'react' }},
    { key: 'backend', value: { type: 'api', framework: 'express' }},
    { key: 'database', value: { type: 'storage', engine: 'postgresql' }},
    { key: 'cache', value: { type: 'memory', engine: 'redis' }}
  ],
  edges: [
    { key: 'api_calls', value: { source: 'frontend', target: 'backend' }},
    { key: 'db_queries', value: { source: 'backend', target: 'database' }},
    { key: 'cache_reads', value: { source: 'backend', target: 'cache' }},
    { key: 'cache_writes', value: { source: 'backend', target: 'cache' }}
  ]
} as const;

const detailedInfo = getValidationInfo(complexGraph);
console.log('📊 Detailed validation analysis:');
console.log(`   Nodes: ${detailedInfo.nodeCount} (${detailedInfo.nodeKeys.join(', ')})`);
console.log(`   Edges: ${detailedInfo.edgeCount} (${detailedInfo.edgeKeys.join(', ')})`);
console.log(`   All nodes referenced: ${detailedInfo.referencedNodes.join(', ')}`);
console.log(`   Validation status: ${detailedInfo.isValid ? '✅ VALID' : '❌ INVALID'}`);

if (detailedInfo.errors.length > 0) {
  console.log(`   Errors: ${detailedInfo.errors.join(', ')}`);
}

// 🎯 Example 7: Type-Level Validation Examples
console.log('\\n7. Type-Level Validation Examples:');

// These demonstrate compile-time type checking
// (The actual runtime values don't matter for type-level validation)

// Valid graph type
type ValidGraphType = ValidGraph<{
  nodes: [{ key: 'a', value: 1 }],
  edges: [{ key: 'e', value: { source: 'a', target: 'a' }}]
}>;

// Invalid graph type (would show error in IDE)
type InvalidGraphType = ValidGraph<{
  nodes: [{ key: 'a', value: 1 }],
  edges: [{ key: 'e', value: { source: 'a', target: 'missing' }}]
}>;

// The types above would show different error messages in TypeScript
console.log('✅ Type-level validation provides compile-time feedback');

// 🚀 Example 8: Integration with Graph Patterns
console.log('\\n8. Integration with Existing Graph System:');

// Create a validated graph and use it with existing functions
const socialNetworkSpec = {
  nodes: [
    { key: 'alice', value: { name: 'Alice', followers: 150 }},
    { key: 'bob', value: { name: 'Bob', followers: 89 }},
    { key: 'charlie', value: { name: 'Charlie', followers: 245 }}
  ],
  edges: [
    { key: 'alice_follows_bob', value: { source: 'alice', target: 'bob' }},
    { key: 'bob_follows_charlie', value: { source: 'bob', target: 'charlie' }},
    { key: 'charlie_follows_alice', value: { source: 'charlie', target: 'alice' }}
  ]
} as const;

// Validate and create
const socialNetwork = createValidatedGraph(socialNetworkSpec);

// Use with existing graph operations
console.log('🚀 Integration with existing graph operations:');
console.log(`   Alice follows ${socialNetwork.node('alice')?.outs().length} people`);
console.log(`   Bob is followed by ${socialNetwork.node('bob')?.ins().length} people`);
console.log(`   Charlie has ${socialNetwork.node('charlie')?.value().followers} followers`);

// 🛡️ Example 9: Defensive Programming
console.log('\\n9. Defensive Programming with Validation:');

function processUserGraph(spec: unknown) {
  try {
    // Validate unknown input at runtime
    const validatedSpec = validateGraphAtRuntime(spec as any);
    const graph = createValidatedGraph(validatedSpec);
    
    console.log('🛡️  Successfully processed user-provided graph:');
    console.log(`     Nodes: ${graph.nodes().length}, Edges: ${graph.edges().length}`);
    
    return graph;
  } catch (error) {
    console.log(`🚫 Rejected invalid graph: ${(error as Error).message.split('\\n')[0]}`);
    return null;
  }
}

// Test with valid and invalid data
const userInput1 = {
  nodes: [{ key: 'test', value: 'data' }],
  edges: []
};

const userInput2 = {
  nodes: [{ key: 'test', value: 'data' }],
  edges: [{ key: 'bad', value: { source: 'test', target: 'missing' }}]
};

processUserGraph(userInput1);
processUserGraph(userInput2);

// 📈 Example 10: Performance Considerations
console.log('\\n10. Performance Analysis:');

const largeGraphSpec = {
  nodes: Array.from({ length: 100 }, (_, i) => ({ 
    key: `node${i}`, 
    value: { id: i, data: `data${i}` }
  })),
  edges: Array.from({ length: 200 }, (_, i) => ({
    key: `edge${i}`,
    value: { 
      source: `node${i % 100}`, 
      target: `node${(i + 1) % 100}` 
    }
  }))
};

const startTime = performance.now();
const largeGraphInfo = getValidationInfo(largeGraphSpec);
const endTime = performance.now();

console.log('📈 Performance analysis for large graph:');
console.log(`   Nodes: ${largeGraphInfo.nodeCount}, Edges: ${largeGraphInfo.edgeCount}`);
console.log(`   Validation time: ${(endTime - startTime).toFixed(2)}ms`);
console.log(`   Validation result: ${largeGraphInfo.isValid ? '✅ VALID' : '❌ INVALID'}`);

console.log('\\n=== Demo Complete ===');
console.log('\\n🎉 Compile-time validation provides:');
console.log('   • Compile-time error detection');
console.log('   • Runtime validation for dynamic graphs');
console.log('   • Detailed error reporting');
console.log('   • Flexible validation options');
console.log('   • Seamless integration with existing code');

export { 
  validUserGraph, 
  invalidGraphDangling, 
  socialNetworkSpec,
  complexGraph 
};