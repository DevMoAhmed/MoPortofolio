/* ============================================================
   palette.ts — skin reading and canvas colour maths
   ------------------------------------------------------------
   Both canvases (the crown in Arms, the dock in Surface) tint
   themselves from the active skin's custom properties, so the
   animal re-colours with the page. These helpers are the shared
   part: read the skin, mix it, and make the one glow sprite both
   drawings light themselves with.

   Colour is never hardcoded in a canvas. It is read from CSS.
   ============================================================ */

export type RGB = [number, number, number];

export interface Skin {
  /** lit body tone, already pulled toward --fg on light skins */
  body: RGB;
  /** shadow side */
  bodyDeep: RGB;
  /** hairline along the lit edge */
  rim: RGB;
  glow: RGB;
  flare: RGB;
  fg: RGB;
  bg: RGB;
  /** --glow-strength: how hot bioluminescence runs in this skin */
  strength: number;
}

export interface Vec {
  x: number;
  y: number;
}

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + Math.PI) % TAU) - Math.PI;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export function parseColor(raw: string, fallback: RGB): RGB {
  const s = raw.trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const full =
      h.length === 3
        ? h
            .split('')
            .map((c) => c + c)
            .join('')
        : h;
    const n = Number.parseInt(full.slice(0, 6), 16);
    if (Number.isNaN(n)) return fallback;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/-?\d+(\.\d+)?/g);
  if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
  return fallback;
}

export const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

export function readSkin(): Skin {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fb: RGB) => parseColor(cs.getPropertyValue(name), fb);
  const bg = get('--bg', [5, 8, 12]);
  const bg3 = get('--bg-3', [12, 21, 34]);
  const fg = get('--fg', [228, 235, 239]);
  const glow = get('--glow', [55, 224, 189]);
  const flare = get('--flare', [255, 106, 61]);
  const strength = Number(cs.getPropertyValue('--glow-strength')) || 1;

  // a light skin swallows the animal unless it is pulled toward the
  // text colour — contrast solved per skin, not per eye
  const bgLum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
  const lift = bgLum > 0.5 ? 0.32 : 0.15;

  return {
    body: mixRGB(bg3, fg, lift),
    bodyDeep: mixRGB(bg, bg3, 0.5),
    rim: mixRGB(bg3, glow, 0.34),
    glow,
    flare,
    fg,
    bg,
    strength,
  };
}

export function makeGlowSprite(color: RGB, size = 64): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, rgba(color, 0.95));
  grad.addColorStop(0.22, rgba(color, 0.5));
  grad.addColorStop(0.55, rgba(color, 0.12));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}
