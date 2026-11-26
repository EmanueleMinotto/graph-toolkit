// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHistory } from './use-history.js';

describe('useHistory', () => {
  it('undoes, redoes and drops the redo branch on a new push', () => {
    const { result } = renderHook(() => useHistory(() => 1));

    expect([result.current.canUndo, result.current.canRedo]).toEqual([false, false]);

    act(() => {
      result.current.push(2);
    });

    act(() => {
      result.current.push(3);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.present).toBe(2);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.present).toBe(3);

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    act(() => {
      result.current.push(9);
    });

    expect([result.current.present, result.current.canRedo]).toEqual([9, false]);
  });

  it('ignores undo and redo when there is nothing to travel to', () => {
    const { result } = renderHook(() => useHistory(() => 'a'));

    act(() => {
      result.current.undo();
      result.current.redo();
    });

    expect(result.current.present).toBe('a');
  });

  it('keeps at most 50 past states', () => {
    const { result } = renderHook(() => useHistory(() => 0));
    const steps = Array.from({ length: 60 }, (_, index) => index + 1);

    for (const value of steps) {
      act(() => {
        result.current.push(value);
      });
    }

    for (const value of steps) {
      act(() => {
        result.current.undo();
      });

      expect(result.current.present).toBe(Math.max(60 - value, 10));
    }

    expect(result.current.present).toBe(10);
  });
});
