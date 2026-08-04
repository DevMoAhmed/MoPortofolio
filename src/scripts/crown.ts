/* ============================================================
   crown.ts — the animal in the Arms section
   ------------------------------------------------------------
   This draws ONE approved pose, authored in
   tools/octopus-poser.html and stored in src/data/pose.ts. It is
   not solved, aimed or animated: the anchor chains are fixed, so
   the silhouette is identical on every load and nothing can
   shiver. The only thing that moves is a packet.

   The pose is authored in mantle units (R = 100) and scaled to
   fill whatever box the layout hands it, so it renders at full
   size in a wide window without a coordinate changing here.

   Hovering a branch still lights its arm — branch n holds arm n,
   by index rather than by a drawn contact.
   ============================================================ */

import { clamp, readSkin } from './palette';
import { type Sample, chainSamples, drawLimb, drawMantle, drawPacket } from './rig';
import { pose, poseExtent } from '../data/pose';

interface Limb {
  /** the pose chain, already scaled and placed in canvas space */
  pts: Sample[];
  /** 0 resting → 1 hovered or focused */
  emphasis: number;
  wanted: number;
  el: HTMLElement | null;
}

export function mountCrown(root: HTMLElement): void {
  const maybeCanvas = root.querySelector<HTMLCanvasElement>('canvas');
  const maybeStage = root.querySelector<HTMLElement>('.crown__hub');
  if (!maybeCanvas || !maybeStage) return;
  const maybeCtx = maybeCanvas.getContext('2d');
  if (!maybeCtx) return;

  const canvas: HTMLCanvasElement = maybeCanvas;
  const stage: HTMLElement = maybeStage;
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const branches = Array.from(root.querySelectorAll<HTMLElement>('.branch'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let skin = readSkin();
  let w = 0;
  let h = 0;
  /** the mantle radius in canvas pixels — every dimension derives from it */
  let unit = 100;
  let cx = 0;
  let cy = 0;

  const limbs: Limb[] = pose.arms.map((_, i) => ({
    pts: [],
    emphasis: 0,
    wanted: 0,
    el: branches[i] ?? null,
  }));

  function measure() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = root.clientWidth;
    h = root.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // fit the pose into the stage box, then centre it there
    const base = root.getBoundingClientRect();
    const box = stage.getBoundingClientRect();
    const ext = poseExtent(pose);
    const scale = Math.min(
      box.width / (ext.x1 - ext.x0),
      box.height / (ext.y1 - ext.y0),
    );
    unit = 100 * scale;
    cx = box.left - base.left + box.width / 2 - ((ext.x0 + ext.x1) / 2) * scale;
    cy = box.top - base.top + box.height / 2 - ((ext.y0 + ext.y1) / 2) * scale;

    for (let i = 0; i < limbs.length; i++) {
      const chain = pose.arms[i]!.map((a) => ({
        x: cx + a.x * scale,
        y: cy + a.y * scale,
      }));
      limbs[i]!.pts = chainSamples(chain, pose.tension);
    }
  }

  const widthAt = (t: number) => {
    const girth = unit * 0.17 * pose.girth;
    return 1.2 + (girth - 1.2) * Math.pow(1 - t, pose.taper);
  };

  function compose(now: number) {
    ctx.clearRect(0, 0, w, h);

    // resting arms first, the emphasised one on top
    const order = [...limbs].sort((a, b) => a.emphasis - b.emphasis);
    for (const limb of order) {
      if (!limb.pts.length) continue;
      drawLimb(ctx, limb.pts, widthAt, skin, unit, limb.emphasis, {
        plates: pose.plates,
        gap: pose.gap,
        joint: pose.joint,
        hair: Math.max(0.8, pose.hair * (unit / 100)),
      });
    }

    // a packet on every arm, staggered so they do not march in step
    if (!reduced && pose.packets) {
      for (let i = 0; i < limbs.length; i++) {
        const limb = limbs[i]!;
        if (!limb.pts.length) continue;
        const u = (now / 1000 / pose.packetSeconds + i * 0.37) % 1;
        drawPacket(ctx, limb.pts, u, skin, unit * pose.packetSize);
      }
    }

    // the mantle's own proportions come from the pose too, so the shape the
    // poser showed is the shape that ships
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pose.mw, pose.mh);
    drawMantle(ctx, 0, 0, unit, skin, { lookX: pose.apOff });
    ctx.restore();
  }

  let raf = 0;
  let onScreen = true;
  let last = performance.now();

  function frame(now: number) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    // geometry is fixed; only the hover weighting and the packets move
    for (const limb of limbs) {
      limb.emphasis += (limb.wanted - limb.emphasis) * clamp(dt * 5, 0, 1);
    }
    compose(now);
    if (onScreen && !reduced) raf = requestAnimationFrame(frame);
  }
  function still() {
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
    { rootMargin: '160px' },
  );
  io.observe(root);

  new MutationObserver(() => {
    skin = readSkin();
    still();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-skin'],
  });

  for (const limb of limbs) {
    const el = limb.el;
    if (!el) continue;
    const on = () => {
      for (const l of limbs) l.wanted = 0;
      limb.wanted = 1;
      el.classList.add('is-held');
      if (reduced) still();
    };
    const off = () => {
      limb.wanted = 0;
      el.classList.remove('is-held');
      if (reduced) still();
    };
    el.addEventListener('pointerenter', on);
    el.addEventListener('focusin', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('focusout', off);
  }

  measure();
  still();
  // fonts change the box, which changes the fit
  document.fonts?.ready.then(() => {
    measure();
    still();
    restart();
  });
  restart();
}
