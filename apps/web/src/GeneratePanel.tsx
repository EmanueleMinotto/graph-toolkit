import { Button, Checkbox, Group, NativeSelect, NumberInput } from '@mantine/core';
import { useState } from 'react';
import { Panel } from './Controls.js';
import { MAX_SIZE, SAMPLES, type GenerateOptions, type SampleKind } from './formats.js';

const DEFAULT_SIZE = 6;
const DEFAULT_SEED = 7;

interface Props {
  readonly onGenerate: (kind: SampleKind, size: number, options: GenerateOptions) => void;
}

const readOptions = (data: FormData): GenerateOptions => {
  const probability = data.get('probability');
  return {
    directed: data.get('directed') === 'on',
    seed: Number(data.get('seed') ?? DEFAULT_SEED),
    probability:
      typeof probability === 'string' && probability !== '' ? Number(probability) : undefined,
  };
};

export function GeneratePanel({ onGenerate }: Props) {
  const [kind, setKind] = useState<SampleKind>('cycle');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onGenerate(kind, Number(data.get('size')), readOptions(data));
      }}
    >
      <Panel title="Generate">
        <Group grow align="flex-end">
          <NativeSelect
            label="Kind"
            name="kind"
            data={[...SAMPLES]}
            value={kind}
            onChange={(event) => setKind(event.currentTarget.value as SampleKind)}
          />
          <NumberInput
            label="Size"
            name="size"
            min={1}
            max={MAX_SIZE[kind]}
            defaultValue={DEFAULT_SIZE}
            description={`max ${MAX_SIZE[kind]}`}
          />
        </Group>
        <Checkbox label="Directed" name="directed" />
        {kind === 'random' ? (
          <Group grow align="flex-end">
            <NumberInput label="Seed" name="seed" min={0} defaultValue={DEFAULT_SEED} />
            <NumberInput
              label="Probability"
              name="probability"
              min={0}
              max={1}
              step={0.05}
              decimalScale={3}
              placeholder="auto"
            />
          </Group>
        ) : null}
        <Button type="submit">Generate</Button>
      </Panel>
    </form>
  );
}
