import { GraphSpec, Dataflow, DataflowInstance, DataflowNode, Graph, isDataflowInstance, Edge, GraphOptions } from './types.js';
import { graph_detect } from './graph.js';

class DataflowInstanceImpl implements DataflowInstance {
  _yes_i_am_really_dataflow = true;
  
  constructor(
    private flowgraph: Graph,
    private instance: Record<string, unknown>,
    private inputs: Record<string, unknown>
  ) {}

  calc(id: string): unknown {
    if (!this.instance[id]) {
      const n = this.flowgraph.node(id);
      if (!n) {
        throw new Error(`Node ${id} not found in dataflow graph`);
      }
      const nodeValue = n.value() as DataflowNode;
      this.instance[id] = nodeValue.calc(this).apply(null, n.ins().map((e: Edge) => {
        return this.calc(e.source().key());
      }));
      console.assert(this.instance[id]);
    }
    return this.instance[id];
  }

  input(namespace: string, field: string): unknown {
    const input = this.inputs[namespace];
    if (input && isDataflowInstance(input)) {
      return input.calc(field);
    } else if (input && typeof input === 'object') {
      return (input as Record<string, unknown>)[field];
    }
    return undefined;
  }
}

class DataflowImpl implements Dataflow {
  private flowgraph: Graph;

  constructor(spec: GraphSpec, options?: Record<string, unknown>) {
    this.flowgraph = graph_detect(spec, options as Partial<GraphOptions>);
  }

  instantiate(instance: Record<string, unknown>, inputs: Record<string, unknown>): DataflowInstance {
    return new DataflowInstanceImpl(this.flowgraph, instance, inputs);
  }
}

/**
 * Creates a dataflow computation graph for lazy evaluation of dependent calculations.
 * Nodes represent computations and edges represent data dependencies.
 * 
 * @param spec - Graph specification defining the computation nodes and their dependencies
 * @param options - Optional configuration for graph format
 * @returns A dataflow instance that can be instantiated with input data
 * 
 * @example
 * ```typescript
 * const flow = dataflow({
 *   nodes: [
 *     {key: 'a'},
 *     {key: 'sum', calc: (flow) => (a, b) => a + b}
 *   ],
 *   edges: [
 *     {key: 'dep', value: {source: 'a', target: 'sum'}}
 *   ]
 * });
 * const instance = flow.instantiate({sum: 10}, {a: 5});
 * console.log(instance.calc('sum')); // 15
 * ```
 */
export function dataflow(spec: GraphSpec, options?: Record<string, unknown>): Dataflow {
  return new DataflowImpl(spec, options);
}