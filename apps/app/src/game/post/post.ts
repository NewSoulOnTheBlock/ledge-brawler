// spec/app/index.md, "Story: Stay alive"
// What the whole picture does when something happens to the fighter: a glitch when it is knocked out, colours
// pulled apart when it is nearly out of health, grey while time runs slow, a ripple through the air from a
// shockwave, and a blur behind the move list. One WebGL pass over the canvas render.ts has drawn.
// The techniques are those of Celeste's effects (https://github.com/NoelFB/CelesteEffects: Glitch, Distort,
// GaussianBlur and Dither; MIT, Copyright (c) 2024 Maddy Makes Games, Inc., see LICENSE-CelesteEffects.txt),
// written here as GLSL for this game. Its other effects need textures or a 3D scene this game does not have.

/** How strongly each effect shows, from 0 (not at all) to 1; and up to four ripples, each [x, y, radius, strength] in parts of the view. */
export interface Fx {
  glitch: number; split: number; grey: number; blur: number; ripples: [number, number, number, number][]; time: number;
  /** A lit circle, [x, y, radius, strength] in parts of the view: everything outside it goes grey and dim. */
  spot: [number, number, number, number] | null;
}
export const NO_FX: Fx = { glitch: 0, split: 0, grey: 0, blur: 0, ripples: [], time: 0, spot: null };
// Nothing to show: no effect at all, or one too faint to see. The colour split of a blow dies away for a second and
// a half after it can last be seen, and the pass is not worth running for that.
const idle = (fx: Fx) => fx.glitch <= 0.001 && fx.split <= 0.03 && fx.grey <= 0.01 && fx.blur <= 0.001 && fx.ripples.length === 0 && !fx.spot;

const VERTEX = `
attribute vec2 corner;
varying vec2 uv;
void main() { uv = corner * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(corner, 0.0, 1.0); }`;

const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D picture;
uniform vec2 size;
uniform float glitch, split, grey, blur, time, aspect;
uniform vec4 ripples[4];
uniform vec4 spot;

float rand(vec2 at) { return fract(sin(dot(at, vec2(12.9898, 78.233))) * 43758.5453); }

// A ripple pushes the picture outward along a thin ring, most at the ring and not at all a little way from it.
vec2 rippled(vec2 at) {
  for (int i = 0; i < 4; i++) {
    vec4 r = ripples[i];
    vec2 from = (at - r.xy) * vec2(aspect, 1.0);
    float off = length(from) - r.z, band = 0.06;
    if (r.w > 0.0 && abs(off) < band) at += normalize(from + 0.0001) / vec2(aspect, 1.0) * (1.0 - abs(off) / band) * 0.018 * r.w * sign(off + 0.0001);
  }
  return at;
}

// Bands of the picture slide sideways and break into blocks, each band its own colour.
vec4 glitched(vec2 at) {
  float mult = abs(max(0.12, sin(time * 9.0 + at.y * 14.0))) * glitch;
  float block = max(1.0, floor(16.0 * mult)), offset = rand(vec2(floor(time * 12.0), block));
  vec2 org = vec2(clamp(at.x + (offset * 0.1 - 0.05) * mult, 0.0, 1.0), at.y), cells = size / block;
  vec4 colour = texture2D(picture, floor(org * cells) / cells + block / size * 0.5);
  return colour + vec4(offset, fract(offset + 0.34), fract(offset + 0.66), 1.0) * colour.a * 0.25 * mult;
}

// Red and blue are read a little to either side, further apart towards the edges.
vec4 pulled(vec2 at) {
  float by = 0.02 * length(at - 0.5) * 2.0 * split;
  vec4 mid = glitch > 0.001 ? glitched(at) : texture2D(picture, at);
  if (by <= 0.0) return mid;
  return vec4(texture2D(picture, at + vec2(by, 0.0)).r, mid.g, texture2D(picture, at - vec2(by, 0.0)).b, mid.a);
}

// Nine weighted readings along each axis.
vec4 blurred(vec2 at) {
  vec2 px = blur * 2.2 / size;
  vec4 sum = texture2D(picture, at) * 0.18 * 2.0;
  for (int i = 1; i <= 4; i++) {
    float w = i == 1 ? 0.15 : i == 2 ? 0.12 : i == 3 ? 0.09 : 0.05, d = float(i);
    sum += (texture2D(picture, at + vec2(px.x * d, 0.0)) + texture2D(picture, at - vec2(px.x * d, 0.0)) + texture2D(picture, at + vec2(0.0, px.y * d)) + texture2D(picture, at - vec2(0.0, px.y * d))) * w;
  }
  return sum * 0.5;
}

// The 4 by 4 ordered pattern, a 256th of a step: enough to break the bands of a slow gradient.
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer(vec2 at) { vec2 cell = at * size; return bayer2(0.5 * cell) * 0.25 + bayer2(cell); }

void main() {
  vec2 at = rippled(uv);
  vec4 colour = blur > 0.001 ? blurred(at) : pulled(at);
  float lum = dot(colour.rgb, vec3(0.3, 0.59, 0.11));
  colour.rgb = mix(colour.rgb, vec3(lum), grey);
  // The lit circle: outside it, grey and half as bright, with a soft edge.
  if (spot.w > 0.0) {
    float away = smoothstep(spot.z * 0.8, spot.z * 1.25, length((uv - spot.xy) * vec2(aspect, 1.0))) * spot.w;
    colour.rgb = mix(colour.rgb, vec3(lum) * 0.42, away);
  }
  gl_FragColor = vec4(colour.rgb + (bayer(uv) - 0.5) / 256.0, 1.0);
}`;

/** The pass from `source`, the canvas the game is drawn on, to `target`, a canvas laid over it. Null where WebGL is not to be had. */
export function createPost(source: HTMLCanvasElement, target: HTMLCanvasElement) {
  const gl = target.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const compile = (type: number, text: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, text); gl.compileShader(shader); return shader; };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, "corner");
  gl.enableVertexAttribArray(corner); gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [name, value] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, name, value);
  const at = (name: string) => gl.getUniformLocation(program, name);
  const u = { size: at("size"), glitch: at("glitch"), split: at("split"), grey: at("grey"), blur: at("blur"), time: at("time"), aspect: at("aspect"), ripples: at("ripples"), spot: at("spot") };
  let shown = false;
  return {
    /** Shows the picture with `fx`, or gets out of the way when there is nothing to show. */
    draw(fx: Fx) {
      const show = !idle(fx);
      if (show !== shown) { shown = show; target.style.visibility = show ? "visible" : "hidden"; }
      if (!show || source.width === 0) return;
      if (target.width !== source.width || target.height !== source.height) { target.width = source.width; target.height = source.height; }
      gl.viewport(0, 0, target.width, target.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.uniform2f(u.size, target.width, target.height);
      gl.uniform1f(u.glitch, fx.glitch); gl.uniform1f(u.split, fx.split); gl.uniform1f(u.grey, fx.grey); gl.uniform1f(u.blur, fx.blur);
      gl.uniform1f(u.time, fx.time % 1000); gl.uniform1f(u.aspect, target.width / target.height);
      const flat = new Float32Array(16);
      fx.ripples.slice(0, 4).forEach((r, i) => flat.set(r, i * 4));
      gl.uniform4fv(u.ripples, flat);
      gl.uniform4fv(u.spot, new Float32Array(fx.spot ?? [0, 0, 0, 0]));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
