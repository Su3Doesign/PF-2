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

export const worlds: World[] = (data.worlds as Omit<World, 'tone' | 'hour'>[]).map((w) => ({ ...w, ...LOOK[w.id] }));
export const clients = data.clients as Client[];
export const studies = data.studies as Media[];
export const tiers = data.tiers as { n: string; name: string; for: string; items: string[]; flag?: string }[];

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
