/* ============================================================
   site.ts — page behaviour
   ------------------------------------------------------------
   Everything here is progressive: the page is complete and
   readable with JS disabled. This layer adds the dive gauge,
   the skin morph, the role cycle, the implementation tabs, and
   the crown that draws one tentacle per branch.
   ============================================================ */

import { mountCrown } from './crown';
import { mountDock } from './dock';

const SKINS = ['abyss', 'camouflage', 'ink', 'flash'] as const;
type SkinName = (typeof SKINS)[number];
const SKIN_KEY = 'octo:skin';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = <T extends Element>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const qa = <T extends Element>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

/* ------------------------------------------------------------
   1. skin — polymorphism the visitor can operate
   ------------------------------------------------------------ */
function initSkin() {
  const cells = qa<HTMLButtonElement>('.chromo__cell');

  const apply = (name: SkinName, persist = true) => {
    document.documentElement.dataset.skin = name;
    for (const c of cells) {
      c.setAttribute('aria-pressed', String(c.dataset.cell === name));
    }
    if (persist) {
      try {
        localStorage.setItem(SKIN_KEY, name);
      } catch {
        /* private mode — the skin just won't persist */
      }
    }
  };

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(SKIN_KEY);
  } catch {
    stored = null;
  }
  apply(
    (SKINS as readonly string[]).includes(stored ?? '')
      ? (stored as SkinName)
      : 'abyss',
    false,
  );

  for (const cell of cells) {
    cell.addEventListener('click', () => {
      const name = cell.dataset.cell as SkinName | undefined;
      if (name) apply(name);
    });
  }
}

/* ------------------------------------------------------------
   2. dive gauge — scroll depth reported in metres
   ------------------------------------------------------------ */
function initGauge() {
  const diver = q<HTMLElement>('.rail__diver');
  const read = q<HTMLElement>('.rail__read');
  const maxDepth = 4200;
  let queued = false;

  const paint = () => {
    queued = false;
    const scrollable =
      document.documentElement.scrollHeight - window.innerHeight;
    const k = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    diver?.style.setProperty('--dive', (k * 100).toFixed(2));
    if (read) {
      const m = Math.round((k * maxDepth) / 10) * 10;
      read.textContent = `${m} m`;
    }
  };

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  paint();
}

/* ------------------------------------------------------------
   3. role cycle — one interface, implementations rotating
   ------------------------------------------------------------ */
function initMorph() {
  const slot = q<HTMLElement>('.morph__slot b');
  if (!slot) return;
  const roles = (slot.dataset.roles ?? '').split('|').filter(Boolean);
  if (roles.length < 2) return;

  let i = 0;
  if (reduced) {
    slot.textContent = roles[0]!;
    return;
  }

  const type = async (word: string) => {
    const current = slot.textContent ?? '';
    for (let n = current.length; n >= 0; n--) {
      slot.textContent = current.slice(0, n);
      await wait(26);
    }
    for (let n = 0; n <= word.length; n++) {
      slot.textContent = word.slice(0, n);
      await wait(42);
    }
  };

  const tick = async () => {
    await type(roles[i % roles.length]!);
    i++;
    setTimeout(tick, 2100);
  };
  slot.textContent = '';
  tick();
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ------------------------------------------------------------
   4. implementation tabs
   ------------------------------------------------------------ */
function initTabs() {
  const tabs = qa<HTMLButtonElement>('.poly__tab');
  const panels = qa<HTMLElement>('.poly__panel');
  const codes = qa<HTMLElement>('.poly__code');
  if (!tabs.length) return;

  const select = (id: string) => {
    for (const t of tabs) {
      t.setAttribute('aria-selected', String(t.dataset.impl === id));
      t.tabIndex = t.dataset.impl === id ? 0 : -1;
    }
    for (const p of panels) p.hidden = p.dataset.impl !== id;
    for (const c of codes) c.hidden = c.dataset.impl !== id;
  };

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => select(tab.dataset.impl ?? ''));
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = tabs[(idx + step + tabs.length) % tabs.length]!;
      next.focus();
      select(next.dataset.impl ?? '');
    });
  });

  select(tabs[0]!.dataset.impl ?? '');
}

/* ------------------------------------------------------------
   5. current section in the arm nav
   ------------------------------------------------------------ */
function initNav() {
  const links = qa<HTMLAnchorElement>('.armnav__item');
  if (!links.length) return;
  const byId = new Map<string, HTMLAnchorElement>();
  for (const l of links) {
    const id = l.getAttribute('href')?.replace('#', '');
    if (id) byId.set(id, l);
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const l of links) l.setAttribute('aria-current', 'false');
        byId.get(e.target.id)?.setAttribute('aria-current', 'true');
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );

  for (const id of byId.keys()) {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  }
}

/* ------------------------------------------------------------
   6. reveals — fallback only; CSS handles it where supported
   ------------------------------------------------------------ */
function initReveals() {
  if (reduced) return;
  if (CSS.supports('animation-timeline: view()')) return;
  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          obs.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
  for (const el of qa('.rise')) io.observe(el);
}

/* ------------------------------------------------------------
   7. the animal — structural, not swimming. Lives inside the
   Arms section and holds each branch with one tentacle.
   ------------------------------------------------------------ */
function initCrown() {
  const el = q<HTMLElement>('[data-crown]');
  if (!el) return;
  try {
    mountCrown(el);
  } catch {
    // the section still reads as a list without the drawing
    el.querySelector('canvas')?.remove();
  }
}

/* ------------------------------------------------------------
   8. the dock — the same animal at 0 m, compressed to a strip of
   clamps. Ports are links whether or not this runs.
   ------------------------------------------------------------ */
function initDock() {
  const el = q<HTMLElement>('[data-dock]');
  if (!el) return;
  try {
    mountDock(el);
  } catch {
    // the ports still work as a nav without the drawing
    el.querySelector('canvas')?.remove();
  }
}

/* ------------------------------------------------------------ */

initSkin();
initGauge();
initMorph();
initTabs();
initNav();
initReveals();
initCrown();
initDock();
