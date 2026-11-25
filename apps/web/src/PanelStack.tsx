/* eslint-disable functional/prefer-readonly-type -- Mantine's Accordion and storage hook use mutable arrays */
import { Accordion } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { type ReactNode } from 'react';

const STORAGE_KEY = 'graph-toolkit.open-panels';

/** Every panel id: all panels start open. */
const PANEL_IDS: string[] = [
  'generate',
  'import',
  'layout',
  'operations',
  'edit',
  'validate',
  'analysis',
];

/** Collapsible sidebar sections; which ones are open survives page reloads (localStorage). */
export function PanelStack({ children }: { readonly children: ReactNode }) {
  const [open, setOpen] = useLocalStorage<string[]>({
    key: STORAGE_KEY,
    defaultValue: PANEL_IDS,
    getInitialValueInEffect: false,
  });
  return (
    <Accordion
      multiple
      variant="separated"
      value={open}
      onChange={setOpen}
      styles={{ label: { fontWeight: 600 } }}
    >
      {children}
    </Accordion>
  );
}
