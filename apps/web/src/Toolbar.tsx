import { ActionIcon, Group, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { IconCheck, IconLink } from '@tabler/icons-react';
import { useState } from 'react';
import { setLang, t, useLang } from './i18n.js';

interface Props {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  /** Link that reopens this page with the current graph. */
  readonly shareLink: () => string;
}

/** Header actions: undo, redo and the color scheme toggle. */
export function Toolbar({ canUndo, canRedo, onUndo, onRedo, shareLink }: Props) {
  return (
    <Group gap="xs">
      <ActionIcon
        variant="default"
        size="lg"
        aria-label={t('Undo')}
        disabled={!canUndo}
        onClick={() => onUndo()}
      >
        ↶
      </ActionIcon>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label={t('Redo')}
        disabled={!canRedo}
        onClick={() => onRedo()}
      >
        ↷
      </ActionIcon>
      <ShareButton link={shareLink} />
      <LanguageToggle />
      <SchemeToggle />
    </Group>
  );
}

function SchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light');
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={t('Toggle color scheme')}
      onClick={() => setColorScheme(scheme === 'light' ? 'dark' : 'light')}
    >
      {scheme === 'light' ? '☾' : '☀'}
    </ActionIcon>
  );
}

const FEEDBACK_MS = 2000;

function ShareButton({ link }: { readonly link: () => string }) {
  const [isCopied, setCopied] = useState(false);
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={t(isCopied ? 'Link copied' : 'Copy link to this graph')}
      onClick={() => {
        void navigator.clipboard.writeText(link()).then(() => {
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
          }, FEEDBACK_MS);
        });
      }}
    >
      {isCopied ? <IconCheck size={18} /> : <IconLink size={18} />}
    </ActionIcon>
  );
}

function LanguageToggle() {
  const lang = useLang();
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={t('Switch language')}
      onClick={() => {
        setLang(lang === 'en' ? 'it' : 'en');
      }}
    >
      {lang === 'en' ? 'IT' : 'EN'}
    </ActionIcon>
  );
}
