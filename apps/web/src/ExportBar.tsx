import { Button, Group } from '@mantine/core';
import { type RefObject } from 'react';
import { downloadBlob } from './download.js';
import { pngBlob, svgMarkup } from './export-image.js';
import { t } from './i18n.js';

interface Props {
  readonly svg: RefObject<SVGSVGElement | null>;
  readonly onReset: () => void;
}

/** Buttons floating over the graph: save as SVG or PNG, and reset the view. */
export function ExportBar({ svg, onReset }: Props) {
  return (
    <Group gap="xs" className="reset">
      <Button
        size="xs"
        variant="default"
        onClick={() => {
          if (svg.current === null) {
            return;
          }
          downloadBlob('graph.svg', new Blob([svgMarkup(svg.current)], { type: 'image/svg+xml' }));
        }}
      >
        {t('Export SVG')}
      </Button>
      <Button
        size="xs"
        variant="default"
        onClick={() => {
          if (svg.current === null) {
            return;
          }
          void pngBlob(svg.current).then((blob) => {
            downloadBlob('graph.png', blob);
          });
        }}
      >
        {t('Export PNG')}
      </Button>
      <Button size="xs" variant="default" onClick={onReset}>
        {t('Reset view')}
      </Button>
    </Group>
  );
}
