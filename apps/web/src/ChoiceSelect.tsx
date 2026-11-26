/* eslint-disable functional/prefer-readonly-type -- Mantine's `data` prop only accepts mutable arrays */
import { Group, Select, Text, type ComboboxItem, type ComboboxItemGroup } from '@mantine/core';
import { IconCheck, type Icon } from '@tabler/icons-react';
import { t } from './i18n.js';

export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon: Icon;
  /** Options with the same group are listed under one heading; none means top level. */
  readonly group?: string | undefined;
  readonly disabled?: boolean | undefined;
}

interface Props<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly choices: readonly Choice<T>[];
  readonly onChange: (value: T) => void;
  /** Lets the user type to filter long lists. */
  readonly isSearchable?: boolean;
}

type Data = (ComboboxItem | ComboboxItemGroup<ComboboxItem>)[];

function toData<T extends string>(choices: readonly Choice<T>[]): Data {
  return [...Map.groupBy(choices, ({ group = '' }) => group)].flatMap(([group, members]): Data => {
    const items = members.map(({ value, label, disabled = false }) => ({
      value,
      label: t(label),
      disabled,
    }));
    return group === '' ? items : [{ group: t(group), items }];
  });
}

/** A Mantine Combobox-based select with grouped options and an icon on every option. */
export function ChoiceSelect<T extends string>(props: Props<T>) {
  const byValue = new Map(props.choices.map((choice) => [choice.value, choice]));
  const Current = byValue.get(props.value)?.icon;
  return (
    <Select
      label={props.label}
      value={props.value}
      data={toData(props.choices)}
      searchable={props.isSearchable ?? false}
      allowDeselect={false}
      leftSection={Current === undefined ? undefined : <Current size={16} stroke={1.5} />}
      renderOption={({ option, checked }) => {
        const Option = byValue.get(option.value as T)?.icon;
        return (
          <Group gap="xs" wrap="nowrap" w="100%">
            {Option === undefined ? null : <Option size={16} stroke={1.5} />}
            <Text size="sm" flex={1}>
              {option.label}
            </Text>
            {checked === true ? <IconCheck size={14} /> : null}
          </Group>
        );
      }}
      onChange={(value) => {
        if (value !== null) {
          props.onChange(value as T);
        }
      }}
    />
  );
}
