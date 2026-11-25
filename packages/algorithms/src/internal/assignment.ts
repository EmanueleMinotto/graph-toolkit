interface State {
  readonly costs: readonly (readonly number[])[];
  readonly rowPotential: Float64Array;
  readonly columnPotential: Float64Array;
  readonly matchOfColumn: Int32Array;
  readonly way: Int32Array;
}

interface Step {
  readonly slack: Float64Array;
  readonly used: Uint8Array;
}

/** Lowers slacks through `column`'s matched row; returns the tightest unused column and its slack. */
function scan(state: State, step: Step, column: number): readonly [delta: number, next: number] {
  const row = state.matchOfColumn[column]!;
  let [delta, next] = [Infinity, 0];
  for (let candidate = 1; candidate < step.used.length; candidate++) {
    if (step.used[candidate] === 1) continue;
    const reduced =
      state.costs[row - 1]![candidate - 1]! -
      state.rowPotential[row]! -
      state.columnPotential[candidate]!;
    if (reduced < step.slack[candidate]!)
      [step.slack[candidate], state.way[candidate]] = [reduced, column];
    if (step.slack[candidate]! < delta) [delta, next] = [step.slack[candidate]!, candidate];
  }
  return [delta, next];
}

function shift(state: State, step: Step, delta: number): void {
  for (let index = 0; index < step.used.length; index++) {
    if (step.used[index] === 0) step.slack[index]! -= delta;
    else {
      state.rowPotential[state.matchOfColumn[index]!]! += delta;
      state.columnPotential[index]! -= delta;
    }
  }
}

/** Grows an alternating tree from `row` until it reaches a free column. */
function freeColumn(state: State, row: number): number {
  const size = state.columnPotential.length;
  const step: Step = { slack: new Float64Array(size).fill(Infinity), used: new Uint8Array(size) };
  state.matchOfColumn[0] = row;
  let column = 0;
  do {
    step.used[column] = 1;
    const [delta, next] = scan(state, step, column);
    shift(state, step, delta);
    column = next;
  } while (state.matchOfColumn[column] !== 0);
  return column;
}

function flip(state: State, end: number): void {
  for (let column = end; column !== 0; column = state.way[column]!) {
    state.matchOfColumn[column] = state.matchOfColumn[state.way[column]!]!;
  }
}

/** Hungarian algorithm with potentials, O(rows²·columns). Requires rows ≤ columns. */
export function hungarian(costs: readonly (readonly number[])[]): number[] {
  const columns = costs[0]?.length ?? 0;
  const state: State = {
    costs,
    rowPotential: new Float64Array(costs.length + 1),
    columnPotential: new Float64Array(columns + 1),
    matchOfColumn: new Int32Array(columns + 1),
    way: new Int32Array(columns + 1),
  };
  for (let row = 1; row <= costs.length; row++) flip(state, freeColumn(state, row));
  const assignment = Array.from({ length: costs.length }, () => -1);
  for (let column = 1; column <= columns; column++) {
    if (state.matchOfColumn[column] !== 0)
      assignment[state.matchOfColumn[column]! - 1] = column - 1;
  }
  return assignment;
}
