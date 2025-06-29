import { describe, it, expect, beforeEach } from 'vitest';
import { dataflow } from '../src/index.js';

describe('dataflow', () => {
  let graph: any;

  const get_key = (n: any) => n.key();
  
  // use non-standard data shape to test accessor use
  const access = {
    nodeKey: (n: any) => n.id,
    nodeValue: (n: any) => n,
    edgeKey: (e: any) => e.id,
    edgeValue: (e: any) => e,
    edgeSource: (e: any) => e.tail,
    edgeTarget: (e: any) => e.head
  };

  describe('arithmetic', () => {
    const add = (flow: any) => (a: number, b: number) => a + b;
    const subtract = (flow: any) => (a: number, b: number) => a - b;
    const multiply = (flow: any) => (a: number, b: number) => a * b;
    const divide = (flow: any) => (a: number, b: number) => a / b;
    
    const spec = {
      nodes: [
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'a+a', calc: add },
        { id: 'b*c', calc: multiply },
        { id: 'b*c/(a+a)', calc: divide }
      ],
      edges: [
        { id: 'a', tail: 'a', head: 'a+a' },
        { id: 'b', tail: 'a', head: 'a+a' },
        { id: 'c', tail: 'b', head: 'b*c' },
        { id: 'd', tail: 'c', head: 'b*c' },
        { id: 'e', tail: 'b*c', head: 'b*c/(a+a)' },
        { id: 'f', tail: 'a+a', head: 'b*c/(a+a)' }
      ]
    };
    
    let arithflow: any;
    
    beforeEach(() => {
      arithflow = dataflow(spec, access);
    });

    describe('with 1,2,3', () => {
      const inst = { a: 1, b: 2, c: 3 };
      it('results in 3', () => {
        expect(arithflow.instantiate(inst, {}).calc('b*c/(a+a)')).toBe(3);
      });
    });

    describe('with 2,8,8.5', () => {
      const inst = { a: 2, b: 8, c: 8.5 };
      it('results in 17', () => {
        expect(arithflow.instantiate(inst, {}).calc('b*c/(a+a)')).toBe(17);
      });
    });
  });
});