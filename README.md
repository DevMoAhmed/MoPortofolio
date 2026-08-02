# octopus_pf

Portfolio site for Mohamed Ahmed Abdallah. The concept is **polymorphism**: one
interface, many implementations — expressed as an octopus (eight semi-autonomous
arms, one animal) that can change its skin.

## Run it

```bash
npm run dev
```

Then open <http://localhost:4321>.

```bash
npm run build     # static output → dist/
npm run preview   # serve dist/ locally
npm run check     # TypeScript + Astro diagnostics
```

## Stack, and why

| Choice | Reason |
| --- | --- |
| **Astro 7**, static output | Content-first site. Ships HTML with ~one small JS island; no React runtime. |
| **Hand-written CSS**, no Tailwind | The "AI-generated" look comes from default utility tokens (`rounded-2xl`, `shadow-lg`, indigo). A private token system in `src/styles/tokens.css` makes that impossible by construction. |
| **Canvas 2D**, no three.js / GSAP | The crown is ~500 lines of arm kinematics. A 3D engine would be 200 kB to do less. |
| **Instrument Serif + Archivo + IBM Plex Mono**, self-hosted | Not Inter. Serif display / grotesque body / mono for the engineering register. Fonts are bundled, so no Google Fonts request. |
| **CSS scroll-driven animations** with an IntersectionObserver fallback | Reveals run off the compositor where the browser supports it; JS only where it doesn't. |

## Where things live

```
src/
  data/site.ts        ← ALL CONTENT. Edit this, not the components.
  styles/
    tokens.css        ← design system: skins, spacing, type scale, radius
    base.css          ← reset, typography, shared primitives
    layout.css        ← one grid per section (no shared card component)
  scripts/
    palette.ts        ← skin reading + colour maths shared by both canvases
    rig.ts            ← how the animal is drawn: mantle, limb, inlay, clamp
    crown.ts          ← arm kinematics: eight chains reaching eight branches
    dock.ts           ← the hero rig: same animal, short arms, eight clamps
    site.ts           ← skin switch, depth gauge, tabs, role cycle, reveals
  components/         ← one file per section
  layouts/Base.astro  ← <head>, fonts, pre-paint skin restore
  pages/index.astro   ← section order
public/favicon.svg
```

## The design rules (deliberate — please keep them if you edit)

1. **Nothing sits on an 8pt grid.** The spacing scale is a 1.5 ratio:
   6 / 9 / 14 / 21 / 32 / 48 / 72 / 108 / 162 px.
2. **Radius vocabulary is 0 / 1 / 2 px.** The only curve in the system is the
   `--r-blob` organic shape, reserved for chromatophores and ink washes.
3. **No drop shadows.** Depth comes from hairline borders and bioluminescent
   glow. Glow is allowed because the subject actually glows.
4. **No uniform card grid.** Every section declares its own asymmetric grid.
5. **`--fg-3` is held at ≥ 4.5:1 contrast on `--bg` in all four skins.** If you
   change a skin colour, re-check it.
6. **Copy is specific.** Real numbers, real tool names, no "passionate about" and
   no "empower / unlock / transform".

## The crown (Eight Arms section)

The animal is not decoration floating behind the page — it **is** the page's
structure. The mantle sits in the middle column of `.crown`, spanning every row
so it hangs level with the middle of the branch stack — four branches above it,
four below, arms radiating out of the skirt in both directions. Each of the
eight branches has a `.branch__anchor`, and `crown.ts` reads those boxes from
the DOM and grows one tentacle to each. So:

Both canvases draw in the same language, which lives in `rig.ts`, and it is
**flat 2D**: no gradients, no radial shading, no glow sprites, no rim lights, no
composite blending. A solid mantle with **one aperture instead of two eyes**;
limbs built rather than grown — cut into seven plates with a visible gap and a
pinned joint at every seam; a clamp where the arm terminates; a right-angled
lead running from that clamp to the branch it serves; and packets travelling
the arm. `crown.ts` and `dock.ts` only decide where the arms *go*.

**All eight arms are one length.** They stop on a shared circle around the
mantle rather than each stretching to its own label, because four short arms and
four long ones read as a limp. The lead line covers whatever is left.

Nothing idles. The arms settle into a pose and hold it — no breathing, no sway,
no twinkle. The only thing that moves on this animal is a packet.

- Move a branch in CSS and its arm and lead follow. No hardcoded coordinates.
- Reorder or add a branch in `src/data/site.ts` and the fan re-sorts itself so
  no two arms cross.
- Hovering a branch tightens its arm, brightens its inlay and clamp, and the
  aperture slides toward it.
- The launch arc is derived from where the branches actually are, which is why
  the single-column mobile layout hangs all eight arms down the left lane
  instead of sweeping them across the copy.

## The dock (hero)

The same animal at 0 m, drawn as instrumentation instead of a creature:
mantle pulled down close, arms cut to a ~40 px drop, and each arm clamped into
a port that is a real link to one of the eight sections. `dock.ts` reads the
port boxes out of the DOM exactly the way `crown.ts` reads the branches, so the
CSS owns the layout — change the port gap and the fan changes with it.

It shares every drawing primitive with the crown (`rig.ts`); the only difference
is arm shape — short beziers to a row of clamps instead of IK chains to labels.
Five of the eight lanes carry a packet at a time. Motion stops entirely under
`prefers-reduced-motion`, which renders one settled pose instead.

With JS off the ports are still a working nav; only the tentacles are canvas.

## Skins

Four states, switchable bottom-right, persisted in `localStorage`:

| Skin | What it is |
| --- | --- |
| `abyss` | 4000 m. Photophore teal on blue-black. Default. |
| `camouflage` | Mimic octopus flattened over lit sand. Light mode. |
| `ink` | The cloud left behind. Sepia-black, dull gold. |
| `flash` | Deimatic display — every chromatophore fired. |

The canvas reads its colours from the active skin's CSS custom properties, so the
animal re-tints with the page. That is the thesis, running.

## TODO before this goes live

Search the repo for `TODO`. Currently:

- [ ] `astro.config.mjs` → set `site` to the real domain.
- [ ] `public/cv.pdf` → drop the CV in, then uncomment the `CV` entry in `links`.
- [ ] `src/data/site.ts` → `pieces`: add `src: '/art/whatever.jpg'` (files under
      `public/`) to fill the art frames. Until then they render an ink wash and
      say so.
- [ ] Add an Open Graph image (`public/og.png`, 1200×630) and reference it in
      `src/layouts/Base.astro`.

## Deploy

Static output — anything that serves files works.

```bash
npm run build
```

Then point Netlify / Cloudflare Pages / Vercel at the repo with build command
`npm run build` and publish directory `dist`. For GitHub Pages, set
`base: '/repo-name'` in `astro.config.mjs` first.

## Accessibility notes

- Full keyboard path: skip link, focusable tabs with arrow-key navigation,
  visible `:focus-visible` ring on the glow colour.
- The canvas is `aria-hidden` and `pointer-events: none` — it is decoration.
- `prefers-reduced-motion: reduce` stops the animation loop entirely and renders
  one composed pose; the role cycle and reveals also stop.
- The page is fully readable with JavaScript disabled.
