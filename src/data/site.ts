/* ============================================================
   site.ts — ALL CONTENT LIVES HERE.
   Edit this file to change the site's words and facts; the
   components only lay them out. Anything marked TODO is a real
   gap, not filler — fill it or delete the entry.
   ============================================================ */

export const person = {
  name: 'Mohamed Abdallah',
  first: 'Mohamed',
  last: 'Abdallah',
  short: 'Mohamed Abdallah',
  role: 'Data analysis & automation',
  employer: 'Revibe',
  place: 'Farshout, Qena — Egypt',
  tz: 'UTC+3',
  email: 'mohamed.abdallah@revibe.me',
  born: 1999,
  /** cycled in the hero — one interface, many implementations */
  roles: [
    'automation engineer',
    'data analyst',
    'electrical engineer',
    'flutter developer',
    'python instructor',
    'portrait artist',
    'game designer',
  ],
  tagline: 'One interface. Many implementations.',
  intro:
    'Electrical engineer who moved into data and automation. I build the pipeline, the model behind it, and the report someone actually reads — then I go home and draw portraits with a pencil.',
} as const;

/* ------------------------------------------------------------
   EIGHT ARMS — eight domains, one animal.
   `arm` maps the row to a specific tentacle on the canvas.
   ------------------------------------------------------------ */
export const arms = [
  {
    arm: 0,
    name: 'Automation',
    note: 'Repetitive work gets replaced by a pipeline. n8n orchestrating Python, SQL and Sheets; userscripts and hotkey layers for the last mile.',
    stack: ['n8n', 'Python', 'REST', 'AutoHotkey', 'Tampermonkey'],
  },
  {
    arm: 1,
    name: 'Data & reporting',
    note: 'Support data turned into weekly numbers people make decisions on. Extract, categorise, aggregate, publish — unattended.',
    stack: ['SQL', 'Pandas', 'Sheets API', 'Gorgias'],
  },
  {
    arm: 2,
    name: 'AI integration',
    note: 'LLMs used as components, not demos. Ticket classification, transcript parsing, moderation assistance — each with a deterministic fallback.',
    stack: ['Gemini', 'Prompt design', 'Structured output'],
  },
  {
    arm: 3,
    name: 'Mobile',
    note: 'Flutter with Bloc and sealed state — every screen state is a type the compiler can check, not a boolean guess.',
    stack: ['Flutter', 'Dart', 'Bloc', 'Sealed classes'],
  },
  {
    arm: 4,
    name: 'Power electronics',
    note: 'Three-phase conversion, control loops, embedded firmware. Simulated in Simulink, then made to behave on real silicon.',
    stack: ['MATLAB', 'Simulink', 'PIC18F4620', 'C'],
  },
  {
    arm: 5,
    name: 'Game systems',
    note: 'Systems designed to be played. Godot projects, and years of Minecraft command-block machines — state machines with redstone for a compiler.',
    stack: ['Godot', 'GDScript', 'Command blocks'],
  },
  {
    arm: 6,
    name: 'Teaching',
    note: 'Taught Python at iSchool. Explaining a concept until it is genuinely obvious is a separate skill from knowing it.',
    stack: ['Python', 'Curriculum', 'Live debugging'],
  },
  {
    arm: 7,
    name: 'Drawing',
    note: 'Paid portrait commissions since 2015. Graphite, real reference, no filters — the discipline that taught me to look before I build.',
    stack: ['Graphite', 'Portrait', 'Commission work'],
  },
] as const;

/* ------------------------------------------------------------
   POLYMORPHISM — the thesis, made literal.
   Same interface, four implementations.
   ------------------------------------------------------------ */
export interface Impl {
  id: string;
  label: string;
  heading: string;
  body: string[];
  spec: [string, string][];
  code: string[];
}

export const implementations: Impl[] = [
  {
    id: 'automator',
    label: 'Automator',
    heading: 'Read the workflow, then delete most of it.',
    body: [
      'Most support work is the same three decisions repeated a few hundred times. My job is to find those three decisions, encode them, and give the humans back the hours.',
      'At <strong>Revibe</strong> that meant pipelines over Gorgias, the internal Orders app and the Claims app — extraction, categorisation, aggregation, publication. The weekly report writes itself now.',
    ],
    spec: [
      ['Owns', 'Ticket pipelines, categorisation, weekly reporting'],
      ['Tools', 'n8n · Python · SQL · Google Sheets API'],
      ['Rule', 'If I do it twice by hand, the third time is a script'],
    ],
    code: [
      '<span class="k">class</span> <span class="t">Automator</span> <span class="k">implements</span> <span class="t">Builder</span> {',
      '  <span class="c">// the same three decisions, 400 times a week</span>',
      '  <span class="n">read</span>(p: <span class="t">Problem</span>) {',
      '    <span class="k">return</span> p.<span class="n">steps</span>.<span class="n">filter</span>(<span class="n">isDecision</span>);',
      '  }',
      '  <span class="n">build</span>(m: <span class="t">Model</span>) {',
      '    <span class="k">return</span> <span class="n">pipeline</span>(<span class="t">Gorgias</span>, <span class="t">Orders</span>, <span class="t">Claims</span>)',
      '      .<span class="n">classify</span>(<span class="t">Gemini</span>)',
      '      .<span class="n">reduce</span>(<span class="n">weekly</span>)',
      '      .<span class="n">publish</span>(<span class="t">Sheets</span>);',
      '  }',
      '  <span class="n">ship</span>(s: <span class="t">System</span>) {',
      '    <span class="k">return</span> s.<span class="n">runs</span>(<span class="s">"without me"</span>);',
      '  }',
      '}',
    ],
  },
  {
    id: 'engineer',
    label: 'Engineer',
    heading: 'Power has to be measured, not asserted.',
    body: [
      'B.Sc. Electrical Engineering, 2023. The thesis was an off-board EV battery charger built around a <strong>Vienna rectifier</strong> — three-phase, unity-power-factor front end, measured at <strong>0.997</strong>.',
      'Hardware is unforgiving in a way software is not: a wrong assumption shows up as heat. That habit — prove it on the bench, then believe it — carried into everything after.',
    ],
    spec: [
      ['Degree', 'B.Sc. Electrical Engineering — 2023'],
      ['Thesis', 'EV off-board charger, Vienna rectifier topology'],
      ['Result', 'Power factor ≈ 0.997'],
      ['Embedded', 'PIC18F4620 · C · MATLAB / Simulink'],
    ],
    code: [
      '<span class="k">class</span> <span class="t">Engineer</span> <span class="k">implements</span> <span class="t">Builder</span> {',
      '  <span class="c">// hardware punishes optimism with heat</span>',
      '  <span class="n">read</span>(p: <span class="t">Problem</span>) {',
      '    <span class="k">return</span> <span class="n">model</span>(p, { <span class="n">tool</span>: <span class="t">Simulink</span> });',
      '  }',
      '  <span class="n">build</span>(m: <span class="t">Model</span>) {',
      '    <span class="k">const</span> <span class="n">stage</span> = <span class="n">vienna</span>(<span class="s">"3-phase"</span>);',
      '    <span class="k">return</span> <span class="n">stage</span>.<span class="n">tune</span>({ <span class="n">pf</span>: <span class="s">0.997</span> });',
      '  }',
      '  <span class="n">ship</span>(s: <span class="t">System</span>) {',
      '    <span class="k">return</span> s.<span class="n">measured</span>() ?? <span class="n">throwIt</span>();',
      '  }',
      '}',
    ],
  },
  {
    id: 'instructor',
    label: 'Instructor',
    heading: 'If I cannot explain it, I do not have it.',
    body: [
      'I taught Python at <strong>iSchool</strong>. Teaching beginners is the fastest way to find out which parts of your own understanding are memorised rather than known.',
      'It also changed how I write everything else — documentation, reports, commit messages. Assume the reader is smart, busy, and missing exactly the one piece of context you forgot to give.',
    ],
    spec: [
      ['Taught', 'Python — iSchool'],
      ['Also', 'Support onboarding, internal process docs'],
      ['Held over', 'Write for a smart reader who lacks your context'],
    ],
    code: [
      '<span class="k">class</span> <span class="t">Instructor</span> <span class="k">implements</span> <span class="t">Builder</span> {',
      '  <span class="c">// the test of knowing is explaining</span>',
      '  <span class="n">read</span>(p: <span class="t">Problem</span>) {',
      '    <span class="k">return</span> p.<span class="n">split</span>(<span class="n">untilObvious</span>);',
      '  }',
      '  <span class="n">build</span>(m: <span class="t">Model</span>) {',
      '    <span class="k">return</span> m.<span class="n">steps</span>.<span class="n">map</span>(<span class="n">s</span> => <span class="n">demo</span>(<span class="n">s</span>))',
      '      .<span class="n">concat</span>(<span class="n">letThemBreakIt</span>());',
      '  }',
      '  <span class="n">ship</span>(s: <span class="t">System</span>) {',
      '    <span class="k">return</span> s.<span class="n">taughtBack</span>() === <span class="k">true</span>;',
      '  }',
      '}',
    ],
  },
  {
    id: 'artist',
    label: 'Artist',
    heading: 'Drawing is observation with a deadline.',
    body: [
      'Paid portrait commissions since <strong>2015</strong>. Graphite, from real reference, for real people who will notice if the eyes are wrong.',
      'It is the oldest discipline I have and the one that feeds the rest: proportion, value, patience, and the willingness to erase two hours of work because the jawline is off by a degree.',
    ],
    spec: [
      ['Since', '2015 — commission work'],
      ['Medium', 'Graphite · portrait from reference'],
      ['Transfer', 'Proportion, patience, killing your own work'],
    ],
    code: [
      '<span class="k">class</span> <span class="t">Artist</span> <span class="k">implements</span> <span class="t">Builder</span> {',
      '  <span class="c">// erase two hours if the jaw is off</span>',
      '  <span class="n">read</span>(p: <span class="t">Problem</span>) {',
      '    <span class="k">return</span> <span class="n">observe</span>(p, { <span class="n">bias</span>: <span class="k">null</span> });',
      '  }',
      '  <span class="n">build</span>(m: <span class="t">Model</span>) {',
      '    <span class="k">let</span> <span class="n">work</span> = <span class="n">block</span>(m);',
      '    <span class="k">while</span> (<span class="n">work</span>.<span class="n">wrong</span>()) <span class="n">work</span> = <span class="n">redo</span>(<span class="n">work</span>);',
      '    <span class="k">return</span> <span class="n">work</span>;',
      '  }',
      '  <span class="n">ship</span>(s: <span class="t">System</span>) {',
      '    <span class="k">return</span> s.<span class="n">signed</span>().<span class="n">delivered</span>();',
      '  }',
      '}',
    ],
  },
];

export const interfaceCode = [
  '<span class="c">/* the shared contract — everything below implements it */</span>',
  '<span class="k">interface</span> <span class="t">Builder</span> {',
  '  <span class="n">read</span>(p: <span class="t">Problem</span>): <span class="t">Model</span>;',
  '  <span class="n">build</span>(m: <span class="t">Model</span>): <span class="t">System</span>;',
  '  <span class="n">ship</span>(s: <span class="t">System</span>): <span class="t">Outcome</span>;',
  '}',
];

/* ------------------------------------------------------------
   WORK
   ------------------------------------------------------------ */
export interface Project {
  no: string;
  title: string;
  where: string;
  lead?: boolean;
  body: string[];
  stack: string[];
  readout?: { val: string; unit?: string; key: string }[];
}

export const projects: Project[] = [
  {
    no: '01',
    title: 'Support data, turned into decisions',
    where: 'Revibe · current',
    lead: true,
    body: [
      'A stack of pipelines sitting on top of <strong>Gorgias</strong> and two internal apps (Orders, Claims). Tickets are pulled, transcripts parsed, categories assigned by an LLM, then aggregated into the numbers the team plans around.',
      'It started because I was the one doing it by hand. I began in ticket support — including voice — so I knew exactly which parts were judgement and which parts were transcription.',
      'The weekly report is the part I am proudest of: nobody assembles it. It arrives.',
    ],
    stack: ['n8n', 'Python', 'SQL', 'Google Sheets API', 'Gemini', 'Gorgias API'],
    readout: [
      { val: '100', unit: 's', key: 'tickets per cycle' },
      { val: '4', key: 'systems joined' },
      { val: '0', key: 'manual steps, weekly report' },
      { val: 'LLM', key: 'categorisation layer' },
    ],
  },
  {
    no: '02',
    title: 'EV off-board battery charger',
    where: 'B.Sc. thesis · 2023',
    body: [
      'Three-phase off-board charger built on a <strong>Vienna rectifier</strong> front end — chosen for unity power factor and low harmonic distortion at high power.',
      'Modelled in Simulink, then driven down to a control implementation. Measured power factor came in at <strong>0.997</strong>.',
    ],
    stack: ['MATLAB', 'Simulink', 'Power electronics', 'Embedded C'],
    readout: [
      { val: '0.997', key: 'power factor' },
      { val: '3', unit: 'φ', key: 'input' },
      { val: '2023', key: 'graduation' },
    ],
  },
  {
    no: '03',
    title: 'Gemini moderation extension',
    where: 'Personal · browser extension',
    body: [
      'A custom Chrome extension for social-media agents: reads the comment thread in place, flags what needs moderation, and drafts a reply in the brand voice for a human to approve.',
      'Built because the alternative was twelve tabs and a copy-paste habit.',
    ],
    stack: ['JavaScript', 'Chrome APIs', 'Gemini', 'Tampermonkey'],
  },
  {
    no: '04',
    title: 'Water-dispenser locator',
    where: 'Personal · Flutter',
    body: [
      'Cross-platform app for finding the nearest public water dispenser. Bloc architecture with sealed state classes, so every screen state is exhaustively handled at compile time.',
    ],
    stack: ['Flutter', 'Dart', 'Bloc', 'Maps'],
  },
  {
    no: '05',
    title: 'Exoplanet education project',
    where: 'NASA Space Apps Challenge',
    body: [
      'Team entry built around making exoplanet detection legible to people who are not astronomers — the transit method explained by letting you watch the light curve dip.',
    ],
    stack: ['Python', 'Data visualisation', 'Open NASA data'],
  },
  {
    no: '06',
    title: 'Command-block machines',
    where: 'Minecraft · long-running',
    body: [
      'Custom servers and adventure maps driven by large command-block systems: state machines, event queues and scoring logic written in a language that was never meant to have any.',
      'The clearest lesson in constraint-driven design I have had. It is also where I first enjoyed making systems people play inside.',
    ],
    stack: ['Command blocks', 'Server admin', 'Systems design'],
  },
  {
    no: '07',
    title: 'Self-hosted infrastructure',
    where: 'Oracle Cloud · Linux',
    body: [
      'Ubuntu servers on Oracle Cloud, provisioned and hardened by hand, running an Xray/V2Ray deployment and the automation jobs that back my own projects.',
    ],
    stack: ['Ubuntu', 'systemd', 'Nginx', 'Xray / V2Ray'],
  },
];

/* ------------------------------------------------------------
   DIVE — the descent. `year` may be a phase label where the
   exact date is not settled. TODO: replace THEN/NOW with real
   years for iSchool and the Revibe start.
   ------------------------------------------------------------ */
export interface Stop {
  year: string;
  what: string;
  note?: string;
  x: number;
  now?: boolean;
}

export const dive: Stop[] = [
  {
    year: '1999',
    what: 'Born in Farshout, Qena',
    note: 'Upper Egypt. Still the reference point for everything.',
    x: 0,
  },
  {
    year: '2015',
    what: 'First paid commission',
    note: 'Graphite portrait, for money, at sixteen. The first time making something was also earning something.',
    x: 1,
  },
  {
    year: '2017',
    what: 'Started training',
    note: 'Calisthenics and weights. Eight years of it now — the same compounding curve as everything else, just slower to read.',
    x: 2,
  },
  {
    year: '2023',
    what: 'B.Sc. Electrical Engineering',
    note: 'Graduated with the Vienna-rectifier charger as the thesis. Power factor 0.997.',
    x: 3,
  },
  {
    year: 'THEN',
    what: 'Taught Python at iSchool',
    note: 'Instructor role. Discovered that explaining is its own skill.',
    x: 4,
  },
  {
    year: 'THEN',
    what: 'Joined Revibe — ticket support',
    note: 'Including voice. Learned the domain from the bottom, which is why the automation later actually fit.',
    x: 5,
  },
  {
    year: 'NOW',
    what: 'Revibe — data & automation',
    note: 'Pipelines, categorisation, reporting. The work I was doing unofficially became the job.',
    x: 6,
    now: true,
  },
];

/* ------------------------------------------------------------
   INK — art. Add `src` (a path under /public) to fill a frame;
   until then the frame renders its ink wash and stays honest
   about being empty.
   ------------------------------------------------------------ */
export interface Piece {
  cls: 'a' | 'b' | 'c' | 'd' | 'e';
  label: string;
  medium: string;
  src?: string;
  alt?: string;
}

export const pieces: Piece[] = [
  { cls: 'a', label: 'Portrait study', medium: 'Graphite on paper' },
  { cls: 'b', label: 'Commission', medium: 'Graphite · detail' },
  { cls: 'c', label: 'Portrait study', medium: 'Graphite on paper' },
  { cls: 'd', label: 'Commission', medium: 'Graphite · full sheet' },
  { cls: 'e', label: 'Sketch', medium: 'Pencil' },
];

/* ------------------------------------------------------------
   NOW
   ------------------------------------------------------------ */
export const learning = [
  { what: 'Advanced Flutter architectures', note: 'Bloc at scale, sealed state, testable layers', level: 3 },
  { what: 'AI-driven automation', note: 'LLMs as reliable pipeline components', level: 3 },
  { what: 'Godot & game development', note: 'From systems I understand to systems people play', level: 2 },
  { what: 'Market technical analysis', note: 'Equities and physical gold — volume, structure', level: 2 },
  { what: 'German', note: 'A1, restarted. Slow and deliberate.', level: 1 },
];

export const heading = [
  {
    title: 'Game design, professionally',
    note: 'The long-term one. Systems people play inside, finished and released.',
  },
  {
    title: 'Independent software products',
    note: 'Own the whole thing — problem, code, users, revenue.',
  },
  {
    title: 'Automation mastery',
    note: 'AI-driven workflows that hold up in production, not in a demo.',
  },
];

/* ------------------------------------------------------------
   SIGNAL — only entries with an href are rendered.
   TODO: add your GitHub and LinkedIn URLs.
   ------------------------------------------------------------ */
export const links: { label: string; href: string }[] = [
  { label: 'Email', href: `mailto:${person.email}` },
  // { label: 'GitHub',   href: 'https://github.com/YOUR-HANDLE' },
  // { label: 'LinkedIn', href: 'https://linkedin.com/in/YOUR-HANDLE' },
  // { label: 'CV',       href: '/cv.pdf' },
];

export const languages = [
  { name: 'Arabic', level: 'native' },
  { name: 'English', level: 'fluent' },
  { name: 'German', level: 'A1' },
];
