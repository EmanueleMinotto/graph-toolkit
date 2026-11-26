import { useLayoutEffect, useRef } from 'react';
import { type Scene } from './webgl-scene.js';
import { createRenderer, type Renderer } from './webgl-renderer.js';
import { type View } from './viewport.js';

interface Props {
  readonly scene: Scene;
  readonly view: View;
  readonly box: { readonly width: number; readonly height: number };
}

/**
 * Draws every edge and vertex of a big graph on one WebGL canvas, behind the SVG that keeps
 * handling clicks, drags and the selected vertices.
 */
export function WebglLayer({ scene, view, box }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<Renderer | undefined>(undefined);

  useLayoutEffect(() => {
    const created = canvas.current === null ? undefined : createRenderer(canvas.current);

    // eslint-disable-next-line functional/immutable-data -- the renderer is kept between draws
    renderer.current = created;

    return () => {
      created?.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    const element = canvas.current;

    if (element === null) {
      return;
    }

    renderer.current?.draw(scene, view, {
      box,
      width: element.clientWidth,
      pixelRatio: globalThis.devicePixelRatio,
    });
  });

  return (
    <canvas
      ref={canvas}
      className="gl-layer"
      aria-hidden="true"
      data-vertices={scene.vertices.length / 7}
      data-edges={scene.edges.length / 14}
    />
  );
}
