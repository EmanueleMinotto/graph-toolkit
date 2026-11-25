import { Button, Checkbox, FileButton, Group, Textarea } from '@mantine/core';
import { IconFileImport } from '@tabler/icons-react';
import { type Graph } from 'graph-toolkit';
import { useState } from 'react';
import { ChoiceSelect } from './ChoiceSelect.js';
import { FORMAT_CHOICES } from './choices.js';
import { Panel } from './Controls.js';
import { download } from './download.js';
import {
  fileName,
  formatFromFileName,
  parseGraph,
  serializeGraph,
  type Format,
} from './formats.js';

interface Props {
  readonly graph: Graph;
  readonly onReplace: (graph: Graph) => void;
  /** Runs an action and reports thrown errors to the user. */
  readonly guarded: (action: () => void) => void;
}

export function ImportPanel({ graph, onReplace, guarded }: Props) {
  const [format, setFormat] = useState<Format>('json');
  const [text, setText] = useState('');
  const [isDirected, setDirected] = useState(false);
  const upload = async (file: File | null): Promise<void> => {
    if (file === null) return;
    const format = formatFromFileName(file.name);
    if (format !== undefined) setFormat(format);
    setText(await file.text());
  };
  return (
    <Panel id="import" title="Import / export" icon={IconFileImport}>
      <ChoiceSelect label="Format" value={format} choices={FORMAT_CHOICES} onChange={setFormat} />
      <Checkbox
        label="Directed (edge list / CSV)"
        checked={isDirected}
        onChange={(event) => setDirected(event.currentTarget.checked)}
      />
      <Textarea
        aria-label="Graph text"
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        rows={8}
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
      />
      <Group grow>
        <Button onClick={() => guarded(() => onReplace(parseGraph(format, text, isDirected)))}>
          Import
        </Button>
        <Button
          variant="default"
          onClick={() => guarded(() => setText(serializeGraph(format, graph)))}
        >
          Export current
        </Button>
      </Group>
      <Group grow>
        <FileButton onChange={(file) => void upload(file)}>
          {(buttonProps) => (
            <Button variant="default" {...buttonProps}>
              Upload file
            </Button>
          )}
        </FileButton>
        <Button
          variant="default"
          onClick={() => guarded(() => download(fileName(format), serializeGraph(format, graph)))}
        >
          Download
        </Button>
      </Group>
    </Panel>
  );
}
