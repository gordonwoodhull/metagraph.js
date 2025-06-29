import { GraphSpec, Dataflow, DataflowInstance, DataflowNode } from './types.js';
import { graph_detect } from './graph.js';

class DataflowInstanceImpl implements DataflowInstance {
  _yes_i_am_really_dataflow = true;
  
  constructor(
    private flowgraph: any,
    private instance: Record<string, any>,
    private inputs: Record<string, any>
  ) {}

  calc(id: string): any {
    if (!this.instance[id]) {
      const n = this.flowgraph.node(id);
      if (!n) {
        throw new Error(`Node ${id} not found in dataflow graph`);
      }
      const nodeValue = n.value() as DataflowNode;
      this.instance[id] = nodeValue.calc(this).apply(null, n.ins().map((e: any) => {
        return this.calc(e.source().key());
      }));
      console.assert(this.instance[id]);
    }
    return this.instance[id];
  }

  input(namespace: string, field: string): any {
    const input = this.inputs[namespace];
    if (input && input._yes_i_am_really_dataflow) {
      return input.calc(field);
    } else {
      return input[field];
    }
  }
}

class DataflowImpl implements Dataflow {
  private flowgraph: any;

  constructor(spec: GraphSpec, options?: any) {
    this.flowgraph = graph_detect(spec, options);
  }

  instantiate(instance: Record<string, any>, inputs: Record<string, any>): DataflowInstance {
    return new DataflowInstanceImpl(this.flowgraph, instance, inputs);
  }
}

export function dataflow(spec: GraphSpec, options?: any): Dataflow {
  return new DataflowImpl(spec, options);
}