import { IconLayout } from '@tabler/icons-react';
import { ChoiceSelect } from './ChoiceSelect.js';
import { LAYOUT_CHOICES } from './choices.js';
import { Panel } from './Controls.js';
import { type LayoutKind } from './layouts.js';

interface Props {
  readonly value: LayoutKind;
  readonly onChange: (kind: LayoutKind) => void;
}

export function LayoutPanel({ value, onChange }: Props) {
  return (
    <Panel id="layout" title="Layout" icon={IconLayout}>
      <ChoiceSelect label="Layout" value={value} choices={LAYOUT_CHOICES} onChange={onChange} />
    </Panel>
  );
}
