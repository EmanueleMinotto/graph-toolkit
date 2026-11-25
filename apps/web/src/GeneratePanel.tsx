import { Button, Checkbox, Group, NumberInput, Stack, Text } from '@mantine/core';
import { IconWand } from '@tabler/icons-react';
import { useState } from 'react';
import { ChoiceSelect } from './ChoiceSelect.js';
import { SAMPLE_CHOICES } from './choices.js';
import { Panel } from './Controls.js';
import { MAX_SIZE, randomSeed, type GenerateOptions, type SampleKind } from './formats.js';

const DEFAULT_SIZE = 6;

interface Props {
  readonly onGenerate: (kind: SampleKind, size: number, options: GenerateOptions) => void;
}

const readOptions = (data: FormData): GenerateOptions => {
  const probability = data.get('probability');
  const seed = data.get('seed');
  return {
    directed: data.get('directed') === 'on',
    seed: typeof seed === 'string' && seed !== '' ? Number(seed) : randomSeed(),
    probability:
      typeof probability === 'string' && probability !== '' ? Number(probability) : undefined,
  };
};

export function GeneratePanel({ onGenerate }: Props) {
  const [kind, setKind] = useState<SampleKind>('cycle');
  const [lastSeed, setLastSeed] = useState<number | undefined>();
  return (
    <Panel id="generate" title="New graph" icon={IconWand}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const options = readOptions(data);
          setLastSeed(options.seed);
          onGenerate(kind, Number(data.get('size')), options);
        }}
      >
        <Stack gap="sm">
          <Group grow align="flex-start">
            <ChoiceSelect label="Kind" value={kind} choices={SAMPLE_CHOICES} onChange={setKind} />
            <NumberInput
              label="Size"
              name="size"
              min={1}
              max={MAX_SIZE[kind]}
              defaultValue={DEFAULT_SIZE}
              description={`max ${MAX_SIZE[kind]}`}
              inputWrapperOrder={['label', 'input', 'description', 'error']}
            />
          </Group>
          <Checkbox label="Directed" name="directed" />
          {kind === 'random' ? (
            <Group grow align="flex-end">
              <NumberInput label="Seed" name="seed" min={0} placeholder="random" />
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
          {kind === 'random' && lastSeed !== undefined ? (
            <Text size="sm" c="dimmed">
              Last seed: {lastSeed} (type it in Seed to reproduce the graph)
            </Text>
          ) : null}
          <Button type="submit">Generate</Button>
        </Stack>
      </form>
    </Panel>
  );
}
