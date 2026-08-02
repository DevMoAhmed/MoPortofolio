/* ============================================================
   rig.ts — how the animal is drawn
   ------------------------------------------------------------
   One drawing language, two rigs. The hero dock and the Arms
   crown differ only in how their arms are *shaped* — beziers to
   a row of clamps, or an IK chain to a branch label. What the
   arms are made of lives here:

     · a machined mantle with one aperture, not two eyes
     · a tapered limb with a rim light on the lit side
     · a photophore inlay running the length of every arm, tacked
       down with vias
     · a clamp where the arm terminates
     · packets travelling the inlay

   Every colour is read from the active skin by the caller, so
   nothing in this file hardcodes a hue.
   ============================================================ */

import { type RGB, type Skin, TAU, clamp, rgba, mixRGB } from './palette';

/** a point on an arm's centreline, with its unit normal */
export interface Sample {
  x: number;
  y: number;
  nx: number;
  ny: number;
  /** 0 at the mantle, 1 at the terminal */
  t: number;
}

/**
 * The body of one arm: taper, rim light, inlay, vias.
 * `width(t)` is the half-width at t, so each rig keeps its own taper.
 */
export function drawLimb(
  ctx: CanvasRenderingContext2D,
  pts: Sample[],
  width: (t: number) => number,
  skin: Skin,
  unit: number,
  emphasis = 0,
): void {
  if (pts.length < 2) return;
  const head = pts[0]!;
  const tip = pts[pts.length - 1]!;

  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const w = width(p.t);
    const x = p.x + p.nx * w;
    const y = p.y + p.ny * w;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    const w = width(p.t);
    ctx.lineTo(p.x - p.nx * w, p.y - p.ny * w);
  }
  ctx.closePath();

  const grad = ctx.createLinearGradient(head.x, head.y, tip.x, tip.y);
  grad.addColorStop(0, rgba(skin.body, 0.97));
  grad.addColorStop(0.58, rgba(mixRGB(skin.body, skin.bodyDeep, 0.45), 0.93));
  grad.addColorStop(1, rgba(skin.bodyDeep, 0.85));
  ctx.fillStyle = grad;
  ctx.fill();

  // rim: a hairline held inside the lit edge, not around the whole shape
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const w = -width(p.t) * 0.62;
    const x = p.x + p.nx * w;
    const y = p.y + p.ny * w;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = rgba(skin.rim, 0.4 + emphasis * 0.45);
  ctx.lineWidth = Math.max(0.7, unit * 0.012);
  ctx.stroke();

  // the inlay — one photophore line the full length of the arm
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = rgba(skin.glow, clamp((0.46 + emphasis * 0.44) * skin.strength, 0, 1));
  ctx.lineWidth = Math.max(1, unit * 0.017);
  ctx.lineCap = 'round';
  ctx.stroke();

  // vias, where the inlay is tacked down
  const via: RGB = mixRGB(skin.glow, skin.fg, 0.4);
  ctx.fillStyle = rgba(via, 0.75 + emphasis * 0.25);
  const step = Math.max(3, Math.round(pts.length / 5));
  for (let i = step; i < pts.length - 2; i += step) {
    const p = pts[i]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.1, unit * 0.019), 0, TAU);
    ctx.fill();
  }
}

/** a packet in flight, u ∈ [0,1) along the arm */
export function drawPacket(
  ctx: CanvasRenderingContext2D,
  pts: Sample[],
  u: number,
  skin: Skin,
  unit: number,
): void {
  if (pts.length < 2) return;
  const i = clamp(Math.round(u * (pts.length - 1)), 0, pts.length - 1);
  const p = pts[i]!;
  const s = Math.max(1.8, unit * 0.045);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(p.ny, p.nx));
  ctx.fillStyle = rgba(skin.flare, 0.95);
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.restore();
}

/**
 * The terminal: a clamp seated on whatever the arm reaches, squared to
 * the arm's own direction so it reads as fitted rather than dropped on.
 */
export function drawClamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  unit: number,
  skin: Skin,
  sprite: HTMLCanvasElement,
  emphasis = 0,
): void {
  const w = Math.max(5, unit * 0.13);
  const h = Math.max(3.5, unit * 0.085);

  ctx.globalCompositeOperation = 'lighter';
  const g = unit * (0.17 + emphasis * 0.15);
  ctx.globalAlpha = clamp((0.32 + emphasis * 0.5) * skin.strength, 0, 1);
  ctx.drawImage(sprite, x - g, y - g, g * 2, g * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.rect(-w * 0.5, -h, w, h * 2);
  ctx.fillStyle = rgba(skin.bg, 0.82);
  ctx.fill();
  ctx.strokeStyle = rgba(mixRGB(skin.rim, skin.glow, 0.35), 0.7 + emphasis * 0.3);
  ctx.lineWidth = Math.max(0.8, unit * 0.013);
  ctx.stroke();
  // the two prongs
  ctx.beginPath();
  ctx.moveTo(w * 0.5, -h * 0.5);
  ctx.lineTo(w * 0.95, -h * 0.5);
  ctx.moveTo(w * 0.5, h * 0.5);
  ctx.lineTo(w * 0.95, h * 0.5);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.4, unit * (0.02 + emphasis * 0.012)), 0, TAU);
  ctx.fillStyle = rgba(skin.flare, 0.85 + emphasis * 0.15);
  ctx.fill();
}

export interface MantleOpts {
  /** seconds; drives the breathe and the freckle twinkle */
  t: number;
  reduced: boolean;
  /** −1 … 1: where the aperture is looking, 0 dead ahead */
  lookX: number;
}

/**
 * The mantle. Machined, not cartoon: one aperture band with a lit slit
 * that tracks whatever you are pointing at, a collar carrying the bus
 * line every arm leaves from, and chromatophore freckles over the dome.
 */
export function drawMantle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  unit: number,
  skin: Skin,
  sprite: HTMLCanvasElement,
  { t, reduced, lookX }: MantleOpts,
): void {
  const R = unit;
  const breathe = reduced ? 1 : 1 + Math.sin(t * 0.72) * 0.02;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(breathe, 1 / breathe);

  const dome = ctx.createRadialGradient(-R * 0.34, -R * 0.72, R * 0.08, 0, 0, R * 1.7);
  dome.addColorStop(0, rgba(mixRGB(skin.body, skin.fg, 0.2), 0.98));
  dome.addColorStop(0.52, rgba(skin.body, 0.96));
  dome.addColorStop(1, rgba(skin.bodyDeep, 0.9));
  ctx.fillStyle = dome;

  ctx.beginPath();
  ctx.ellipse(0, -R * 0.3, R * 0.9, R * 1.06, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, R * 0.4, R * 0.86, R * 0.5, 0, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -R * 0.3, R * 0.9, R * 1.06, 0, Math.PI * 1.04, Math.PI * 1.86);
  ctx.strokeStyle = rgba(skin.rim, 0.55);
  ctx.lineWidth = Math.max(0.8, R * 0.016);
  ctx.stroke();

  // freckles first, so the aperture housing sits over them
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = rgba(skin.flare, 1);
  for (let i = 0; i < 18; i++) {
    const a = (i * 2.39996) % TAU;
    const rr = Math.sqrt((i + 0.5) / 18) * R * 0.76;
    const s = R * (0.018 + ((i * 7) % 4) * 0.006);
    const twinkle = reduced ? 1 : 0.5 + 0.5 * Math.sin(t * 1.25 + i);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 1.1 - R * 0.62, s * (0.7 + twinkle * 0.6), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // aperture housing, then the slit inside it
  const apY = R * 0.16;
  ctx.beginPath();
  ctx.ellipse(0, apY, R * 0.62, R * 0.3, 0, 0, TAU);
  ctx.fillStyle = rgba(skin.bg, 0.94);
  ctx.fill();
  ctx.strokeStyle = rgba(skin.rim, 0.5);
  ctx.lineWidth = Math.max(0.7, R * 0.014);
  ctx.stroke();

  const off = clamp(lookX, -1, 1) * R * 0.2;
  const slit = ctx.createLinearGradient(-R * 0.46 + off, 0, R * 0.46 + off, 0);
  slit.addColorStop(0, rgba(skin.flare, 0));
  slit.addColorStop(0.5, rgba(skin.flare, 0.98));
  slit.addColorStop(1, rgba(skin.flare, 0));
  ctx.beginPath();
  ctx.moveTo(-R * 0.42 + off, apY);
  ctx.lineTo(R * 0.42 + off, apY);
  ctx.strokeStyle = slit;
  ctx.lineWidth = Math.max(2, R * 0.09);
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.4 * skin.strength;
  const s = R * 0.55;
  ctx.drawImage(sprite, off - s, apY - s * 0.5, s * 2, s);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // collar and bus line
  const cw = R * 1.5;
  ctx.beginPath();
  ctx.rect(-cw / 2, R * 0.58, cw, R * 0.2);
  ctx.fillStyle = rgba(skin.bodyDeep, 0.95);
  ctx.fill();
  ctx.strokeStyle = rgba(skin.rim, 0.5);
  ctx.lineWidth = Math.max(0.7, R * 0.014);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-cw * 0.38, R * 0.68);
  ctx.lineTo(cw * 0.38, R * 0.68);
  ctx.strokeStyle = rgba(skin.glow, clamp(0.7 * skin.strength, 0, 1));
  ctx.lineWidth = Math.max(1, R * 0.022);
  ctx.stroke();

  ctx.restore();
}
