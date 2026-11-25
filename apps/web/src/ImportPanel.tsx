import { Button, Checkbox, FileButton, Group, Textarea } from '@mantine/core';
import { Panel, Select } from './Controls.js';
import { FORMATS, formatFromFileName, type Format } from './formats.js';

interface Props {
  readonly format: Format;
  readonly text: string;
  readonly isDirected: boolean;
  readonly onFormat: (format: Format) => void;
  readonly onText: (text: string) => void;
  readonly onDirected: (isDirected: boolean) => void;
  readonly onImport: () => void;
  readonly onExport: () => void;
  readonly onDownload: () => void;
}

export function ImportPanel(props: Props) {
  const upload = async (file: File | null): Promise<void> => {
    if (file === null) return;
    const format = formatFromFileName(file.name);
    if (format !== undefined) props.onFormat(format);
    props.onText(await file.text());
  };
  return (
    <Panel title="Import / export">
      <Select label="Format" value={props.format} options={FORMATS} onChange={props.onFormat} />
      <Checkbox
        label="Directed (edge list / CSV)"
        checked={props.isDirected}
        onChange={(event) => props.onDirected(event.currentTarget.checked)}
      />
      <Textarea
        aria-label="Graph text"
        value={props.text}
        onChange={(event) => props.onText(event.currentTarget.value)}
        rows={8}
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
      />
      <Group grow>
        <Button onClick={props.onImport}>Import</Button>
        <Button variant="default" onClick={props.onExport}>
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
        <Button variant="default" onClick={props.onDownload}>
          Download
        </Button>
      </Group>
    </Panel>
  );
}
