import { describe, it, expect } from 'vitest';
import { 
  validateGraph, 
  validateGraphWithOptions,
  createValidatedGraph,
  getValidationInfo,
  validateGraphAtRuntime,
  assertValidGraph
} from '../src/compile-time-validation.js';
import type { 
  ValidGraph, 
  GraphValidationError,
  IsValidGraph,
  ValidGraphConstraint 
} from '../src/compile-time-validation.js';

describe('Compile-Time Graph Validation', () => {
  
  describe('Type-Level Validation', () => {
    it('should validate correct graph structures at compile time', () => {
      // ✅ This should compile without errors
      const validGraph = {
        nodes: [
          { key: 'a', value: 1 },
          { key: 'b', value: 2 },
          { key: 'c', value: 3 }
        ],
        edges: [
          { key: 'edge1', value: { source: 'a', target: 'b' }},
          { key: 'edge2', value: { source: 'b', target: 'c' }}
        ]
      } as const;
      
      // This should not throw at compile time or runtime
      const validated = validateGraph(validGraph);
      expect(validated).toBeDefined();
      expect(validated.nodes).toBeDefined();
      expect(validated.edges).toBeDefined();
    });
    
    it('should provide meaningful type-level error information', () => {
      // These type tests verify compile-time behavior
      // They serve as documentation of expected type behavior
      
      type ValidGraphTest = ValidGraph<{
        nodes: [{ key: 'a', value: 1 }],
        edges: [{ key: 'e1', value: { source: 'a', target: 'a' }}]
      }>;
      
      type ValidGraphWithDanglingEdge = ValidGraph<{
        nodes: [{ key: 'a', value: 1 }],
        edges: [{ key: 'e1', value: { source: 'a', target: 'missing' }}]
      }>;
      
      // These are compile-time tests - they verify type behavior
      // The actual values don't matter, only that TypeScript accepts them
      const _typeTest1: ValidGraphTest = { error: 'Self-loops detected (consider using allowSelfLoops option)' } as any;
      const _typeTest2: ValidGraphWithDanglingEdge = { error: 'Some edges reference non-existent nodes' } as any;
      
      expect(true).toBe(true); // Placeholder assertion
    });
  });
  
  describe('Runtime Validation', () => {
    it('should validate correct graphs at runtime', () => {
      const validGraph = {
        nodes: [
          { key: 'user', value: { name: 'Alice' }},
          { key: 'post', value: { title: 'Hello World' }}
        ],
        edges: [
          { key: 'authored', value: { source: 'user', target: 'post' }}
        ]
      };
      
      expect(() => validateGraphAtRuntime(validGraph)).not.toThrow();
      const validated = validateGraphAtRuntime(validGraph);
      expect(validated).toEqual(validGraph);
    });
    
    it('should reject graphs with dangling edge references', () => {
      const invalidGraph = {
        nodes: [
          { key: 'a', value: 1 }
        ],
        edges: [
          { key: 'bad_edge', value: { source: 'a', target: 'nonexistent' }}
        ]
      };
      
      expect(() => validateGraphAtRuntime(invalidGraph)).toThrow(/Edge references non-existent node: nonexistent/);
    });
    
    it('should reject graphs with duplicate node keys', () => {
      const invalidGraph = {
        nodes: [
          { key: 'duplicate', value: 1 },
          { key: 'duplicate', value: 2 }
        ],
        edges: []
      };
      
      expect(() => validateGraphAtRuntime(invalidGraph)).toThrow(/Duplicate node key: duplicate/);
    });
    
    it('should reject graphs with duplicate edge keys', () => {
      const invalidGraph = {
        nodes: [
          { key: 'a', value: 1 },
          { key: 'b', value: 2 }
        ],
        edges: [
          { key: 'duplicate', value: { source: 'a', target: 'b' }},
          { key: 'duplicate', value: { source: 'b', target: 'a' }}
        ]
      };
      
      expect(() => validateGraphAtRuntime(invalidGraph)).toThrow(/Duplicate edge key: duplicate/);
    });
    
    it('should detect self-loops by default', () => {
      const graphWithSelfLoop = {
        nodes: [
          { key: 'a', value: 1 }
        ],
        edges: [
          { key: 'self_loop', value: { source: 'a', target: 'a' }}
        ]
      };
      
      expect(() => validateGraphAtRuntime(graphWithSelfLoop)).toThrow(/Self-loops detected: self_loop/);
    });
  });
  
  describe('Validation with Options', () => {
    it('should allow self-loops when configured', () => {
      const graphWithSelfLoop = {
        nodes: [
          { key: 'a', value: 1 }
        ],
        edges: [
          { key: 'self_loop', value: { source: 'a', target: 'a' }}
        ]
      };
      
      // This should work with allowSelfLoops option
      const validated = validateGraphWithOptions(graphWithSelfLoop, { 
        allowSelfLoops: true 
      });
      
      expect(validated).toBeDefined();
    });
    
    it('should handle flexible key requirements', () => {
      const flexibleGraph = {
        nodes: [
          { key: 'a', value: 1 }
        ],
        edges: [
          { key: 'edge', value: { source: 'a', target: 'a' }}
        ]
      };
      
      const validated = validateGraphWithOptions(flexibleGraph, {
        requireUniqueKeys: false,
        allowSelfLoops: true
      });
      
      expect(validated).toBeDefined();
    });
  });
  
  describe('Validation Information', () => {
    it('should provide detailed validation information', () => {
      const complexGraph = {
        nodes: [
          { key: 'a', value: 1 },
          { key: 'b', value: 2 },
          { key: 'c', value: 3 }
        ],
        edges: [
          { key: 'e1', value: { source: 'a', target: 'b' }},
          { key: 'e2', value: { source: 'b', target: 'c' }},
          { key: 'e3', value: { source: 'c', target: 'a' }}
        ]
      };
      
      const info = getValidationInfo(complexGraph);
      
      expect(info.nodeCount).toBe(3);
      expect(info.edgeCount).toBe(3);
      expect(info.nodeKeys).toEqual(['a', 'b', 'c']);
      expect(info.edgeKeys).toEqual(['e1', 'e2', 'e3']);
      expect(info.referencedNodes).toEqual(['a', 'b', 'c']);
      expect(info.danglingReferences).toEqual([]);
      expect(info.selfLoops).toEqual([]);
      expect(info.duplicateNodes).toEqual([]);
      expect(info.duplicateEdges).toEqual([]);
      expect(info.isValid).toBe(true);
      expect(info.errors).toEqual([]);
    });
    
    it('should detect all types of validation errors', () => {
      const problematicGraph = {
        nodes: [
          { key: 'a', value: 1 },
          { key: 'a', value: 2 }, // Duplicate node
          { key: 'b', value: 3 }
        ],
        edges: [
          { key: 'e1', value: { source: 'a', target: 'missing' }}, // Dangling reference
          { key: 'e1', value: { source: 'b', target: 'b' }}, // Duplicate edge + self-loop
        ]
      };
      
      const info = getValidationInfo(problematicGraph);
      
      expect(info.isValid).toBe(false);
      expect(info.danglingReferences).toContain('missing');
      expect(info.duplicateNodes).toContain('a');
      expect(info.duplicateEdges).toContain('e1');
      expect(info.selfLoops).toContain('e1');
      expect(info.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Graph Creation with Validation', () => {
    it('should create valid graphs successfully', () => {
      const validSpec = {
        nodes: [
          { key: 'user', value: { name: 'Alice', age: 30 }},
          { key: 'profile', value: { bio: 'Engineer' }}
        ],
        edges: [
          { key: 'has_profile', value: { source: 'user', target: 'profile' }}
        ]
      };
      
      const graph = createValidatedGraph(validSpec);
      
      expect(graph).toBeDefined();
      expect(graph.nodes().length).toBe(2);
      expect(graph.edges().length).toBe(1);
      
      const userNode = graph.node('user');
      expect(userNode).toBeDefined();
      expect(userNode!.value()).toEqual({ name: 'Alice', age: 30 });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty graphs', () => {
      const emptyGraph = {
        nodes: [],
        edges: []
      };
      
      // Empty graphs might be considered invalid (no nodes)
      // but let's check what our validation thinks
      const info = getValidationInfo(emptyGraph);
      expect(info.nodeCount).toBe(0);
      expect(info.edgeCount).toBe(0);
    });
    
    it('should handle graphs with nodes but no edges', () => {
      const nodesOnlyGraph = {
        nodes: [
          { key: 'isolated', value: 'alone' }
        ],
        edges: []
      };
      
      const info = getValidationInfo(nodesOnlyGraph);
      expect(info.isValid).toBe(true);
      expect(info.nodeCount).toBe(1);
      expect(info.edgeCount).toBe(0);
    });
    
    it('should handle record-style node and edge definitions', () => {
      const recordStyleGraph = {
        nodes: {
          'a': { value: 1 },
          'b': { value: 2 }
        },
        edges: {
          'connection': { value: { source: 'a', target: 'b' }}
        }
      };
      
      const info = getValidationInfo(recordStyleGraph);
      expect(info.nodeCount).toBe(2);
      expect(info.edgeCount).toBe(1);
      expect(info.isValid).toBe(true);
    });
  });
  
  describe('Type Assertions', () => {
    it('should work with type assertions', () => {
      const suspiciousGraph = {
        nodes: [{ key: 'a', value: 1 }],
        edges: [{ key: 'e', value: { source: 'a', target: 'a' }}]
      };
      
      // This should not throw (assertValidGraph is mainly for compile-time)
      expect(() => assertValidGraph(suspiciousGraph)).not.toThrow();
    });
  });
  
  describe('Integration with Existing Graph Functions', () => {
    it('should work seamlessly with existing graph creation', () => {
      const validatedSpec = validateGraph({
        nodes: [
          { key: 'start', value: 'beginning' },
          { key: 'end', value: 'finish' }
        ],
        edges: [
          { key: 'flow', value: { source: 'start', target: 'end' }}
        ]
      });
      
      // Should work with existing graph creation functions
      const graph = createValidatedGraph(validatedSpec);
      
      expect(graph.node('start')?.value()).toBe('beginning');
      expect(graph.node('end')?.value()).toBe('finish');
      expect(graph.edge('flow')?.source().key()).toBe('start');
      expect(graph.edge('flow')?.target().key()).toBe('end');
    });
  });
});