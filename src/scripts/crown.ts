/* ============================================================
   crown.ts — the page IS the animal
   ------------------------------------------------------------
   Not a creature swimming behind the content. A mantle anchored
   in the middle of the section, with one tentacle per branch of
   what I do, each arm physically reaching the label it belongs
   to. Arm targets are read from the DOM, so CSS owns the layout
   and the canvas only draws the connective tissue.

   Flat 2D throughout — the drawing language lives in rig.ts.
   Hovering or focusing a branch tightens that arm and slides the
   aperture toward it. Nothing drifts; nothing swims.
   ============================================================ */

import {
  type Skin,
  type Vec,
  TAU,
  clamp,
  lerp,
  smoothstep,
  lerpAngle,
  readSkin,
} from './palette';
import { type Sample, drawClamp, drawLimb, drawMantle, drawPacket } from './rig';

const SEGMENTS = 26;
/** arms carrying a packet; not all eight, or it reads as a chase light */
const HOT = [0, 2, 3, 5, 7];

/* ---------------------------------------------------------------
   one arm, permanently attached to one branch
   --------------------------------------------------------------- */
class Arm {
  el: HTMLElement;
  anchor: HTMLElement;
  root: Vec = { x: 0, y: 0 };
  target: Vec = { x: 0, y: 0 };
  angles: number[] = [];
  pos: Vec[] = [];
  phase: number;
  sway: number;
  /** 0 resting → 1 hovered/focused */
  emphasis = 0;
  wanted = 0;
  reachLen = 200;
  baseAngle = 0;
  /** the direction this arm leaves the crown in — set by layout so the
      eight arms fan across a wide arc instead of hanging in a bundle */
  fan = Math.PI / 2;
  /** half-width at the crown; narrower when the arms share a tight lane */
  girth = 12;

  constructor(el: HTMLElement, anchor: HTMLElement, index: number) {
    this.el = el;
    this.anchor = anchor;
    this.phase = index * 0.83 + (index % 3) * 0.51;
    this.sway = 0.72 + ((index * 31) % 9) / 22;
    for (let i = 0; i < SEGMENTS; i++) {
      this.angles.push(0);
      this.pos.push({ x: 0, y: 0 });
    }
  }

  update(t: number, dt: number, unit: number) {
    this.emphasis += (this.wanted - this.emphasis) * clamp(dt * 5, 0, 1);

    const dx = this.target.x - this.root.x;
    const dy = this.target.y - this.root.y;
    this.baseAngle = Math.atan2(dy, dx);

    // Every arm is routed through a via point that is most of the way
    // out sideways but only a third of the way down. That is what makes
    // the eight arms separate immediately instead of hanging in one
    // bundle and only splaying at the tips.
    const viaX = this.root.x + dx * 0.8;
    const viaY = this.root.y + dy * 0.32;

    const legA = Math.hypot(viaX - this.root.x, viaY - this.root.y);
    const legB = Math.hypot(this.target.x - viaX, this.target.y - viaY);
    const dist = Math.hypot(dx, dy) || 1;
    // the smooth chain cuts the via corner, so the real arc sits between
    // the straight line and the two legs. Overshoot here and the tip
    // folds back on itself.
    this.reachLen = lerp(dist, legA + legB, 0.78) * (1 - this.emphasis * 0.03);
    const segLen = this.reachLen / SEGMENTS;

    let px = this.root.x;
    let py = this.root.y;

    for (let i = 0; i < SEGMENTS; i++) {
      const k = i / (SEGMENTS - 1);
      const breathe =
        Math.sin(t * this.sway + this.phase - k * 2.6) *
        (0.014 + k * 0.06) *
        (1 - this.emphasis * 0.5);

      // the aim point slides from the via to the label as we travel out
      const handover = smoothstep(0.3, 0.74, k);
      const aimX = lerp(viaX, this.target.x, handover);
      const aimY = lerp(viaY, this.target.y, handover);

      const prev = this.pos[i]!;
      const toAim = Math.atan2(aimY - prev.y, aimX - prev.x);
      // leaves the crown along its fan direction, then hands over
      const commit = smoothstep(0, 0.3, k) * (0.86 + this.emphasis * 0.12);
      const want = lerpAngle(this.fan + breathe, toAim, commit);

      this.angles[i] = lerpAngle(this.angles[i]!, want, clamp(dt * 7, 0, 1));

      // joint limit — a tentacle bends, it does not hinge. Without this
      // an arm with any slack folds back and renders as a spike.
      if (i > 0) {
        const prevA = this.angles[i - 1]!;
        let d = ((this.angles[i]! - prevA + Math.PI) % TAU) - Math.PI;
        if (d < -Math.PI) d += TAU;
        const LIMIT = 0.4;
        if (d > LIMIT) this.angles[i] = prevA + LIMIT;
        else if (d < -LIMIT) this.angles[i] = prevA - LIMIT;
      }

      const len = segLen * (1.2 - k * 0.44);
      px += Math.cos(this.angles[i]!) * len;
      py += Math.sin(this.angles[i]!) * len;
      this.pos[i]!.x = px;
      this.pos[i]!.y = py;
    }
    void unit;
  }

  /** the chain, resampled with normals for the shared rig drawing */
  private samples(): Sample[] {
    const out: Sample[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      // The chain settles a few pixels short of its label. Pull the last
      // stretch onto the target so the clamp actually touches what it is
      // holding — spread over the final segments, or the tip kinks.
      const k = i / (SEGMENTS - 1);
      const pull = smoothstep(0.72, 1, k);
      const p = this.pos[i]!;
      const prev = i === 0 ? this.root : this.pos[i - 1]!;
      const x = lerp(p.x, this.target.x, pull * (k === 1 ? 1 : pull));
      const y = lerp(p.y, this.target.y, pull * (k === 1 ? 1 : pull));
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const l = Math.hypot(dx, dy) || 1;
      out.push({ x, y, nx: -dy / l, ny: dx / l, t: k });
    }
    return out;
  }

  draw(ctx: CanvasRenderingContext2D, unit: number, skin: Skin) {
    const pts = this.samples();
    const base = this.girth * (1 + this.emphasis * 0.16);
    drawLimb(ctx, pts, (t) => base * Math.pow(1 - t, 1.5) + unit * 0.02, skin, unit, this.emphasis);
    this.cache = pts;

    // the clamp lands on the branch — square it to the arm's last segment
    // so the contact reads as fitted, not dropped on
    const tip = pts[SEGMENTS - 1]!;
    const prev = pts[SEGMENTS - 2] ?? tip;
    drawClamp(
      ctx,
      tip.x,
      tip.y,
      Math.atan2(tip.y - prev.y, tip.x - prev.x),
      unit,
      skin,
      this.emphasis,
    );
  }

  /** last drawn centreline, reused by the packet pass */
  cache: Sample[] = [];
}

/* ---------------------------------------------------------------
   mount
   --------------------------------------------------------------- */
export function mountCrown(root: HTMLElement): void {
  const maybeCanvas = root.querySelector<HTMLCanvasElement>('canvas');
  const maybeHub = root.querySelector<HTMLElement>('.crown__hub');
  const branches = Array.from(root.querySelectorAll<HTMLElement>('.branch'));
  if (!maybeCanvas || !maybeHub || !branches.length) return;

  const maybeCtx = maybeCanvas.getContext('2d');
  if (!maybeCtx) return;

  // explicit annotations so the narrowing survives into the hoisted
  // function declarations below
  const canvas: HTMLCanvasElement = maybeCanvas;
  const hub: HTMLElement = maybeHub;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let skin = readSkin();

  const arms: Arm[] = [];
  for (const [i, el] of branches.entries()) {
    const anchor = el.querySelector<HTMLElement>('.branch__anchor');
    if (anchor) arms.push(new Arm(el, anchor, i));
  }

  let w = 0;
  let h = 0;
  let unit = 70;
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
    // the mantle silhouette spans -1.50u … +0.98u vertically and
    // ±0.92u horizontally, so size it to sit inside the hub box
    unit = clamp(Math.min(hr.height * 0.4, hr.width * 0.52), 40, 116);
    const narrow = w < 900;
    hubPt.x = hr.left - base.left + hr.width / 2;
    // Two-column layout: the hub box spans every row, so the mantle hangs
    // level with the middle of the branch stack and the arms radiate up
    // and down out of the skirt. Single column: the box is one row at the
    // top, so seat the mantle inside it as before.
    hubPt.y = narrow
      ? hr.top - base.top + unit * 1.52
      : hr.top - base.top + hr.height / 2;

    for (const arm of arms) {
      const ar = arm.anchor.getBoundingClientRect();
      arm.target.x = ar.left - base.left + ar.width / 2;
      arm.target.y = ar.top - base.top + ar.height / 2;
    }

    // Order the roots along the crown by where their branch sits, so no
    // two arms cross. The key is the angle measured clockwise from
    // straight UP: -π at down-left, 0 overhead, +π at down-right. Measured
    // from straight down instead, targets above the mantle land either side
    // of the ±π wrap and the sort scrambles them.
    const phi = (t: Vec) => Math.atan2(t.x - hubPt.x, -(t.y - hubPt.y));
    // back to a world angle (0 = +x, y down) for the chain to launch along
    const world = (p: number) => Math.atan2(-Math.cos(p), Math.sin(p));

    const order = arms
      .map((arm, i) => ({ i, key: phi(arm.target) }))
      .sort((a, b) => a.key - b.key);

    // The launch arc is derived from where the branches actually are,
    // not hardcoded — otherwise the single-column mobile layout sends
    // half the arms sweeping across the text before they turn back.
    const keys = order.map((o) => o.key);
    const PAD = 0.5;
    // Single-column layout puts every branch down the left, so the arc is
    // pinned down-and-left (−169° … −102° from overhead). Any rightward
    // launch angle would send an arm sweeping across the text before it
    // turned back.
    const lo = narrow ? -2.95 : Math.min(...keys) - PAD;
    const hi = narrow ? -1.78 : Math.max(...keys) + PAD;

    const n = Math.max(1, order.length - 1);
    order.forEach((o, slot) => {
      const t = order.length === 1 ? 0.5 : slot / n;
      const spread = t - 0.5;
      const arm = arms[o.i]!;
      arm.fan = world(lerp(lo, hi, t));
      arm.girth = unit * (narrow ? 0.115 : 0.175);
      // An arm that has to reach a branch above the mantle should not
      // start under the skirt and climb past the face — it comes out of
      // the mantle's side instead, and the body (drawn last) hides the
      // join. 0 for a downward arm, 1 for one launching straight up.
      const rising = clamp(-Math.sin(arm.fan), 0, 1);
      const side = Math.sign(spread) || 1;
      arm.root.x =
        hubPt.x + spread * unit * (narrow ? 0.9 : 1.34) + side * rising * unit * 0.18;
      arm.root.y =
        hubPt.y +
        unit * (0.72 - rising * 0.95) -
        Math.abs(spread) * unit * 0.2 * (1 - rising);
      // seed the chain along the fan so the first frame is already a
      // plausible pose rather than a straight spike
      for (let s = 0; s < SEGMENTS; s++) {
        arm.pos[s]!.x = arm.root.x;
        arm.pos[s]!.y = arm.root.y;
        arm.angles[s] = arm.fan;
      }
    });
  }

  /** the aperture tracks whichever branch has hold of an arm */
  function lookX(): number {
    if (!look) return 0;
    return clamp((look.x - hubPt.x) / (unit * 2.4), -1, 1);
  }

  function compose(now: number) {
    ctx.clearRect(0, 0, w, h);
    // resting arms first, the emphasised one on top
    const sorted = [...arms].sort((a, b) => a.emphasis - b.emphasis);
    for (const arm of sorted) arm.draw(ctx, unit, skin);
    if (!reduced) {
      HOT.forEach((i, slot) => {
        const arm = arms[i % arms.length];
        if (!arm?.cache.length) return;
        drawPacket(ctx, arm.cache, (now / 3400 + slot * 0.19) % 1, skin, unit);
      });
    }
    drawMantle(ctx, hubPt.x, hubPt.y, unit, skin, {
      t: clock,
      reduced,
      lookX: lookX(),
    });
  }

  let raf = 0;
  let last = performance.now();
  let clock = reduced ? 1.6 : 0;
  let onScreen = true;

  function frame(now: number) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    clock += dt;

    for (const arm of arms) arm.update(clock, dt, unit);
    compose(now);

    if (onScreen && !reduced) raf = requestAnimationFrame(frame);
  }

  function still() {
    // settle the chains, then draw one composed pose
    for (let s = 0; s < 90; s++) {
      for (const arm of arms) arm.update(clock, 1 / 60, unit);
    }
    compose(0);
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
    // settle and paint immediately, so a reflow never leaves the section
    // holding a stale pose (or an empty canvas) until the next frame
    still();
    restart();
  });
  ro.observe(root);

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        onScreen = e.isIntersecting;
        if (onScreen) {
          // paint the pose on the way in rather than one frame later
          still();
          restart();
        } else cancelAnimationFrame(raf);
      }
    },
    { rootMargin: '160px' },
  );
  io.observe(root);

  new MutationObserver(() => {
    skin = readSkin();
    // repaint in step with the CSS skin transition, not a frame behind it
    still();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-skin'],
  });

  for (const arm of arms) {
    const on = () => {
      for (const a of arms) a.wanted = 0;
      arm.wanted = 1;
      look = arm.target;
      arm.el.classList.add('is-held');
      if (reduced) still();
    };
    const off = () => {
      arm.wanted = 0;
      look = null;
      arm.el.classList.remove('is-held');
      if (reduced) still();
    };
    arm.el.addEventListener('pointerenter', on);
    arm.el.addEventListener('focusin', on);
    arm.el.addEventListener('pointerleave', off);
    arm.el.addEventListener('focusout', off);
  }

  measure();
  // one settled pose on mount, before the loop takes over
  still();
  // fonts change the label boxes, which move every arm target
  document.fonts?.ready.then(() => {
    measure();
    still();
    restart();
  });
  restart();
}
