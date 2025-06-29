/**
 * Advanced TypeScript Path Navigation Demo
 * 
 * This example showcases the template literal type system for type-safe
 * graph navigation with compile-time path validation.
 */

import { graph, createTypedGraph, path, pattern, graph_pattern } from '../src/index.js';

// Define strongly-typed interfaces for our domain
interface User {
  id: number;
  name: string;
  email: string;
  profile: UserProfile;
  preferences: UserPreferences;
}

interface UserProfile {
  bio: string;
  avatar: string;
  social: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
  location: {
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showLocation: boolean;
  };
}

interface Project {
  id: number;
  name: string;
  description: string;
  owner: number; // User ID
  settings: {
    visibility: 'public' | 'private';
    collaboration: {
      allowForks: boolean;
      requireApproval: boolean;
    };
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    tags: string[];
    stats: {
      views: number;
      forks: number;
      stars: number;
    };
  };
}

// Create sample data
const userData: User = {
  id: 1,
  name: 'Alice Johnson',
  email: 'alice@example.com',
  profile: {
    bio: 'Software Engineer passionate about TypeScript and graph theory',
    avatar: 'https://example.com/avatar/alice.jpg',
    social: {
      twitter: '@alicecodes',
      github: 'alice-dev',
      linkedin: 'alice-johnson'
    },
    location: {
      city: 'San Francisco',
      country: 'USA',
      coordinates: {
        lat: 37.7749,
        lng: -122.4194
      }
    }
  },
  preferences: {
    theme: 'dark',
    language: 'en-US',
    notifications: {
      email: true,
      push: false,
      marketing: false
    },
    privacy: {
      profileVisibility: 'public',
      showLocation: true
    }
  }
};

const projectData: Project = {
  id: 101,
  name: 'metagraph-ts',
  description: 'A TypeScript library for higher-order graphs',
  owner: 1,
  settings: {
    visibility: 'public',
    collaboration: {
      allowForks: true,
      requireApproval: false
    }
  },
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T12:30:00Z',
    tags: ['typescript', 'graph', 'library'],
    stats: {
      views: 1250,
      forks: 45,
      stars: 89
    }
  }
};

// Create the graph with typed data
const socialGraph = graph(
  [
    { key: 'user1', value: userData },
    { key: 'project1', value: projectData },
    { key: 'user2', value: { 
      id: 2, 
      name: 'Bob Smith', 
      email: 'bob@example.com',
      profile: {
        bio: 'Full-stack developer',
        avatar: 'https://example.com/avatar/bob.jpg',
        social: { github: 'bob-dev' },
        location: {
          city: 'New York',
          country: 'USA',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        }
      },
      preferences: {
        theme: 'light' as const,
        language: 'en-US',
        notifications: { email: false, push: true, marketing: false },
        privacy: { profileVisibility: 'private' as const, showLocation: false }
      }
    }}
  ],
  [
    { key: 'owns', value: { source: 'user1', target: 'project1' } },
    { key: 'collaborates', value: { source: 'user2', target: 'project1' } }
  ]
);

// Create typed graph for enhanced navigation
const typedGraph = createTypedGraph(socialGraph);

// Demonstrate type-safe path navigation
console.log('=== TypeScript Template Literal Path Navigation Demo ===\\n');

// 1. Basic path navigation with type safety
console.log('1. Basic Navigation:');
const userName = typedGraph.path('user1.name');
console.log(`User name: ${userName}`);

const userEmail = typedGraph.path('user1.email');
console.log(`User email: ${userEmail}`);

// 2. Deep nested navigation
console.log('\\n2. Deep Nested Navigation:');
const userTheme = typedGraph.path('user1.preferences.theme');
console.log(`User theme preference: ${userTheme}`);

const userCity = typedGraph.path('user1.profile.location.city');
console.log(`User city: ${userCity}`);

const latitude = typedGraph.path('user1.profile.location.coordinates.lat');
console.log(`User latitude: ${latitude}`);

// 3. Safe navigation with existence checking
console.log('\\n3. Safe Navigation:');
const twitterHandle = typedGraph.hasPath('user1.profile.social.twitter')
  ? typedGraph.path('user1.profile.social.twitter')
  : 'Not provided';
console.log(`Twitter handle: ${twitterHandle}`);

const instagramHandle = typedGraph.hasPath('user1.profile.social.instagram')
  ? typedGraph.path('user1.profile.social.instagram')
  : 'Not provided';
console.log(`Instagram handle: ${instagramHandle}`);

// 4. Array and complex data navigation
console.log('\\n4. Complex Data Navigation:');
const projectTags = typedGraph.path('project1.metadata.tags');
console.log(`Project tags: ${Array.isArray(projectTags) ? projectTags.join(', ') : projectTags}`);

const projectStats = typedGraph.path('project1.metadata.stats');
console.log(`Project stats:`, projectStats);

const starCount = typedGraph.path('project1.metadata.stats.stars');
console.log(`Star count: ${starCount}`);

// 5. Using PathBuilder for programmatic path construction
console.log('\\n5. PathBuilder Usage:');
const emailPath = path()
  .extend('user1')
  .extend('email')
  .build();
console.log(`Built email path: ${emailPath}`);

const settingsPath = path()
  .extend('user1')
  .extend('preferences')
  .extend('notifications')
  .extend('email')
  .build();
console.log(`Built settings path: ${settingsPath}`);
console.log(`Email notifications enabled: ${typedGraph.path(settingsPath)}`);

// 6. Batch path operations
console.log('\\n6. Batch Operations:');
const importantPaths = [
  'user1.name',
  'user1.email',
  'user1.preferences.theme',
  'user1.profile.location.city',
  'project1.name',
  'project1.metadata.stats.stars'
];

const batchResults = importantPaths.map(pathStr => ({
  path: pathStr,
  value: typedGraph.navigate(pathStr),
  exists: typedGraph.hasPath(pathStr)
}));

console.log('Batch navigation results:');
batchResults.forEach(result => {
  console.log(`  ${result.path}: ${result.exists ? result.value : 'NOT FOUND'}`);
});

// 7. Error handling demonstration
console.log('\\n7. Error Handling:');
try {
  const invalidValue = typedGraph.path('user1.invalid.path');
  console.log(`This shouldn't print: ${invalidValue}`);
} catch (error) {
  console.log(`Caught expected error: ${(error as Error).message}`);
}

// Graceful handling with navigate
const maybeValue = typedGraph.navigate('user1.maybe.invalid');
console.log(`Navigate to invalid path: ${maybeValue ?? 'undefined (as expected)'}`);

// 8. Integration with pattern system
console.log('\\n8. Pattern Integration:');
const userPattern = pattern(graph_pattern());
const userInstance = userPattern.node('Graph')?.value()?.create({
  nodes: [{ key: 'profile', value: userData.profile }],
  edges: []
});

if (userInstance) {
  const typedInstance = createTypedGraph(userInstance);
  const bio = typedInstance.navigate('profile.bio');
  console.log(`Pattern-created graph bio: ${bio}`);
}

// 9. Advanced type features showcase
console.log('\\n9. Advanced Features:');

// Template literal type validation (compile-time)
function getNestedValue<T extends string>(graph: typeof typedGraph, path: T) {
  return graph.navigate(path);
}

// This demonstrates compile-time path validation
const validPath = 'user1.profile.bio';
const bio = getNestedValue(typedGraph, validPath);
console.log(`Template literal validated bio: ${bio}`);

// 10. Performance comparison
console.log('\\n10. Performance Considerations:');
const iterations = 10000;

// Traditional object navigation
const start1 = performance.now();
for (let i = 0; i < iterations; i++) {
  const user = socialGraph.node('user1')?.value() as User;
  const theme = user?.preferences?.theme;
}
const end1 = performance.now();

// Typed path navigation
const start2 = performance.now();
for (let i = 0; i < iterations; i++) {
  typedGraph.navigate('user1.preferences.theme');
}
const end2 = performance.now();

console.log(`Traditional navigation: ${(end1 - start1).toFixed(2)}ms for ${iterations} iterations`);
console.log(`Typed path navigation: ${(end2 - start2).toFixed(2)}ms for ${iterations} iterations`);

console.log('\\n=== Demo Complete ===');

export { typedGraph, userData, projectData };