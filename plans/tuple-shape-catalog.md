# Tuple Shape Catalog

This document records the dependency tuples that exist in the current spec literals. Each entry lists the calculators involved, the sources that feed them, and the intended semantic shape (e.g., plain map, map-of-lists, subset pair). Use this as the authoritative reference when adding tuple discriminants to `pattern_types.ts`.

---

## Graph Pattern (`src/graph_pattern.ts`)

### Node lookups
- **`node_by_key`**
  - Kind: `map`
  - `ins`: `['nodes']`
  - Produces `Record<string, NodeWrapper>`

- **`edge_by_key`**
  - Kind: `map`
  - `ins`: `['edges']`
  - Produces `Record<string, EdgeWrapper>`

### List builders (map/list pair)
- **`node_list`**
  - Kind: `list`
  - `ins`: `['nodes', 'node_by_key']`
  - Tuple shape: `[node array, node_by_key map]`

- **`edge_list`**
  - Kind: `list`
  - `ins`: `['edges', 'edge_by_key']`
  - Tuple shape: `[edge array, edge_by_key map]`

### Map-of-lists builders (map/list pair with shared map)
- **`node_outs`**
  - Kind: `map_of_lists`
  - `ins`: `['edges', 'edge_by_key']`
  - Tuple shape: `[edge array, edge_by_key map]`
  - Semantic: `Record<string, EdgeWrapper[]>`

- **`node_ins`**
  - Kind: `map_of_lists`
  - `ins`: `['edges', 'edge_by_key']`
  - Tuple shape identical to `node_outs`

### Singleton graph wrapper
- **`graph`**
  - Kind: `singleton`
  - No `ins`
  - Semantic: delayed wrapper seeded elsewhere

## Subgraph Pattern (`src/subgraph_pattern.ts`)

- **`subset_nodes`**
  - Kind: `subset`
  - `ins`: `['parent_nodes', 'node_keys']`
  - Tuple shape: `[parent node array, node key array]`
  - Semantic: filtered node list keyed by `node_by_key`

- **`subset_edges`**
  - Kind: `subset`
  - `ins`: `['parent_edges', 'edge_keys']`
  - Tuple shape: `[parent edge array, edge key array]`

- **`nodes` / `edges` outputs**
  - Kind: `output`
  - `ins`: `'subset_nodes'` / `'subset_edges'`
  - Semantic: pass-through of subset results

Inputs (`parent_nodes`, `parent_edges`, `node_keys`, `edge_keys`) feed these subsets directly; they should be considered when defining tuple discriminants for subset pairs.

## Composition Namespace Mappings (`src/compose.ts`)

Each composition edge contributes a namespace descriptor:
- **Tuple shape**: `[spec, accessors]` (the descriptor binds these to `DataflowOutputs`)
- Aliases in interface graphs (e.g., `'graph.Graph'`) rely on these descriptors when resolving `lookup*` and `subgraph` members.

## Summary of Shape Categories

| Shape                | Example nodes                        | Tuple contents                          | Intended type                                   |
|----------------------|--------------------------------------|-----------------------------------------|--------------------------------------------------|
| Map-only             | `node_by_key`, `edge_by_key`         | `['nodes']`, `['edges']`                 | `Record<string, Wrapper>`                        |
| Map/List pair        | `node_list`, `edge_list`             | `[data array, map]`                      | Ordered list of wrappers                        |
| Map-of-lists pair    | `node_outs`, `node_ins`              | `[edge array, edge map]`                 | `Record<string, EdgeWrapper[]>`                 |
| Subset pair          | `subset_nodes`, `subset_edges`       | `[items array, key array]`               | Filtered list keyed via map lookup              |
| Singleton            | `graph`                              | `[]` (no dependencies)                   | Placeholder requiring external initialisation   |

Use these categories when defining tuple discriminants so lookup helpers can branch on a concrete `kind` rather than relying on positional heuristics.
