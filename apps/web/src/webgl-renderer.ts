/* eslint-disable functional/immutable-data -- WebGL is a stateful API: canvas size and buffers are set on it */
import { STRIDE, type Scene } from './webgl-scene.js';
import { type View } from './viewport.js';

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec4 a_color;
attribute float a_diameter;
uniform vec2 u_box;
uniform vec3 u_view;
uniform float u_pixels;
varying vec4 v_color;
void main() {
  vec2 screen = a_position * u_view.z + u_view.xy;
  vec2 clip = screen / u_box * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_diameter * u_view.z * u_pixels;
  v_color = a_color;
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec4 v_color;
uniform float u_round;
void main() {
  vec2 offset = gl_PointCoord - 0.5;
  if (u_round > 0.5 && dot(offset, offset) > 0.25) discard;
  gl_FragColor = v_color;
}`;

export interface Surface {
  readonly box: { readonly width: number; readonly height: number };
  /** Size of the canvas in CSS pixels. */
  readonly width: number;
  readonly pixelRatio: number;
}

export interface Renderer {
  readonly draw: (scene: Scene, view: View, surface: Surface) => void;
  readonly dispose: () => void;
}

function compile(gl: WebGLRenderingContext, kind: number, source: string): WebGLShader | null {
  const shader = gl.createShader(kind);

  if (shader === null) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  return shader;
}

function link(gl: WebGLRenderingContext): WebGLProgram | undefined {
  const program = gl.createProgram();
  const shaders = [
    compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER),
    compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER),
  ];

  for (const shader of shaders) {
    if (shader !== null) {
      gl.attachShader(program, shader);
    }
  }

  gl.linkProgram(program);
  const isLinked = gl.getProgramParameter(program, gl.LINK_STATUS) === true;

  return isLinked && !shaders.includes(null) ? program : undefined;
}

function bind(gl: WebGLRenderingContext, program: WebGLProgram, data: Float32Array): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
  const bytes = STRIDE * Float32Array.BYTES_PER_ELEMENT;
  const fields = [
    ['a_position', 2, 0],
    ['a_color', 4, 2],
    ['a_diameter', 1, 6],
  ] as const;

  for (const [name, size, offset] of fields) {
    const location = gl.getAttribLocation(program, name);

    gl.enableVertexAttribArray(location);

    gl.vertexAttribPointer(
      location,
      size,
      gl.FLOAT,
      false,
      bytes,
      offset * Float32Array.BYTES_PER_ELEMENT,
    );
  }
}

interface Context {
  readonly gl: WebGLRenderingContext;
  readonly program: WebGLProgram;
}

function drawGroup({ gl, program }: Context, data: Float32Array, mode: number): void {
  if (data.length === 0) {
    return;
  }

  gl.uniform1f(gl.getUniformLocation(program, 'u_round'), mode === gl.POINTS ? 1 : 0);
  bind(gl, program, data);
  gl.drawArrays(mode, 0, data.length / STRIDE);
}

/** A WebGL renderer for `canvas`, or `undefined` when WebGL is unavailable. */
export function createRenderer(canvas: HTMLCanvasElement): Renderer | undefined {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: true });
  const program = gl === null ? undefined : link(gl);

  if (gl === null || program === undefined) {
    return undefined;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    draw: (scene, view, surface) => {
      const pixels = surface.width * surface.pixelRatio;
      const height = (pixels * surface.box.height) / surface.box.width;

      if (canvas.width !== Math.round(pixels)) {
        canvas.width = Math.round(pixels);
      }

      if (canvas.height !== Math.round(height)) {
        canvas.height = Math.round(height);
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, 'u_box'), surface.box.width, surface.box.height);
      gl.uniform3f(gl.getUniformLocation(program, 'u_view'), view.x, view.y, view.scale);
      gl.uniform1f(gl.getUniformLocation(program, 'u_pixels'), pixels / surface.box.width);
      drawGroup({ gl, program }, scene.edges, gl.LINES);
      drawGroup({ gl, program }, scene.arrows, gl.TRIANGLES);
      drawGroup({ gl, program }, scene.vertices, gl.POINTS);
    },
    dispose: () => {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

const probed: { readonly supported?: boolean } = {};

/** Whether this browser can create a WebGL context (checked once). */
export function hasWebgl(): boolean {
  if (probed.supported === undefined) {
    const probe = createRenderer(document.createElement('canvas'));

    Object.assign(probed, { supported: probe !== undefined });
    probe?.dispose();
  }

  return probed.supported === true;
}
