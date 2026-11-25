import { Button, Checkbox, Group, NumberInput, Stack, Text } from '@mantine/core';
import { IconWand } from '@tabler/icons-react';
import { useState } from 'react';
import { ChoiceSelect } from './ChoiceSelect.js';
import { SAMPLE_CHOICES } from './choices.js';
import { Panel } from './Controls.js';
import { MAX_SIZE, randomSeed, type GenerateOptions, type SampleKind } from './samples.js';
import { t } from './i18n.js';

const DEFAULT_SIZE = 6;
const SEEDED: ReadonlySet<SampleKind> = new Set(['random', 'scale-free', 'small-world']);

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
    <Panel id="generate" title={t('New graph')} icon={IconWand}>
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
            <ChoiceSelect
              label={t('Kind')}
              value={kind}
              choices={SAMPLE_CHOICES}
              onChange={setKind}
            />
            <NumberInput
              label={t('Size')}
              name="size"
              min={1}
              max={MAX_SIZE[kind]}
              defaultValue={DEFAULT_SIZE}
              description={`max ${MAX_SIZE[kind]}`}
              inputWrapperOrder={['label', 'input', 'description', 'error']}
            />
          </Group>
          <Checkbox label={t('Directed')} name="directed" />
          {SEEDED.has(kind) ? (
            <Group grow align="flex-end">
              <NumberInput label={t('Seed')} name="seed" min={0} placeholder={t('random')} />
              {kind === 'random' ? (
                <NumberInput
                  label={t('Probability')}
                  name="probability"
                  min={0}
                  max={1}
                  step={0.05}
                  decimalScale={3}
                  placeholder={t('auto')}
                />
              ) : null}
            </Group>
          ) : null}
          {lastSeed !== undefined && SEEDED.has(kind) ? (
            <Text size="sm" c="dimmed">
              Last seed: {lastSeed} (type it in Seed to reproduce the graph)
            </Text>
          ) : null}
          <Button type="submit">{t('Generate')}</Button>
        </Stack>
      </form>
    </Panel>
  );
}
