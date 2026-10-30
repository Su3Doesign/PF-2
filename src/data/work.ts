// The 3D and visual-design work, imported from the PF-1 portfolio by tools/import-pf1.mjs,
// plus the art direction this site adds on top: each world's colour and hour, the image the
// door shows at each step of the method, and the order the door cycles through.

import data from './pf1.json';

export interface Media {
  src: string;
  w: number;
  h: number;
  type: 'image' | 'video';
  thumb: string;
  poster?: string;
  label?: string;
  name?: string;
  kind?: string;
}

export interface World {
  id: string;
  title: string;
  jp: string;
  sub: string;
  year: string;
  note: string;
  tags: string[];
  alt: string;
  plate: Media;
  shots: Media[];
  /** The colour the chapter is lit in. */
  tone: string;
  /** The hour each world is held at, as on MERIDIAN. */
  hour: string;
}

export interface Client {
  name: string;
  group: string;
  role: string;
  files: Media[];
}

const LOOK: Record<string, { tone: string; hour: string }> = {
  'roman-no-yoake': { tone: '#ffa38f', hour: '05:42' },
  'fudo-myo-o': { tone: '#ff6a3d', hour: '17:48' },
  'koi-pond': { tone: '#3fe0c8', hour: '21:12' },
};

// The castle is not on PF-1: it comes from the wizardingworld repository, whose previews are
// Cycles path-traces of the Unreal assets (see public/worlds/castle).
const CASTLE_SHOTS: [file: string, w: number, h: number, label: string][] = [
  ['02-boats-night', 853, 1280, 'Boats, night'],
  ['07-astronomy-tower', 1280, 720, 'Astronomy Tower'],
  ['08-station-night', 1280, 720, 'From the station'],
  ['06-forestedge-hut', 1280, 720, 'Forest edge, dusk'],
  ['14-boathouse-stairs', 1280, 720, 'Boathouse stairs'],
  ['03-lake-sunset', 1280, 720, 'Loch, sunset'],
  ['01-gorge-mist', 720, 1280, 'Gorge, mist'],
  ['15-covered-bridge', 1280, 720, 'Covered bridge'],
  ['10-cliff-moss', 720, 1280, 'Moss on the granite'],
  ['11-gorge-river', 720, 1280, 'River gorge'],
  ['09-grand-orbit', 1280, 720, 'The whole crag'],
  ['04-viaduct-walk', 1280, 720, 'Viaduct walk'],
  ['05-quidditch-aerial', 1280, 720, 'Stadium, from the air'],
  ['16-quidditch-pitch', 1280, 720, 'The pitch'],
  ['17-flying-lesson', 1280, 720, 'Flying lesson'],
  ['layout-map', 1600, 1600, 'Shot plan'],
];
const castleMedia = (file: string, w: number, h: number, label?: string): Media => ({
  src: `worlds/castle/${file}.webp`,
  thumb: `worlds/castle/thumbs/${file}.webp`,
  w,
  h,
  type: 'image',
  label,
});

const castle: World = {
  id: 'castle-on-the-crag',
  title: 'The Castle on the Crag',
  jp: '岩上の城',
  sub: 'A wizarding-school castle above a Highland loch, generated entirely from code',
  year: '2026',
  note: 'Forty-five towers on two jointed-granite crags, a viaduct, the boathouse stairs, a stadium and 644,000 trees, moss cushions and boulders. Every piece is generated from code, with no scans and no alpha cards. Built for Unreal Engine 5 with Nanite and Lumen; these frames are path-traced Cycles previews of the same assets, cameras and light.',
  tags: ['Python', 'Blender', 'Cycles', 'Unreal Engine 5', 'Nanite', '17 cameras'],
  alt: 'A many-towered castle lit from every window on a granite cliff above a dark loch, mountains behind',
  plate: castleMedia('13-night-cliff', 1280, 720),
  shots: CASTLE_SHOTS.map(([f, w, h, label]) => castleMedia(f, w, h, label)),
  tone: '#f5c46a',
  hour: '23:56',
};

export const worlds: World[] = [...(data.worlds as Omit<World, 'tone' | 'hour'>[]).map((w) => ({ ...w, ...LOOK[w.id] })), castle];
export const clients = data.clients as Client[];
export const studies = data.studies as Media[];

const study = (name: string, kind?: string) => studies.find((s) => s.name === name && (!kind || s.kind === kind))!;

/** The seven moves, each with the piece of work that shows it best. */
export const steps = data.steps.map((s) => {
  const art: Record<string, Media> = {
    Reference: study('Cloudbank'),
    Blockout: study('Clay pass'),
    'Hard-surface': study('Hard-surface', 'Practice'),
    Sculpt: study('Sensei'),
    Texture: study('Extinguisher'),
    Light: study('Late room'),
    Comp: worlds[2].shots[3],
  };
  const media = art[s.name];
  return { ...s, media, caption: media.name ? `${media.name} · ${media.kind}` : `${worlds[2].title} · ${media.label}` };
});

export interface ReelItem {
  src: string;
  title: string;
  tone: string;
  /** Shown while nothing on the page asks for a particular image. */
  idle?: boolean;
}

/** Everything the 3D door can show: the worlds while idle, the method's studies on cue. */
export const reel: ReelItem[] = [
  ...worlds.map((w) => ({ src: w.plate.src, title: w.title, tone: w.tone, idle: true })),
  { src: study('Octavia', 'Automotive · night').src, title: 'Octavia, night', tone: '#7fa8ff', idle: true },
  { src: study('Moon field').src, title: 'Moon field', tone: '#c9b8ff', idle: true },
  ...steps.map((s) => ({ src: s.media.src, title: s.caption, tone: '#8b6bff' })),
];
export const reelIndexOfStep = (i: number) => worlds.length + 2 + i;

export interface Commission {
  /** The first blank in "I'd like ___ for ___." */
  what: string;
  /** What the second blank jumps to when this one is picked. */
  usual: string;
  arrives: string[];
  time: string;
  example: { src: string; poster?: string; video?: boolean; caption: string };
}

const tier = (name: string) => (data.tiers as { name: string; items: string[] }[]).find((t) => t.name === name)!;
const lower = (s: string) => s.replace(/ · /g, ' and ').replace(/^[A-Z](?=[a-z ])/, (c) => c.toLowerCase());
const fromTier = (name: string) => {
  const items = tier(name).items.map(lower);
  return { arrives: items.slice(0, -1), time: items[items.length - 1] };
};
const shot = (world: number, label: string) => worlds[world].shots.find((s) => s.label === label)!;

/** What Sumanth takes on, as the blanks of one sentence. The 3D options are PF-1's tiers. */
export const commissions: Commission[] = [
  {
    what: 'a single frame',
    usual: 'an album cover',
    ...fromTier('One Frame'),
    example: { src: worlds[1].plate.src, caption: `${worlds[1].title}: one frame, held at ${worlds[1].hour}` },
  },
  {
    what: 'a whole world',
    usual: 'a brand campaign',
    ...fromTier('The World'),
    example: { src: castle.plate.src, caption: `${castle.title}: one place, ${castle.shots.length + 1} frames` },
  },
  {
    what: 'the full pipeline',
    usual: 'a film or a game',
    ...fromTier('The Pipeline'),
    example: {
      src: shot(0, 'Turntable').src,
      poster: shot(0, 'Turntable').poster,
      video: true,
      caption: `${worlds[0].title}: the turntable pass`,
    },
  },
  {
    what: 'a brand and a website',
    usual: 'my own company',
    arrives: ['the brand and its design system', 'the website, designed and built by hand', 'launch assets for social, print and the expo floor'],
    time: 'scoped together',
    example: { src: 'work/capq/cover.webp', caption: 'CapQ: brand, design system and site' },
  },
];

/** The second blank. */
export const commissionFor = ['an album cover', 'a brand campaign', 'a product launch', 'a film or a game', 'a studio pitch', 'my own company'];

export const counts = {
  worlds: worlds.length,
  clients: clients.length,
  studies: studies.length,
  pieces: clients.reduce((n, c) => n + c.files.length, 0),
};

// From the 2026 résumé (public/resume/Sumanth-Resume-2026.pdf).
export const about = {
  line: data.profile.line,
  statement:
    'I lead marketing the way a designer would: the campaign, the brand system, the website and the room it all gets pitched in are one continuous piece of work. Trained as a 3D generalist and rooted in Fine Arts, so the strategy never arrives separately from the craft.',
  paragraphs: data.profile.about,
  tools: {
    ...(data.profile.tools as Record<string, string>),
    Brand: 'Marketing strategy · Brand & design systems · Event activation · B2B partnerships',
    Web: 'HTML · CSS · JS · three.js · front-end builds · content architecture',
    CAD: 'CATIA V5 · SolidWorks · CREO · NX · AutoCAD',
    Speaks: 'English · Telugu · Hindi · some German',
  } as Record<string, string>,
  desk: data.profile.desk as string | undefined,
  path: [
    ['Head of Marketing', 'CapQ, financial advisory · Hyderabad', 'Jan 2026 – now · marketing end to end: brand, design system, the website, expos, MSME outreach'],
    ['Graphic designer', 'The Classic Partnership Inc. · Toronto', 'Oct 2024 – Dec 2025 · 9+ international brand accounts: Midea Canada, KD Displays, Home Depot Canada, Investohome, GC Burger'],
    ['BA (Hons) Multimedia', 'JNAFAU, via ICAT · Hyderabad', '2021 – 2026 · capstone in 3D environment design (UE4)'],
    ['PGP, Automotive Design & Mfg.', 'SkyySkill · ASDC · BOSCH JCC · IIT Guwahati E&ICT', '2026 · active · industrial CAD alongside the 3D'],
  ] as [string, string, string][],
  numbers: [
    ['9+', 'Brand accounts run in parallel'],
    ['15', 'Months with an agency in Toronto'],
  ] as [string, string][],
};
