import { useState } from 'react';
import { type AnalysisKind } from './analysis.js';
import { toolOf } from './tools.js';

export interface ToolState {
  readonly kind: AnalysisKind;
  /** Value of the selected tool's numeric parameter. */
  readonly count: number;
  readonly setCount: (count: number) => void;
  readonly choose: (kind: AnalysisKind) => void;
}

/** Selected analysis tool and its parameter, reset to the tool's default on change. */
export function useTool(): ToolState {
  const [kind, setKind] = useState<AnalysisKind>('none');
  const [count, setCount] = useState(1);
  return {
    kind,
    count,
    setCount,
    choose: (next) => {
      setKind(next);
      setCount((current) => toolOf(next).param?.initial ?? current);
    },
  };
}
