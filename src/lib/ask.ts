import { projects, profile, type Project } from '../data/projects';

export interface Reply {
  text: string;
  /** Case studies to offer as links under the answer. */
  links: Project[];
}

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
  links?: Project[];
}

// Words that point at a project without naming it.
const ALIASES: Record<string, string[]> = {
  'overgrown-archive': ['forest', 'neon', 'kodama', 'pond', 'thesumanth', 'current', 'walk', 'night'],
  'altair-estates': ['estate', 'car', 'cars', 'garage', 'cliff', 'drive', 'pencil', 'drawing', 'blueprint', 'architecture', 'house'],
  'ring-gate': ['ring', 'gate', 'tirthavel', 'kaalavalaya', 'book', 'mahabharata', 'concept', 'art'],
  'flooded-rotunda': ['rotunda', 'statue', 'flooded', 'water', 'sketchbook', 'unreal', 'nanite', 'romanesque'],
  'lotus-constructions': ['lotus', 'construction', 'builder', 'building', 'contractor', 'engineer', 'street'],
  'invitation-book': ['wedding', 'invitation', 'telugu', 'marriage', 'book', 'pages'],
  capq: ['capq', 'finance', 'loan', 'astro', 'tailwind', 'glass', 'coming', 'soon'],
  aevum: ['watch', 'clock', 'time', 'aevum'],
  volta: ['volta', 'fashion', 'brutalism', 'loud', 'clothes'],
  vespera: ['vespera', 'boutique', 'fashion', 'luxury', 'dusk'],
  meridian: ['meridian', 'sun', 'solar', 'sky'],
  'thesumanth-v1': ['v1', 'glass', 'refraction', 'mosaic', 'first', 'old'],
  resume: ['resume', 'résumé', 'cv', 'experience', 'jobs'],
};

const KIND_WORDS: Record<string, Project['kind']> = {
  client: 'Client',
  clients: 'Client',
  paid: 'Client',
  concept: 'Concept',
  concepts: 'Concept',
  brand: 'Concept',
  world: 'World',
  worlds: 'World',
  personal: 'Self',
  portfolio: 'Self',
  portfolios: 'Self',
};

const STOP = new Set('a an and the of to in on for is are was it its this that what which who how why do does did you your me i my with about any one ones site sites website websites have has can tell show give made make built build'.split(' '));

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));

function haystack(p: Project) {
  return words(
    [p.title, p.line, p.kind, p.role, p.stack.join(' '), p.story.premise, p.story.idea, p.story.built.join(' '), p.story.hardPart, p.story.outcome]
      .concat(ALIASES[p.slug] ?? [])
      .join(' '),
  );
}

const INDEX = projects.map((p) => ({ p, bag: new Set(haystack(p)), aliases: new Set(ALIASES[p.slug] ?? []) }));

const list = (ps: Project[]) => ps.map((p) => `• ${p.title}: ${p.line}`).join('\n');

/** Answers from the case studies on this page. No network, no model. */
export function answerLocally(question: string): Reply {
  const q = question.toLowerCase();
  const ws = words(question);

  if (/\b(contact|email|hire|reach|available|work with|commission|book you)\b/.test(q)) {
    return {
      text: `Write to ${profile.email}. Sumanth is in ${profile.city}, and also on ${profile.links.map(([n]) => n).join(', ')}.`,
      links: [],
    };
  }

  if (/\b(how many|count|list|all|every)\b/.test(q) && !ws.some((w) => KIND_WORDS[w])) {
    return { text: `${projects.length} finished sites so far:\n${list(projects)}`, links: [] };
  }

  if (/\b(stack|tools|tech|technology|framework|library|libraries)\b/.test(q)) {
    const count = new Map<string, number>();
    projects.forEach((p) => p.stack.forEach((s) => count.set(s, (count.get(s) ?? 0) + 1)));
    const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      text: `The most used tools across the ${projects.length} sites: ${top.map(([s, n]) => `${s} (${n})`).join(', ')}. The worlds behind the sites are built in Blender and Unreal Engine 5.`,
      links: projects.filter((p) => p.stack.includes('three.js')).slice(0, 3),
    };
  }

  if (/\b(3d|three|webgl|worlds?|blender|unreal)\b/.test(q) && /\b(which|what|list|show|any)\b/.test(q)) {
    const ps = projects.filter((p) => p.featured);
    return {
      text: `${ps.length} sites were built around a 3D world made first, in Blender, Unreal or code:\n${list(ps)}\n\n${projects.filter((p) => p.stack.includes('three.js')).length} of the ${projects.length} sites run three.js in the browser.`,
      links: ps,
    };
  }

  if (/\b(technical|complex|hardest|difficult|performance|fastest|optimi[sz]ed?)\b/.test(q)) {
    const p = projects.find((x) => x.slug === 'overgrown-archive')!;
    const also = projects.find((x) => x.slug === 'flooded-rotunda')!;
    return {
      text: `${p.title} is the most engineered. ${p.story.hardPart}\n\n${p.story.outcome}`,
      links: [p, also],
    };
  }

  const kind = ws.map((w) => KIND_WORDS[w]).find(Boolean);
  if (kind && ws.length <= 3) {
    const ps = projects.filter((p) => p.kind === kind);
    return { text: `${ps.length} of them:\n${list(ps)}`, links: ps.slice(0, 4) };
  }

  const scored = INDEX.map(({ p, bag, aliases }) => ({
    p,
    score: ws.reduce((s, w) => s + (aliases.has(w) ? 3 : 0) + (bag.has(w) ? 1 : 0) + (p.title.toLowerCase().includes(w) ? 4 : 0), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return {
      text: 'I couldn’t match that to anything on this site. Try asking about a project (the forest, the Ring Gate, the wedding book), about client work, or about the tools.',
      links: [],
    };
  }

  const best = scored[0].p;
  const also = scored.slice(1, 3).filter((x) => x.score >= scored[0].score * 0.6).map((x) => x.p);
  const text = `${best.title}: ${best.line}\n\n${best.story.idea}${also.length ? `\n\nAlso relevant: ${also.map((a) => a.title).join(' and ')}.` : ''}`;
  return { text, links: [best, ...also] };
}

/**
 * If VITE_ASK_ENDPOINT is set at build time, questions go to that endpoint instead:
 * POST { messages: Turn[] } → { reply: string, slugs?: string[] }.
 * Anything else, including a failed request, falls back to the local answers.
 */
export async function ask(history: Turn[]): Promise<Reply> {
  const endpoint = import.meta.env.VITE_ASK_ENDPOINT as string | undefined;
  const question = history[history.length - 1].text;
  if (!endpoint) return answerLocally(question);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.map(({ role, text }) => ({ role, text })) }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { reply: string; slugs?: string[] };
    return { text: data.reply, links: (data.slugs ?? []).map((s) => projects.find((p) => p.slug === s)!).filter(Boolean) };
  } catch {
    return answerLocally(question);
  }
}

export const usesModel = Boolean(import.meta.env.VITE_ASK_ENDPOINT);
