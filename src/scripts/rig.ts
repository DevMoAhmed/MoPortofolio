/* ============================================================
   rig.ts — how the animal is drawn
   ------------------------------------------------------------
   FLAT 2D. No gradients, no radial shading, no soft glow
   sprites, no rim lights, no drop shadows. Everything here is a
   solid fill or a hairline, the way the silhouette references
   are built. If you are tempted to add a gradient for "depth",
   add a shape instead.

   One drawing language, two rigs. The hero dock and the Arms
   crown differ only in how their arms are *shaped* — beziers to
   a row of clamps, or an IK chain to a branch label. What the
   arms are made of lives here:

     · a flat mantle with one aperture, not two eyes
     · armoured limbs: a tapered silhouette cut into segment
       plates, ribbed across the arm, after the mechanical
       tentacle reference
     · a photophore inlay down the spine of every arm
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

/** flat ink: the body tone, one step darker for the shadow plates */
const plateInk = (skin: Skin) => mixRGB(skin.body, skin.bodyDeep, 0.55);

function traceEdge(
  ctx: CanvasRenderingContext2D,
  pts: Sample[],
  width: (t: number) => number,
  side: number,
  scale = 1,
): void {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const w = width(p.t) * side * scale;
    const x = p.x + p.nx * w;
    const y = p.y + p.ny * w;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

/**
 * One arm. Flat silhouette, hairline outline, segment plates across
 * it, inlay down the spine. `width(t)` is the half-width at t, so each
 * rig keeps its own taper.
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
  const hair = Math.max(0.8, unit * 0.013);

  // 1 · the silhouette, one solid fill
  ctx.beginPath();
  traceEdge(ctx, pts, width, 1);
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    const w = width(p.t);
    ctx.lineTo(p.x - p.nx * w, p.y - p.ny * w);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(skin.body, 1);
  ctx.fill();

  // 2 · the underside plate — a flat second colour, not a gradient.
  //     Clipped to the silhouette so the arm still reads as one piece.
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  traceEdge(ctx, pts, width, 1);
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    const w = width(p.t) * 0.12;
    ctx.lineTo(p.x + p.nx * w, p.y + p.ny * w);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(plateInk(skin), 1);
  ctx.fill();

  // 3 · segment ribs, straight across the arm — the armoured tentacle
  ctx.strokeStyle = rgba(skin.bodyDeep, 0.9);
  ctx.lineWidth = hair;
  const ribs = Math.max(6, Math.round(pts.length / 2));
  for (let r = 1; r < ribs; r++) {
    const i = Math.round((r / ribs) * (pts.length - 1));
    const p = pts[i]!;
    const w = width(p.t);
    ctx.beginPath();
    ctx.moveTo(p.x + p.nx * w, p.y + p.ny * w);
    ctx.lineTo(p.x - p.nx * w, p.y - p.ny * w);
    ctx.stroke();
  }
  ctx.restore();

  // 4 · outline, drawn after the ribs so the edge stays crisp
  ctx.beginPath();
  traceEdge(ctx, pts, width, 1);
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    const w = width(p.t);
    ctx.lineTo(p.x - p.nx * w, p.y - p.ny * w);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba(skin.rim, 0.55 + emphasis * 0.45);
  ctx.lineWidth = hair;
  ctx.stroke();

  // 5 · the inlay, down the spine
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = rgba(skin.glow, clamp((0.5 + emphasis * 0.45) * skin.strength, 0, 1));
  ctx.lineWidth = Math.max(1, unit * 0.016);
  ctx.lineCap = 'butt';
  ctx.stroke();

  // 6 · vias: flat discs, no halo
  const via: RGB = mixRGB(skin.glow, skin.fg, 0.4);
  ctx.fillStyle = rgba(via, 0.8 + emphasis * 0.2);
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
  ctx.fillStyle = rgba(skin.flare, 1);
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
  emphasis = 0,
): void {
  const w = Math.max(5, unit * 0.13);
  const h = Math.max(3.5, unit * 0.085);
  const hair = Math.max(0.8, unit * 0.013);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.rect(-w * 0.5, -h, w, h * 2);
  ctx.fillStyle = rgba(skin.bg, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(mixRGB(skin.rim, skin.glow, 0.35), 0.75 + emphasis * 0.25);
  ctx.lineWidth = hair;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.5, -h * 0.5);
  ctx.lineTo(w * 0.95, -h * 0.5);
  ctx.moveTo(w * 0.5, h * 0.5);
  ctx.lineTo(w * 0.95, h * 0.5);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.4, unit * (0.022 + emphasis * 0.012)), 0, TAU);
  ctx.fillStyle = rgba(skin.flare, 1);
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
 * The mantle. Flat: a solid dome, a solid skirt, a hairline seam, one
 * aperture band with a lit slit that tracks whatever you point at, and
 * a collar carrying the bus line every arm leaves from.
 */
export function drawMantle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  unit: number,
  skin: Skin,
  { t, reduced, lookX }: MantleOpts,
): void {
  const R = unit;
  const breathe = reduced ? 1 : 1 + Math.sin(t * 0.72) * 0.02;
  const hair = Math.max(0.8, R * 0.016);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(breathe, 1 / breathe);

  // skirt behind, dome in front — two flat shapes, no blending
  ctx.fillStyle = rgba(plateInk(skin), 1);
  ctx.beginPath();
  ctx.ellipse(0, R * 0.4, R * 0.86, R * 0.5, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = rgba(skin.body, 1);
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.3, R * 0.9, R * 1.06, 0, 0, TAU);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, -R * 0.3, R * 0.9, R * 1.06, 0, 0, TAU);
  ctx.strokeStyle = rgba(skin.rim, 0.6);
  ctx.lineWidth = hair;
  ctx.stroke();

  // mantle plating: three seams across the dome, same language as the
  // ribs on the arms
  ctx.strokeStyle = rgba(skin.bodyDeep, 0.75);
  ctx.lineWidth = hair;
  for (const f of [-0.9, -0.6, -0.32]) {
    const ry = Math.sqrt(Math.max(0, 1 - Math.pow((f * R + R * 0.3) / (R * 1.06), 2)));
    const halfW = R * 0.9 * ry;
    ctx.beginPath();
    ctx.moveTo(-halfW, f * R);
    ctx.lineTo(halfW, f * R);
    ctx.stroke();
  }

  // chromatophore freckles — flat discs
  ctx.globalAlpha = 0.16;
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
  ctx.fillStyle = rgba(skin.bg, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(skin.rim, 0.6);
  ctx.lineWidth = Math.max(0.7, R * 0.014);
  ctx.stroke();

  const off = clamp(lookX, -1, 1) * R * 0.2;
  ctx.beginPath();
  ctx.rect(-R * 0.42 + off, apY - R * 0.045, R * 0.84, R * 0.09);
  ctx.fillStyle = rgba(skin.flare, 1);
  ctx.fill();

  // collar and bus line
  const cw = R * 1.5;
  ctx.beginPath();
  ctx.rect(-cw / 2, R * 0.58, cw, R * 0.2);
  ctx.fillStyle = rgba(skin.bodyDeep, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(skin.rim, 0.6);
  ctx.lineWidth = Math.max(0.7, R * 0.014);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-cw * 0.38, R * 0.68);
  ctx.lineTo(cw * 0.38, R * 0.68);
  ctx.strokeStyle = rgba(skin.glow, clamp(0.8 * skin.strength, 0, 1));
  ctx.lineWidth = Math.max(1, R * 0.022);
  ctx.stroke();

  ctx.restore();
}
