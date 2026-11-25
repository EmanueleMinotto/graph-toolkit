import { type VertexId } from 'graph-toolkit';
import { useEffect, useState } from 'react';

export interface Group {
  readonly members: ReadonlySet<VertexId>;
  readonly toggle: (id: VertexId) => void;
  readonly clear: () => void;
}

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

/**
 * A set of vertices chosen with Shift+click. Escape clears it; Delete or Backspace calls
 * `onDelete` with the members (unless a text field has focus).
 */
export function useGroup(onDelete: ((ids: ReadonlySet<VertexId>) => void) | undefined): Group {
  const [members, setMembers] = useState<ReadonlySet<VertexId>>(new Set());
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (members.size === 0 || isTyping(event.target)) return;
      if (event.key === 'Escape') setMembers(new Set());
      if (onDelete === undefined || !['Delete', 'Backspace'].includes(event.key)) return;
      onDelete(members);
      setMembers(new Set());
    };
    globalThis.addEventListener('keydown', onKey);
    return () => {
      globalThis.removeEventListener('keydown', onKey);
    };
  }, [members, onDelete]);
  return {
    members,
    toggle: (id) => {
      setMembers((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      });
    },
    clear: () => {
      setMembers(new Set());
    },
  };
}
