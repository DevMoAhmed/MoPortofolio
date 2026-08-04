/* ============================================================
   pose.ts — the approved pose, exported from the poser
   ------------------------------------------------------------
   Authored in tools/octopus-poser.html and pasted here verbatim
   (minus the editor's own keys: skin, handles, addMode, preset).
   Coordinates are in mantle units where the mantle radius R is
   100, origin at the mantle centre, y down. crown.ts scales the
   whole thing to whatever box it is given, so the numbers here
   never need touching to fit a layout.

   To change the pose: open the poser, shape it, hit COPY CONFIG,
   and replace the object below. Nothing else has to change.
   ============================================================ */

export interface Anchor {
  x: number;
  y: number;
}

export interface Pose {
  /** anchor chains, one per arm, root first and tip last */
  arms: Anchor[][];
  /** Catmull-Rom pull through the anchors */
  tension: number;
  /** plate silhouette */
  taper: number;
  girth: number;
  plates: number;
  gap: number;
  joint: number;
  hair: number;
  /** mantle */
  mw: number;
  mh: number;
  skirt: number;
  apW: number;
  apOff: number;
  collar: boolean;
  /** packets */
  packets: boolean;
  packetSeconds: number;
  packetSize: number;
}

export const pose: Pose = {
  tension: 1.8,
  taper: 1,
  girth: 1.02,
  plates: 10,
  gap: 0.26,
  joint: 0.4,
  hair: 1.5,
  mw: 1.02,
  mh: 1.02,
  skirt: 1.1,
  apW: 0.86,
  apOff: 0.05,
  collar: true,
  packets: true,
  packetSeconds: 3.8,
  packetSize: 1.05,
  arms: [
    [
      { x: -64.73, y: -71.53 },
      { x: -104.64, y: -133.71 },
      { x: -164.97, y: -175.48 },
      { x: -130.63, y: -246.01 },
      { x: -235.5, y: -230.23 },
    ],
    [
      { x: -80.51, y: -2.85 },
      { x: -162.18, y: -66.89 },
      { x: -208.58, y: -42.76 },
      { x: -216.47, y: -126.29 },
      { x: -255.84, y: -131.02 },
    ],
    [
      { x: -73.55, y: 46.33 },
      { x: -136.66, y: 66.75 },
      { x: -193.27, y: 21.28 },
      { x: -215.55, y: 97.38 },
      { x: -264.27, y: 15.71 },
    ],
    [
      { x: -43.85, y: 78.82 },
      { x: -100.93, y: 164.2 },
      { x: -179.81, y: 169.77 },
      { x: -149.65, y: 257.94 },
      { x: -252.2, y: 257.93 },
    ],
    [
      { x: 43.85, y: 78.82 },
      { x: 100.93, y: 164.2 },
      { x: 179.81, y: 169.77 },
      { x: 149.65, y: 257.94 },
      { x: 252.2, y: 257.93 },
    ],
    [
      { x: 73.55, y: 46.33 },
      { x: 136.66, y: 66.75 },
      { x: 193.27, y: 21.28 },
      { x: 215.55, y: 97.38 },
      { x: 264.27, y: 15.71 },
    ],
    [
      { x: 80.51, y: -2.85 },
      { x: 162.18, y: -66.89 },
      { x: 208.58, y: -42.76 },
      { x: 216.47, y: -126.29 },
      { x: 255.84, y: -131.02 },
    ],
    [
      { x: 64.73, y: -71.53 },
      { x: 104.64, y: -133.71 },
      { x: 164.97, y: -175.48 },
      { x: 130.63, y: -246.01 },
      { x: 235.5, y: -230.23 },
    ],
  ],
};

/** the pose's own bounding box in mantle units, mantle included */
export function poseExtent(p: Pose = pose) {
  let x0 = -p.mw * 100,
    x1 = p.mw * 100,
    y0 = -p.mh * 130,
    y1 = p.skirt * 90;
  for (const arm of p.arms) {
    for (const a of arm) {
      if (a.x < x0) x0 = a.x;
      if (a.x > x1) x1 = a.x;
      if (a.y < y0) y0 = a.y;
      if (a.y > y1) y1 = a.y;
    }
  }
  // the limb half-width at the root, so the silhouette is not clipped
  const pad = 100 * 0.17 * p.girth + 6;
  return { x0: x0 - pad, x1: x1 + pad, y0: y0 - pad, y1: y1 + pad };
}
