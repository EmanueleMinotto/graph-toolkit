import { NativeSelect, Paper, Stack, Title } from '@mantine/core';
import { type ReactNode } from 'react';

interface SelectProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly onChange: (value: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <NativeSelect
      label={label}
      value={value}
      data={[...options]}
      onChange={(event) => onChange(event.currentTarget.value as T)}
    />
  );
}

export function Panel({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={4}>{title}</Title>
        {children}
      </Stack>
    </Paper>
  );
}
