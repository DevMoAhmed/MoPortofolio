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

   Every arm ends on a branch label: the eight tips sit on two
   columns, and each label is placed at the tip that holds it, so
   the contact is real rather than implied. Because the labels are
   positioned from the pose, moving a tip in the poser moves its
   label here — the layout follows the animal, not the other way
   round.
   ============================================================ */

import { clamp, readSkin } from './palette';
import { type Sample, chainSamples, drawLimb, drawMantle, drawPacket } from './rig';
import { pose, poseExtent } from '../data/pose';

interface Limb {
  /** the resting chain, already scaled and placed in canvas space */
  placed: { x: number; y: number }[];
  /** the sampled centreline actually drawn */
  pts: Sample[];
  /** 0 resting → 1 hovered or focused */
  emphasis: number;
  wanted: number;
  /** the emphasis the current pts were built at, so we only resample on change */
  built: number;
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
  /** breathing room above the animal, and below the lowest label */
  const PAD_TOP = 24;
  /** where the aperture is looking, and where it wants to look */
  let lookNow = pose.apOff;
  let lookWant = pose.apOff;

  // Which label each arm holds. The right-hand arms are the mirror of the
  // left, so their tips run bottom-to-top in arm order; handing them the
  // branches in reverse makes the numbering read downward on both sides
  // (01-04 down the left, 05-08 down the right) without moving an arm.
  const labelFor = (i: number) => {
    const n = pose.arms.length;
    return i < n / 2 ? i : n - 1 - i + n / 2;
  };

  const limbs: Limb[] = pose.arms.map((_, i) => ({
    placed: [],
    pts: [],
    emphasis: 0,
    wanted: 0,
    built: -1,
    el: branches[labelFor(i)] ?? null,
  }));

  /** below this the labels stack under the animal; CSS owns that case.
      Measured on the section, not the window: it is the section that has to
      fit an animal plus two columns of type. */
  const WIDE = 54 * 16;
  /** the gap between an arm's tip and the label it holds */
  const REACH = 14;
  /** the minimum air between two labels in a column */
  const STACK_GAP = 20;
  /** how much of the room the animal takes; the rest goes to the type */
  const BODY_SHARE = 0.8;
  /** air outside a label, between it and the edge of the section */
  const OUTER_PAD = 8;

  /** the chains actually drawn — the pose, with tips pulled onto their labels */
  const chains: { x: number; y: number }[][] = pose.arms.map((a) => a.map((p) => ({ ...p })));

  function measure() {
    const wide = root.clientWidth >= WIDE;
    root.classList.toggle('crown--hung', wide);
    const ext = poseExtent(pose);
    const poseW = ext.x1 - ext.x0;
    const poseH = ext.y1 - ext.y0;
    let scale: number;

    // start from the approved pose every time, so repeated measures cannot
    // walk the tips somewhere they were never asked to go
    for (let i = 0; i < chains.length; i++) {
      for (let k = 0; k < chains[i]!.length; k++) {
        chains[i]![k] = { ...pose.arms[i]![k]! };
      }
    }

    if (wide) {
      // The label columns are the fixed quantity: eight boxes of real text
      // cannot be squeezed to sit exactly on eight tips, so the text is laid
      // out first and each arm is then bent to reach the label it holds. The
      // animal follows the copy, which is the way round this section wants.
      //
      // The two columns share one set of row positions. Stacking each side
      // on its own label heights is what made the animal look lopsided: the
      // left copy is longer than the right, so the tips ended up at
      // different heights and the arms stopped being mirror images.
      const availH = Math.min(window.innerHeight * 0.9, 820);
      const firstGuess = clamp(root.clientWidth * 0.26, 210, 360);
      scale =
        Math.min((root.clientWidth - 2 * (firstGuess + REACH)) / poseW, availH / poseH) *
        BODY_SHARE;

      // the animal is smaller than the space it was offered, so hand the
      // slack back to the type rather than leaving it as margin
      const tipXpx = Math.abs(pose.arms[0]![pose.arms[0]!.length - 1]!.x) * scale;
      const labelW = clamp(root.clientWidth / 2 - tipXpx - REACH - OUTER_PAD, 210, 460);

      const heights: number[] = [];
      for (let i = 0; i < limbs.length; i++) {
        const el = limbs[i]!.el;
        if (!el) {
          heights.push(0);
          continue;
        }
        el.style.position = 'absolute';
        el.style.width = `${Math.round(labelW)}px`;
        el.style.top = '0px';
        heights.push(el.offsetHeight);
      }

      // one column per side, ordered by where the tips actually sit
      const leftIdx: number[] = [];
      const rightIdx: number[] = [];
      for (let i = 0; i < limbs.length; i++) {
        const tip = pose.arms[i]![pose.arms[i]!.length - 1]!;
        (tip.x < 0 ? leftIdx : rightIdx).push(i);
      }
      const sortByPoseY = (a: number, b: number) => {
        const ay = pose.arms[a]![pose.arms[a]!.length - 1]!.y;
        const by = pose.arms[b]![pose.arms[b]!.length - 1]!.y;
        return ay - by;
      };
      leftIdx.sort(sortByPoseY);
      rightIdx.sort(sortByPoseY);

      // shared rows: a row is as tall as the taller of its two labels, so
      // both sides land on identical y positions and the pose stays mirrored
      const rows = Math.max(leftIdx.length, rightIdx.length);
      const rowH: number[] = [];
      for (let k = 0; k < rows; k++) {
        const l = leftIdx[k] === undefined ? 0 : heights[leftIdx[k]!]!;
        const r = rightIdx[k] === undefined ? 0 : heights[rightIdx[k]!]!;
        rowH.push(Math.max(l, r));
      }
      let stackH = 0;
      for (let k = 0; k < rows; k++) stackH += rowH[k]! + (k ? STACK_GAP : 0);

      const bodyH = poseH * scale;
      const contentH = Math.max(stackH, bodyH);

      cx = root.clientWidth / 2;
      cy = PAD_TOP + (contentH - bodyH) / 2 + -ext.y0 * scale;

      const rowTop: number[] = [];
      let y = PAD_TOP + (contentH - stackH) / 2;
      for (let k = 0; k < rows; k++) {
        rowTop.push(y);
        y += rowH[k]! + STACK_GAP;
      }

      const place = (idx: number[]) => {
        for (let k = 0; k < idx.length; k++) {
          const i = idx[k]!;
          const el = limbs[i]!.el;
          const h = heights[i]!;
          const tip = pose.arms[i]![pose.arms[i]!.length - 1]!;
          const px = cx + tip.x * scale;
          // centre the label in its row, so the tip meets its middle
          const top = rowTop[k]! + (rowH[k]! - h) / 2;
          if (el) {
            if (tip.x < 0) {
              el.style.left = 'auto';
              el.style.right = `${Math.round(root.clientWidth - px + REACH)}px`;
            } else {
              el.style.right = 'auto';
              el.style.left = `${Math.round(px + REACH)}px`;
            }
            el.style.top = `${Math.round(top)}px`;
          }
          // bend the arm so its tip lands on the middle of this row
          const wantY = (rowTop[k]! + rowH[k]! / 2 - cy) / scale;
          const chain = chains[i]!;
          const last = chain.length - 1;
          const dy = wantY - chain[last]!.y;
          chain[last] = { x: chain[last]!.x, y: wantY };
          if (last >= 1) {
            chain[last - 1] = { x: chain[last - 1]!.x, y: chain[last - 1]!.y + dy * 0.45 };
          }
        }
      };
      place(leftIdx);
      place(rightIdx);

      const wantH = `${Math.round(contentH + PAD_TOP * 2)}px`;
      if (root.style.height !== wantH) root.style.height = wantH;
    } else {
      // narrow: the animal is a band, the labels flow underneath it
      for (const limb of limbs) {
        const el = limb.el;
        if (!el) continue;
        el.style.position = '';
        el.style.width = '';
        el.style.left = '';
        el.style.right = '';
        el.style.top = '';
      }
      root.style.height = '';
      const box = stage.getBoundingClientRect();
      scale = Math.min(box.width / poseW, box.height / poseH);
      const base = root.getBoundingClientRect();
      cx = box.left - base.left + box.width / 2 - ((ext.x0 + ext.x1) / 2) * scale;
      cy = box.top - base.top + box.height / 2 - ((ext.y0 + ext.y1) / 2) * scale;
    }

    unit = 100 * scale;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = root.clientWidth;
    h = root.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (let i = 0; i < limbs.length; i++) {
      limbs[i]!.placed = chains[i]!.map((a) => ({ x: cx + a.x * scale, y: cy + a.y * scale }));
      limbs[i]!.built = -1;
    }
    for (const limb of limbs) rebuild(limb);
  }

  /**
   * The reach: on hover an arm straightens and extends a little toward the
   * label it holds, strongest at the tip and fading to nothing at the mantle.
   * It is a shape change, not a wobble — the arm holds the new shape for as
   * long as you are on the branch, and eases back when you leave.
   */
  function rebuild(limb: Limb): void {
    const src = limb.placed;
    if (src.length < 2) return;
    const e = limb.emphasis;
    limb.built = e;
    if (e < 0.002) {
      limb.pts = chainSamples(src, pose.tension);
      return;
    }
    const flexed = src.map((p, k) => {
      if (k === 0) return { x: p.x, y: p.y };
      const prev = src[k - 1]!;
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const L = Math.hypot(dx, dy) || 1;
      // outer anchors move most: the arm reaches rather than flaps
      const grip = Math.pow(k / (src.length - 1), 1.6) * e * unit * 0.13;
      return { x: p.x + (dx / L) * grip, y: p.y + (dy / L) * grip };
    });
    limb.pts = chainSamples(flexed, pose.tension);
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
    drawMantle(ctx, 0, 0, unit, skin, { lookX: lookNow });
    ctx.restore();
  }

  let raf = 0;
  let onScreen = true;
  let last = performance.now();
  /** when the loop last painted; used to spot a throttled tab */
  let lastFrameAt = 0;

  /**
   * Easing needs frames, and a backgrounded tab or a hidden preview pane
   * stops issuing them. When that happens, land on the target value and
   * paint once, so the aperture and the reach still respond instead of
   * silently doing nothing.
   */
  function nudge(): void {
    if (performance.now() - lastFrameAt < 300) return;
    lookNow = lookWant;
    for (const limb of limbs) {
      limb.emphasis = limb.wanted;
      rebuild(limb);
    }
    still();
  }

  function frame(now: number) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    // the shape only changes where a branch is being held; everything else
    // is paint and packets
    for (const limb of limbs) {
      limb.emphasis += (limb.wanted - limb.emphasis) * clamp(dt * 5, 0, 1);
      if (Math.abs(limb.emphasis - limb.built) > 0.004) rebuild(limb);
    }
    lookNow += (lookWant - lookNow) * clamp(dt * 6, 0, 1);
    lastFrameAt = now;
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

  // Re-fit on any size change, synchronously.
  //
  // Deferring this into requestAnimationFrame looks tidier and is wrong: a
  // backgrounded tab or a hidden preview pane stops issuing frames, so the
  // relayout never lands and the section stays frozen at whatever width it
  // was first measured at. measure() costs about a millisecond, so it runs
  // on the spot, with a short guard so a burst of notifications collapses
  // into one pass.
  let lastFit = -1;
  const relayout = () => {
    const now = performance.now();
    if (now - lastFit < 16) return;
    lastFit = now;
    measure();
    still();
    restart();
  };
  const ro = new ResizeObserver(relayout);
  ro.observe(root);
  if (root.parentElement) ro.observe(root.parentElement);
  window.addEventListener('resize', relayout);

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

  // The aperture follows the pointer across the section, and snaps its
  // attention to whichever branch you are actually on.
  root.addEventListener('pointermove', (e) => {
    if (reduced) return;
    const r = root.getBoundingClientRect();
    lookWant = clamp((e.clientX - r.left - cx) / (unit * 2.4), -1, 1);
    nudge();
  });
  root.addEventListener('pointerleave', () => {
    lookWant = pose.apOff;
    nudge();
  });

  for (const limb of limbs) {
    const el = limb.el;
    if (!el) continue;
    const on = () => {
      for (const l of limbs) l.wanted = 0;
      limb.wanted = 1;
      el.classList.add('is-held');
      const tip = limb.placed[limb.placed.length - 1];
      if (tip) lookWant = clamp((tip.x - cx) / (unit * 2.4), -1, 1);
      if (reduced) still();
      else nudge();
    };
    const off = () => {
      limb.wanted = 0;
      el.classList.remove('is-held');
      lookWant = pose.apOff;
      if (reduced) still();
      else nudge();
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
