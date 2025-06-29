import { describe, it, expect } from 'vitest';
import { graph, createTypedGraph, path, PathBuilder } from '../src/index.js';

describe('TypedGraph with Template Literal Paths', () => {
  
  // Create a sample graph with nested data structures
  const sampleGraph = graph(
    [
      { 
        key: 'user', 
        value: { 
          id: 1, 
          name: 'Alice',
          profile: {
            email: 'alice@example.com',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        }
      },
      { 
        key: 'post', 
        value: { 
          id: 101, 
          title: 'Hello World',
          author: 'Alice',
          metadata: {
            tags: ['intro', 'hello'],
            publishedAt: '2024-01-01'
          }
        }
      },
      {
        key: 'comment',
        value: {
          id: 201,
          text: 'Great post!',
          author: 'Bob'
        }
      }
    ],
    [
      { key: 'authored', value: { source: 'user', target: 'post' } },
      { key: 'commented', value: { source: 'user', target: 'comment' } }
    ]
  );

  const typedGraph = createTypedGraph(sampleGraph);

  describe('Basic Path Navigation', () => {
    it('should navigate to root nodes', () => {
      const userNode = typedGraph.navigate('user');
      expect(userNode).toBeDefined();
      expect((userNode as any).value().name).toBe('Alice');
    });

    it('should navigate to nested properties', () => {
      const email = typedGraph.navigate('user.profile.email');
      expect(email).toBe('alice@example.com');
    });

    it('should navigate to deeply nested properties', () => {
      const theme = typedGraph.navigate('user.profile.settings.theme');
      expect(theme).toBe('dark');
    });

    it('should return undefined for non-existent paths', () => {
      const result = typedGraph.navigate('user.nonexistent.path');
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid root nodes', () => {
      const result = typedGraph.navigate('nonexistent.path');
      expect(result).toBeUndefined();
    });
  });

  describe('Path Method (Throwing Version)', () => {
    it('should return values for valid paths', () => {
      const title = typedGraph.path('post.title');
      expect(title).toBe('Hello World');
    });

    it('should throw for non-existent paths', () => {
      expect(() => {
        typedGraph.path('user.invalid.path');
      }).toThrow("Path 'user.invalid.path' not found in graph");
    });

    it('should throw for invalid root nodes', () => {
      expect(() => {
        typedGraph.path('invalid.root');
      }).toThrow("Path 'invalid.root' not found in graph");
    });
  });

  describe('Path Existence Checking', () => {
    it('should correctly identify existing paths', () => {
      expect(typedGraph.hasPath('user')).toBe(true);
      expect(typedGraph.hasPath('user.profile.email')).toBe(true);
      expect(typedGraph.hasPath('post.metadata.tags')).toBe(true);
    });

    it('should correctly identify non-existent paths', () => {
      expect(typedGraph.hasPath('user.invalid')).toBe(false);
      expect(typedGraph.hasPath('invalid.root')).toBe(false);
      expect(typedGraph.hasPath('user.profile.invalid.deep')).toBe(false);
    });
  });

  describe('Complex Nested Navigation', () => {
    it('should handle array access in metadata', () => {
      const tags = typedGraph.navigate('post.metadata.tags');
      expect(Array.isArray(tags)).toBe(true);
      expect((tags as string[]).length).toBe(2);
      expect((tags as string[])[0]).toBe('intro');
    });

    it('should handle boolean values in nested settings', () => {
      const notifications = typedGraph.navigate('user.profile.settings.notifications');
      expect(notifications).toBe(true);
    });

    it('should handle numeric values', () => {
      const userId = typedGraph.navigate('user.id');
      expect(userId).toBe(1);
      
      const postId = typedGraph.navigate('post.id');
      expect(postId).toBe(101);
    });
  });

  describe('PathBuilder', () => {
    it('should build simple paths', () => {
      const builder = new PathBuilder();
      const userPath = builder.extend('user').build();
      expect(userPath).toBe('user');
    });

    it('should build nested paths', () => {
      const builder = new PathBuilder();
      const emailPath = builder
        .extend('user')
        .extend('profile')
        .extend('email')
        .build();
      expect(emailPath).toBe('user.profile.email');
    });

    it('should work with the path helper function', () => {
      const themePath = path()
        .extend('user')
        .extend('profile')
        .extend('settings')
        .extend('theme')
        .build();
      expect(themePath).toBe('user.profile.settings.theme');
      
      // Verify it works with the graph
      const theme = typedGraph.navigate(themePath);
      expect(theme).toBe('dark');
    });

    it('should provide path property accessor', () => {
      const builder = path()
        .extend('post')
        .extend('metadata')
        .extend('publishedAt');
      
      expect(builder.path).toBe('post.metadata.publishedAt');
      
      const publishedAt = typedGraph.navigate(builder.path);
      expect(publishedAt).toBe('2024-01-01');
    });
  });

  describe('Integration with Basic Graph Operations', () => {
    it('should maintain compatibility with basic graph methods', () => {
      // Basic node access should still work
      const userNode = typedGraph.node('user');
      expect(userNode).toBeDefined();
      expect(userNode!.key()).toBe('user');
      
      // Basic edge access should still work
      const authoredEdge = typedGraph.edge('authored');
      expect(authoredEdge).toBeDefined();
      expect(authoredEdge!.key()).toBe('authored');
    });

    it('should work with nodes() and edges() methods', () => {
      const allNodes = typedGraph.nodes();
      expect(allNodes.length).toBe(3);
      
      const allEdges = typedGraph.edges();
      expect(allEdges.length).toBe(2);
    });

    it('should handle edge cases gracefully', () => {
      // Empty path should return undefined
      const result = typedGraph.navigate('');
      expect(result).toBeUndefined();
      
      // Single dot should return undefined
      const dotResult = typedGraph.navigate('.');
      expect(dotResult).toBeUndefined();
      
      // Multiple dots should return undefined
      const dotsResult = typedGraph.navigate('user..profile');
      expect(dotsResult).toBeUndefined();
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should enable safe optional chaining pattern', () => {
      // Safe access with fallback
      const safeEmail = typedGraph.hasPath('user.profile.email') 
        ? typedGraph.path('user.profile.email')
        : 'default@example.com';
      
      expect(safeEmail).toBe('alice@example.com');
      
      // Safe access to non-existent path
      const safeBio = typedGraph.hasPath('user.profile.bio')
        ? typedGraph.path('user.profile.bio')
        : 'No bio available';
      
      expect(safeBio).toBe('No bio available');
    });

    it('should enable configuration-driven path access', () => {
      const configPaths = [
        'user.profile.email',
        'user.profile.settings.theme',
        'post.metadata.publishedAt'
      ];
      
      const values = configPaths.map(path => ({
        path,
        value: typedGraph.navigate(path),
        exists: typedGraph.hasPath(path)
      }));
      
      expect(values[0].value).toBe('alice@example.com');
      expect(values[1].value).toBe('dark');
      expect(values[2].value).toBe('2024-01-01');
      expect(values.every(v => v.exists)).toBe(true);
    });

    it('should handle dynamic path construction', () => {
      const sections = ['user', 'profile', 'settings'];
      const dynamicPath = sections.join('.');
      
      const settings = typedGraph.navigate(dynamicPath);
      expect(settings).toEqual({
        theme: 'dark',
        notifications: true
      });
    });
  });
});

describe('Template Literal Type Utilities', () => {
  it('should work with type-level string operations', () => {
    // These are primarily compile-time tests, but we can verify runtime behavior
    const testPath = 'user.profile.email';
    const parts = testPath.split('.');
    
    expect(parts).toEqual(['user', 'profile', 'email']);
    expect(parts.join('.')).toBe(testPath);
  });
  
  it('should handle edge cases in path parsing', () => {
    // Test various path formats
    const paths = [
      'simple',
      'two.parts',
      'three.nested.parts',
      'deeply.nested.path.with.many.parts'
    ];
    
    paths.forEach(path => {
      const parts = path.split('.');
      const rejoined = parts.join('.');
      expect(rejoined).toBe(path);
    });
  });
});