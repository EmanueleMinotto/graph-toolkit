import { vi } from 'vitest';

// jsdom lacks the browser APIs Mantine relies on.
const noop = (): void => undefined;
vi.stubGlobal(
  'ResizeObserver',
  class {
    readonly observe = noop;
    readonly unobserve = noop;
    readonly disconnect = noop;
  },
);
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: noop,
  removeEventListener: noop,
}));
