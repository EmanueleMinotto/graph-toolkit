import { ActionIcon, Group, Slider, Text } from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { type Playback } from './use-playback.js';
import { t } from './i18n.js';

/** Play, pause and scrub through the steps an algorithm took. */
export function PlaybackBar({ playback }: { readonly playback: Playback }) {
  const Glyph = playback.isPlaying ? IconPlayerPause : IconPlayerPlay;
  return (
    <Group gap="xs" wrap="nowrap">
      <ActionIcon
        variant="default"
        aria-label={t(playback.isPlaying ? 'Pause animation' : 'Play animation')}
        onClick={playback.toggle}
      >
        <Glyph size={16} />
      </ActionIcon>
      <Slider
        flex={1}
        min={0}
        max={playback.total}
        value={playback.step}
        label={null}
        aria-label={t('Step')}
        onChange={playback.seek}
      />
      <Text size="xs" c="dimmed" miw={48} ta="right">
        {playback.step}/{playback.total}
      </Text>
    </Group>
  );
}
