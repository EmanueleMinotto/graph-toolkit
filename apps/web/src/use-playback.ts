import { useEffect, useMemo, useState } from 'react';
import { type Highlight } from './analysis-types.js';
import { reveal } from './playback.js';

const STEP_MS = 500;

export interface Playback {
  /** Number of steps the result was built in; 0 when it cannot be animated. */
  readonly total: number;
  readonly step: number;
  readonly isPlaying: boolean;
  readonly seek: (step: number) => void;
  /** Plays from the start, or pauses. */
  readonly toggle: () => void;
}

/**
 * Steps through `result` one discovery at a time. A new result starts fully shown; pressing play
 * rewinds and reveals one step every half second.
 */
export function usePlayback(result: Highlight): readonly [Highlight, Playback] {
  const total = result.steps?.length ?? 0;
  const [state, setState] = useState({ result, step: total, isPlaying: false });
  const current = state.result === result ? state : { result, step: total, isPlaying: false };
  useEffect(() => {
    if (!current.isPlaying) {
      return;
    }
    const timer = setInterval(() => {
      setState((previous) => {
        const done = previous.step >= total;
        return { ...previous, result, step: done ? total : previous.step + 1, isPlaying: !done };
      });
    }, STEP_MS);
    return () => {
      clearInterval(timer);
    };
  }, [current.isPlaying, result, total]);
  const shown = useMemo(() => reveal(result, current.step), [result, current.step]);
  const playback: Playback = {
    total,
    step: current.step,
    isPlaying: current.isPlaying,
    seek: (step) => {
      setState({ result, step, isPlaying: false });
    },
    toggle: () => {
      setState({
        result,
        step: current.isPlaying ? current.step : 0,
        isPlaying: !current.isPlaying,
      });
    },
  };
  return [shown, playback];
}
