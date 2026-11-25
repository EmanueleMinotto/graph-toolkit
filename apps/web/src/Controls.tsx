import { type VertexId } from 'graph-toolkit';
import { ANALYSES, type AnalysisKind } from './analysis.js';
import { FORMATS, SAMPLES, type Format, type SampleKind } from './formats.js';

const DEFAULT_SIZE = 6;

type Option<T extends string> = readonly T[];

interface SelectProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: Option<T>;
  readonly onChange: (value: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

interface GenerateProps {
  readonly onGenerate: (kind: SampleKind, size: number) => void;
}

export function GeneratePanel({ onGenerate }: GenerateProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onGenerate(data.get('kind') as SampleKind, Number(data.get('size')));
      }}
    >
      <h2>Generate</h2>
      <label>
        Kind
        <select name="kind" defaultValue="cycle">
          {SAMPLES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        Size
        <input name="size" type="number" min={1} max={30} defaultValue={DEFAULT_SIZE} />
      </label>
      <button type="submit">Generate</button>
    </form>
  );
}

interface ImportProps {
  readonly format: Format;
  readonly text: string;
  readonly isDirected: boolean;
  readonly onFormat: (format: Format) => void;
  readonly onText: (text: string) => void;
  readonly onDirected: (isDirected: boolean) => void;
  readonly onImport: () => void;
  readonly onExport: () => void;
}

export function ImportPanel(props: ImportProps) {
  return (
    <section>
      <h2>Import / export</h2>
      <Select label="Format" value={props.format} options={FORMATS} onChange={props.onFormat} />
      <label>
        <input
          type="checkbox"
          checked={props.isDirected}
          onChange={(event) => props.onDirected(event.target.checked)}
        />
        Directed (edge list / CSV)
      </label>
      <textarea
        aria-label="Graph text"
        value={props.text}
        onChange={(event) => props.onText(event.target.value)}
        rows={10}
      />
      <button type="button" onClick={props.onImport}>
        Import
      </button>
      <button type="button" onClick={props.onExport}>
        Export current
      </button>
    </section>
  );
}

interface AnalysisProps {
  readonly kind: AnalysisKind;
  readonly vertices: readonly VertexId[];
  readonly from: VertexId | undefined;
  readonly to: VertexId | undefined;
  readonly summary: string;
  readonly onKind: (kind: AnalysisKind) => void;
}

export function AnalysisPanel(props: AnalysisProps) {
  return (
    <section>
      <h2>Analysis</h2>
      <Select label="Algorithm" value={props.kind} options={ANALYSES} onChange={props.onKind} />
      <p>
        Click vertices to choose start ({props.from ?? '–'}) and target ({props.to ?? '–'}).
      </p>
      <output aria-live="polite">{props.summary}</output>
    </section>
  );
}
