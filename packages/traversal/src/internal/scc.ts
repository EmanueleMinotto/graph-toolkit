import type { Csr } from '@graph-toolkit/core';

interface State {
  readonly csr: Csr;
  readonly index: Int32Array;
  readonly low: Int32Array;
  readonly isOnStack: Uint8Array;
  readonly cursor: Uint32Array;
  readonly stack: number[];
  readonly components: number[][];
  counter: number;
}

function enter(state: State, vertex: number): void {
  state.index[vertex] = state.counter;
  state.low[vertex] = state.counter;
  state.counter++;
  state.stack.push(vertex);
  state.isOnStack[vertex] = 1;
}

function closeComponent(state: State, root: number): void {
  const component: number[] = [];
  for (let member = -1; member !== root;) {
    member = state.stack.pop()!;
    state.isOnStack[member] = 0;
    component.push(member);
  }
  state.components.push(component);
}

/** One DFS step for the vertex on top of `calls`; returns after descending or finishing. */
function step(state: State, calls: number[]): void {
  const vertex = calls.at(-1)!;
  const { csr, index, low } = state;
  if (state.cursor[vertex]! < csr.offsets[vertex + 1]!) {
    const next = csr.targets[state.cursor[vertex]!++]!;
    if (index[next] === -1) {
      enter(state, next);
      calls.push(next);
    } else if (state.isOnStack[next] === 1) {
      low[vertex] = Math.min(low[vertex]!, index[next]!);
    }
    return;
  }
  calls.pop();
  if (low[vertex] === index[vertex]) closeComponent(state, vertex);
  const parent = calls.at(-1);
  if (parent !== undefined) low[parent] = Math.min(low[parent]!, low[vertex]!);
}

/** Iterative Tarjan, O(V + E). Components come out in reverse topological order. */
export function tarjan(csr: Csr, vertexCount: number): number[][] {
  const state: State = {
    csr,
    index: new Int32Array(vertexCount).fill(-1),
    low: new Int32Array(vertexCount),
    isOnStack: new Uint8Array(vertexCount),
    cursor: csr.offsets.slice(0, vertexCount),
    stack: [],
    components: [],
    counter: 0,
  };
  for (let root = 0; root < vertexCount; root++) {
    if (state.index[root] !== -1) continue;
    enter(state, root);
    const calls = [root];
    while (calls.length > 0) step(state, calls);
  }
  return state.components;
}
