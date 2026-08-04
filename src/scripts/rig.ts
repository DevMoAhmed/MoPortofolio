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

/** a chain of anchors, sampled into a centreline with normals.
    Catmull-Rom through every anchor — the same curve the poser draws,
    so a config exported there renders identically here. */
export function chainSamples(
  pts: { x: number; y: number }[],
  tension: number,
  steps = 96,
): Sample[] {
  if (pts.length < 2) return [];
  const at = (k: number) => pts[clamp(k, 0, pts.length - 1)]!;
  const segs: { x: number; y: number }[][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = at(i - 1),
      p1 = at(i),
      p2 = at(i + 1),
      p3 = at(i + 2);
    const t = tension / 6;
    segs.push([
      p1,
      { x: p1.x + (p2.x - p0.x) * t, y: p1.y + (p2.y - p0.y) * t },
      { x: p2.x - (p3.x - p1.x) * t, y: p2.y - (p3.y - p1.y) * t },
      p2,
    ]);
  }
  const bez = (a: { x: number; y: number }[], t: number) => {
    const u = 1 - t;
    return {
      x: u * u * u * a[0]!.x + 3 * u * u * t * a[1]!.x + 3 * u * t * t * a[2]!.x + t * t * t * a[3]!.x,
      y: u * u * u * a[0]!.y + 3 * u * u * t * a[1]!.y + 3 * u * t * t * a[2]!.y + t * t * t * a[3]!.y,
    };
  };
  const dbez = (a: { x: number; y: number }[], t: number) => {
    const u = 1 - t;
    return {
      x: 3 * u * u * (a[1]!.x - a[0]!.x) + 6 * u * t * (a[2]!.x - a[1]!.x) + 3 * t * t * (a[3]!.x - a[2]!.x),
      y: 3 * u * u * (a[1]!.y - a[0]!.y) + 6 * u * t * (a[2]!.y - a[1]!.y) + 3 * t * t * (a[3]!.y - a[2]!.y),
    };
  };
  const out: Sample[] = [];
  const m = segs.length;
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const g = u * m;
    const idx = Math.min(Math.floor(g), m - 1);
    const lt = g - idx;
    const seg = segs[idx]!;
    const pt = bez(seg, lt);
    const d = dbez(seg, lt);
    const L = Math.hypot(d.x, d.y) || 1;
    out.push({ x: pt.x, y: pt.y, nx: -d.y / L, ny: d.x / L, t: u });
  }
  return out;
}

/**
 * One arm — built, not grown. The limb is cut into discrete plates
 * with a visible gap and a pinned joint at every seam, so it reads as
 * a manufactured actuator rather than a tentacle. `width(t)` is the
 * half-width at t, so each rig keeps its own taper.
 */
export interface LimbOpts {
  /** how many plates the limb is cut into */
  plates?: number;
  /** seam gap, as a fraction of one plate's span */
  gap?: number;
  /** joint radius, as a fraction of the local half-width */
  joint?: number;
  /** hairline weight override */
  hair?: number;
}

export function drawLimb(
  ctx: CanvasRenderingContext2D,
  pts: Sample[],
  width: (t: number) => number,
  skin: Skin,
  unit: number,
  emphasis = 0,
  opts: LimbOpts = {},
): void {
  if (pts.length < 2) return;
  const hair = opts.hair ?? Math.max(0.8, unit * 0.013);
  const joint: RGB = mixRGB(skin.glow, skin.fg, 0.3);

  /** plate count — enough to read as segmented, few enough to read as parts */
  const PLATES = Math.max(1, Math.round(opts.plates ?? 7));
  const gapFrac = opts.gap ?? 0.16;
  const jointFrac = opts.joint ?? 0.5;

  // Plates are cut on the curve parameter, never on sample indices: cutting
  // on indices let a high plate count with a wide gap starve a plate of
  // samples, and it vanished without a word.
  const span = 1 / PLATES;
  const half = Math.min(span * gapFrac * 0.5, span * 0.45);
  const sampleAt = (t: number): Sample => {
    const g = clamp(t, 0, 1) * (pts.length - 1);
    const i = Math.min(Math.floor(g), pts.length - 2);
    const f = g - i;
    const a = pts[i]!;
    const b = pts[i + 1]!;
    return {
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      nx: a.nx + (b.nx - a.nx) * f,
      ny: a.ny + (b.ny - a.ny) * f,
      t: a.t + (b.t - a.t) * f,
    };
  };

  for (let s = 0; s < PLATES; s++) {
    const t0 = s * span + (s === 0 ? 0 : half);
    const t1 = (s + 1) * span - (s === PLATES - 1 ? 0 : half);
    const slice: Sample[] = [];
    const STEP = 10;
    for (let k = 0; k <= STEP; k++) slice.push(sampleAt(t0 + (t1 - t0) * (k / STEP)));

    // the plate: flat fill, hairline edge, square ends — a part with a
    // start and an end, not a length of hose
    ctx.beginPath();
    traceEdge(ctx, slice, width, 1);
    for (let i = slice.length - 1; i >= 0; i--) {
      const p = slice[i]!;
      const w = width(p.t);
      ctx.lineTo(p.x - p.nx * w, p.y - p.ny * w);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(skin.body, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(skin.rim, 0.55 + emphasis * 0.45);
    ctx.lineWidth = hair;
    ctx.stroke();

    // the actuator line: one inset stripe per plate, parallel to the arm
    ctx.beginPath();
    traceEdge(ctx, slice, width, 1, 0.44);
    ctx.strokeStyle = rgba(joint, clamp((0.4 + emphasis * 0.4) * skin.strength, 0, 1));
    ctx.lineWidth = hair;
    ctx.stroke();
  }

  // the pinned joints, one per seam, sitting over the gap
  ctx.lineWidth = hair;
  for (let s = 1; s < PLATES; s++) {
    const p = sampleAt(s * span);
    const r = Math.max(1.2, width(p.t) * jointFrac);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fillStyle = rgba(skin.bodyDeep, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(joint, clamp((0.6 + emphasis * 0.4) * skin.strength, 0, 1));
    ctx.stroke();
  }
}

/**
 * The run from a clamp to the branch it serves. Right-angled with a
 * chamfered corner, the way a trace is routed — a straight diagonal
 * across 200px reads as slack cable, and this animal has none.
 */
export function drawLead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  unit: number,
  skin: Skin,
  emphasis = 0,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // break along the long axis first, so the corner lands away from both ends
  const vertical = Math.abs(dy) > Math.abs(dx);
  const corner = vertical ? { x: from.x, y: to.y } : { x: to.x, y: from.y };
  const chamfer = Math.min(unit * 0.22, Math.abs(dx) * 0.5, Math.abs(dy) * 0.5);

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  if (chamfer > 1) {
    // stop short of the corner, cut across it, then carry on
    if (vertical) {
      ctx.lineTo(corner.x, corner.y - Math.sign(dy) * chamfer);
      ctx.lineTo(corner.x + Math.sign(dx) * chamfer, corner.y);
    } else {
      ctx.lineTo(corner.x - Math.sign(dx) * chamfer, corner.y);
      ctx.lineTo(corner.x, corner.y + Math.sign(dy) * chamfer);
    }
  } else {
    ctx.lineTo(corner.x, corner.y);
  }
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = rgba(skin.rim, 0.45 + emphasis * 0.5);
  ctx.lineWidth = Math.max(0.7, unit * 0.011);
  ctx.stroke();

  // the pad it lands on
  ctx.beginPath();
  ctx.arc(to.x, to.y, Math.max(1.3, unit * 0.02), 0, TAU);
  ctx.fillStyle = rgba(skin.glow, clamp((0.7 + emphasis * 0.3) * skin.strength, 0, 1));
  ctx.fill();
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
  /** −1 … 1: where the aperture is looking, 0 dead ahead */
  lookX: number;
}

/**
 * The mantle. Flat and still: a solid dome over a solid skirt, one
 * aperture band with a lit bar that tracks whatever you point at, and
 * a collar carrying the bus line every arm leaves from. No breathing,
 * no twinkle — the only thing that moves on this animal is a packet.
 */
export function drawMantle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  unit: number,
  skin: Skin,
  { lookX }: MantleOpts,
): void {
  const R = unit;
  const hair = Math.max(0.8, R * 0.016);

  ctx.save();
  ctx.translate(cx, cy);

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

  // chromatophore freckles — flat discs, fixed sizes
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = rgba(skin.flare, 1);
  for (let i = 0; i < 18; i++) {
    const a = (i * 2.39996) % TAU;
    const rr = Math.sqrt((i + 0.5) / 18) * R * 0.76;
    const s = R * (0.018 + ((i * 7) % 4) * 0.006);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 1.1 - R * 0.62, s, 0, TAU);
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
