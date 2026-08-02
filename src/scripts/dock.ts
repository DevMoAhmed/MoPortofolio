/* ============================================================
   dock.ts — the rig at 0 m
   ------------------------------------------------------------
   The Arms crown is the animal seen whole: long arms, eyes, a
   creature. This is the same animal seen as instrumentation —
   mantle pulled down close, arms cut to a short drop, and each
   arm clamped into a port that is a real link to a section.

   Compact on purpose. The reference pose hung the head at the
   top of the viewport and dropped two hundred pixels of empty
   water before anything happened; here the drop is about forty
   and the space that used to be empty holds the hero copy.

   Ports are read from the DOM, so CSS owns the layout and the
   canvas only draws the connective tissue — same contract as
   crown.ts. Reflow the ports (they wrap on narrow screens) and
   the arms re-aim on the next frame.
   ============================================================ */

import { type Skin, type Vec, clamp, rgba, readSkin } from './palette';
import { type Sample, drawLimb, drawMantle, drawPacket } from './rig';

/** samples per arm — enough for a smooth taper, cheap enough for 8 */
const STEPS = 34;
/** lanes that carry a packet; not all eight at once, or it reads as a chase */
const HOT = [0, 2, 3, 5, 7];

function bez(p0: Vec, c0: Vec, c1: Vec, p1: Vec, t: number): Vec {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y,
  };
}

function dbez(p0: Vec, c0: Vec, c1: Vec, p1: Vec, t: number): Vec {
  const u = 1 - t;
  return {
    x: 3 * u * u * (c0.x - p0.x) + 6 * u * t * (c1.x - c0.x) + 3 * t * t * (p1.x - c1.x),
    y: 3 * u * u * (c0.y - p0.y) + 6 * u * t * (c1.y - c0.y) + 3 * t * t * (p1.y - c1.y),
  };
}

/* ---------------------------------------------------------------
   one arm: mantle rim → port, in two cubics with a short bow
   --------------------------------------------------------------- */
class Limb {
  port: HTMLElement;
  root: Vec = { x: 0, y: 0 };
  target: Vec = { x: 0, y: 0 };
  dir = 1;
  bow = 14;
  girth = 9;
  path: Sample[] = [];
  emphasis = 0;
  wanted = 0;
  /** deterministic jitter so eight arms are not eight copies */
  jitter: number;

  constructor(port: HTMLElement, index: number) {
    this.port = port;
    this.jitter = ((index * 37) % 11) / 11;
  }

  shape() {
    const tighten = 1 - this.emphasis * 0.34;
    const bow = this.bow * tighten;
    const dx = this.target.x - this.root.x;
    const dy = this.target.y - this.root.y;
    const midY = this.root.y + dy * (0.5 + this.jitter * 0.08);
    const midX = this.root.x + dx * (0.62 + this.jitter * 0.1) + this.dir * bow;

    const A: [Vec, Vec, Vec, Vec] = [
      this.root,
      { x: this.root.x + this.dir * bow * 0.34, y: this.root.y + (midY - this.root.y) * 0.44 },
      { x: midX + this.dir * bow * 0.5, y: midY - (midY - this.root.y) * 0.3 },
      { x: midX, y: midY },
    ];
    const B: [Vec, Vec, Vec, Vec] = [
      A[3],
      { x: midX + (this.target.x - midX) * 0.62, y: midY + (this.target.y - midY) * 0.28 },
      { x: this.target.x + this.dir * 1.5, y: midY + (this.target.y - midY) * 0.76 },
      this.target,
    ];

    this.path.length = 0;
    for (let i = 0; i <= STEPS; i++) {
      const u = i / STEPS;
      const seg = u < 0.5 ? A : B;
      const lt = u < 0.5 ? u * 2 : (u - 0.5) * 2;
      const p = bez(seg[0], seg[1], seg[2], seg[3], lt);
      const d = dbez(seg[0], seg[1], seg[2], seg[3], lt);
      const l = Math.hypot(d.x, d.y) || 1;
      this.path.push({ x: p.x, y: p.y, nx: -d.y / l, ny: d.x / l, t: u });
    }
  }

  private width(t: number) {
    return 1.4 + (this.girth * (1 + this.emphasis * 0.14) - 1.4) * Math.pow(1 - t, 0.9);
  }

  draw(ctx: CanvasRenderingContext2D, skin: Skin, unit: number) {
    const pts = this.path;
    if (!pts.length) return;
    drawLimb(ctx, pts, (t) => this.width(t), skin, unit, this.emphasis);
    // the clamp itself is a DOM element here — the port — so the canvas
    // only marks the contact, as a flat disc
    const tip = pts[pts.length - 1]!;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, Math.max(1.6, unit * (0.05 + this.emphasis * 0.02)), 0, Math.PI * 2);
    ctx.fillStyle = rgba(skin.flare, 1);
    ctx.fill();
  }

  /** a packet, running down the inlay toward the port */
  packet(ctx: CanvasRenderingContext2D, skin: Skin, u: number, unit: number) {
    if (this.path.length) drawPacket(ctx, this.path, u, skin, unit);
  }
}

/* ---------------------------------------------------------------
   mount
   --------------------------------------------------------------- */
export function mountDock(root: HTMLElement): void {
  const maybeCanvas = root.querySelector<HTMLCanvasElement>('canvas');
  const maybeHub = root.querySelector<HTMLElement>('.dock__hub');
  const ports = Array.from(root.querySelectorAll<HTMLElement>('.dock__port'));
  if (!maybeCanvas || !maybeHub || !ports.length) return;

  const maybeCtx = maybeCanvas.getContext('2d');
  if (!maybeCtx) return;

  const canvas: HTMLCanvasElement = maybeCanvas;
  const hub: HTMLElement = maybeHub;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let skin = readSkin();

  const limbs = ports.map((p, i) => new Limb(p, i));

  let w = 0;
  let h = 0;
  /** mantle half-width; every dimension in the drawing derives from it */
  let unit = 44;
  const hubPt: Vec = { x: 0, y: 0 };
  let look: Vec | null = null;

  function measure() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = root.clientWidth;
    h = root.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const base = root.getBoundingClientRect();
    const hr = hub.getBoundingClientRect();
    unit = clamp(Math.min(hr.width * 0.46, hr.height * 0.62), 26, 62);
    hubPt.x = hr.left - base.left + hr.width / 2;
    hubPt.y = hr.top - base.top + hr.height * 0.5;

    // ports are clamps: the arm lands on the top edge, not the middle
    for (const limb of limbs) {
      const pr = limb.port.getBoundingClientRect();
      limb.target.x = pr.left - base.left + pr.width / 2;
      limb.target.y = pr.top - base.top;
    }

    // roots spread across the mantle skirt in port order, so no two arms
    // cross — the same sort the crown does, simplified because the ports
    // are already laid out left to right
    const n = Math.max(1, limbs.length - 1);
    limbs.forEach((limb, i) => {
      const spread = limbs.length === 1 ? 0 : i / n - 0.5;
      limb.root.x = hubPt.x + spread * unit * 1.42;
      limb.root.y = hubPt.y + unit * 0.66 - Math.abs(spread) * unit * 0.22;
      limb.dir = Math.sign(limb.target.x - hubPt.x) || (i % 2 ? 1 : -1);
      limb.girth = unit * 0.19;
      limb.bow = unit * 0.3;
    });
  }

  function drawRail() {
    // the bar the clamps bolt onto — drawn under the ports, and only as
    // wide as the ports actually are
    let min = Infinity;
    let max = -Infinity;
    let y = 0;
    const base = root.getBoundingClientRect();
    for (const limb of limbs) {
      const pr = limb.port.getBoundingClientRect();
      min = Math.min(min, pr.left - base.left);
      max = Math.max(max, pr.right - base.left);
      y = Math.max(y, pr.bottom - base.top);
    }
    if (!Number.isFinite(min)) return;
    ctx.beginPath();
    ctx.moveTo(min - unit * 0.2, y + unit * 0.22);
    ctx.lineTo(max + unit * 0.2, y + unit * 0.22);
    ctx.strokeStyle = rgba(skin.rim, 0.5);
    ctx.lineWidth = Math.max(1, unit * 0.03);
    ctx.stroke();

    ctx.strokeStyle = rgba(skin.rim, 0.28);
    ctx.lineWidth = 1;
    for (let x = min; x <= max; x += unit * 0.3) {
      ctx.beginPath();
      ctx.moveTo(x, y + unit * 0.3);
      ctx.lineTo(x, y + unit * 0.44);
      ctx.stroke();
    }

    // prongs: each clamp seated on the rail
    for (const limb of limbs) {
      const pr = limb.port.getBoundingClientRect();
      const cx = pr.left - base.left + pr.width / 2;
      const bottom = pr.bottom - base.top;
      ctx.beginPath();
      ctx.moveTo(cx - pr.width * 0.22, bottom);
      ctx.lineTo(cx - pr.width * 0.22, y + unit * 0.22);
      ctx.moveTo(cx + pr.width * 0.22, bottom);
      ctx.lineTo(cx + pr.width * 0.22, y + unit * 0.22);
      ctx.strokeStyle = rgba(skin.rim, 0.55 + limb.emphasis * 0.35);
      ctx.lineWidth = Math.max(1, unit * 0.026);
      ctx.stroke();
    }
  }

  let raf = 0;
  let last = performance.now();
  let clock = reduced ? 1.4 : 0;
  let onScreen = true;

  function render(dt: number) {
    for (const limb of limbs) {
      limb.emphasis += (limb.wanted - limb.emphasis) * clamp(dt * 5, 0, 1);
      limb.shape();
    }
    ctx.clearRect(0, 0, w, h);
    drawRail();
    const sorted = [...limbs].sort((a, b) => a.emphasis - b.emphasis);
    for (const limb of sorted) limb.draw(ctx, skin, unit);
    if (!reduced) {
      HOT.forEach((i, slot) => {
        const limb = limbs[i % limbs.length];
        if (!limb) return;
        const u = (clock * 0.34 + slot * 0.21) % 1;
        limb.packet(ctx, skin, u, unit);
      });
    }
    drawMantle(ctx, hubPt.x, hubPt.y, unit, skin, {
      lookX: look ? clamp((look.x - hubPt.x) / (w * 0.5 || 1), -1, 1) : 0,
    });
  }

  function frame(now: number) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    clock += dt;
    render(dt);
    if (onScreen && !reduced) raf = requestAnimationFrame(frame);
  }

  function still() {
    render(1 / 60);
  }

  function restart() {
    if (reduced) {
      still();
      return;
    }
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(() => {
    measure();
    still();
    restart();
  });
  ro.observe(root);

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        onScreen = e.isIntersecting;
        if (onScreen) {
          still();
          restart();
        } else cancelAnimationFrame(raf);
      }
    },
    { rootMargin: '120px' },
  );
  io.observe(root);

  new MutationObserver(() => {
    skin = readSkin();
    // repaint immediately rather than on the next frame, so the rig
    // re-tints in step with the CSS transition instead of after it
    still();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-skin'],
  });

  for (const limb of limbs) {
    const on = () => {
      for (const l of limbs) l.wanted = 0;
      limb.wanted = 1;
      look = limb.target;
      limb.port.classList.add('is-held');
      if (reduced) still();
    };
    const off = () => {
      limb.wanted = 0;
      look = null;
      limb.port.classList.remove('is-held');
      if (reduced) still();
    };
    limb.port.addEventListener('pointerenter', on);
    limb.port.addEventListener('focusin', on);
    limb.port.addEventListener('pointerleave', off);
    limb.port.addEventListener('focusout', off);
  }

  measure();
  // draw one pose synchronously so the rig is there on first paint
  // instead of one frame later — and so it survives a tab that is not
  // compositing yet
  still();
  // port labels are mono digits; the font swap moves the boxes
  document.fonts?.ready.then(() => {
    measure();
    still();
    restart();
  });
  restart();
}
