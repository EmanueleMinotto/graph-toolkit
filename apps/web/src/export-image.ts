const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE_PROPERTIES = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linejoin',
  'paint-order',
  'font-size',
  'font-family',
  'font-weight',
  'opacity',
] as const;
const PNG_SCALE = 2;

/** Copies the resolved CSS of each element onto its clone, so the file renders without our stylesheet. */
function inlineStyles(source: SVGSVGElement, clone: SVGSVGElement): void {
  const pairs = [...source.querySelectorAll('*')].map(
    (element, index) => [element, clone.querySelectorAll('*').item(index)] as const,
  );

  for (const [original, copy] of pairs) {
    const computed = getComputedStyle(original);
    const declarations = STYLE_PROPERTIES.map(
      (property) => `${property}:${computed.getPropertyValue(property)}`,
    );

    copy.setAttribute('style', declarations.join(';'));
  }
}

/** Standalone SVG text of `svg` as currently drawn (zoom and pan included) on the page background. */
export function svgMarkup(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  inlineStyles(svg, clone);
  clone.setAttribute('xmlns', SVG_NS);
  const background = document.createElementNS(SVG_NS, 'rect');

  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', getComputedStyle(document.body).backgroundColor);
  clone.insertBefore(background, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener('load', () => {
      resolve(image);
    });

    image.addEventListener('error', () => {
      reject(new Error('Could not render the graph as an image.'));
    });

    // eslint-disable-next-line functional/immutable-data -- the DOM only loads an image once `src` is set
    image.src = url;
  });
}

/** Rasterizes `svg` at twice its viewBox size. */
export async function pngBlob(svg: SVGSVGElement): Promise<Blob> {
  const { width, height } = svg.viewBox.baseVal;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup(svg))}`;
  const image = await loadImage(url);
  const canvas = Object.assign(document.createElement('canvas'), {
    width: width * PNG_SCALE,
    height: height * PNG_SCALE,
  });

  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Could not encode the PNG.'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}
