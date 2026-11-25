import { useState } from 'react';

export interface Guard {
  readonly error: string;
  readonly setError: (message: string) => void;
  /** Runs `action`; a thrown error becomes the message shown to the user. */
  readonly guarded: (action: () => void) => void;
}

export function useGuard(): Guard {
  const [error, setError] = useState('');
  return {
    error,
    setError,
    guarded: (action) => {
      try {
        action();
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'Unexpected error');
      }
    },
  };
}
