import { Alert, AppShell, ScrollArea, Stack } from '@mantine/core';
import { PanelStack } from './PanelStack.js';

interface Props {
  readonly panels: Parameters<typeof PanelStack>[0]['panels'];
  /** Last error message, empty when there is none. */
  readonly error: string;
}

export function Sidebar({ panels, error }: Props) {
  return (
    <AppShell.Navbar p="md">
      <AppShell.Section grow component={ScrollArea}>
        <Stack gap="md">
          <PanelStack panels={panels} />
          {error === '' ? null : (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}
        </Stack>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}
