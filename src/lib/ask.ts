import { projects, profile, type Project } from '../data/projects';
import { about, clients, commissions, counts, studies, worlds } from '../data/work';
import { workHref } from './useHashRoute';

export interface AnswerLink {
  label: string;
  href: string;
  tone?: string;
  external?: boolean;
}

export interface Reply {
  text: string;
  links: AnswerLink[];
}

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
  links?: AnswerLink[];
}

const site = (p: Project): AnswerLink => ({ label: p.title, href: workHref(p.slug), tone: p.tone });
const section = (label: string, id: string, tone?: string): AnswerLink => ({ label, href: `#${id}`, tone });
const resume: AnswerLink = { label: 'Résumé', href: profile.resume, external: true, tone: '#8b6bff' };

// Words that point at a website without naming it.
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
};

const STOP = new Set('a an and the of to in on for is are was it its this that what which who how why do does did you your me i my with about any one ones site sites website websites have has can tell show give made make built build work'.split(' '));

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));

const INDEX = projects.map((p) => ({
  p,
  bag: new Set(words([p.title, p.line, p.kind, p.role, p.stack.join(' '), p.story.premise, p.story.idea, p.story.built.join(' ')].concat(ALIASES[p.slug] ?? []).join(' '))),
  aliases: new Set(ALIASES[p.slug] ?? []),
}));

const bullet = (rows: string[]) => rows.map((r) => `• ${r}`).join('\n');

/** Answers from the work on this page. No network, no model. */
export function answerLocally(question: string): Reply {
  const q = question.toLowerCase();
  const ws = words(question);

  if (/\b(r[eé]sum[eé]|cv|experience|education|degree|studied|study at|college|qualification|background)\b/.test(q)) {
    return {
      text: `The full résumé is one tap away. In short:\n${bullet(about.path.map(([r, w, d]) => `${r}, ${w}: ${d}`))}`,
      links: [resume, section('Who’s building', 'about')],
    };
  }

  if (/\b(contact|email|hire|reach|available|work with you|book you)\b/.test(q)) {
    return { text: `Write to ${profile.email}. Sumanth is in ${profile.city} and open for commissions.`, links: [section('Commissions', 'commissions'), resume] };
  }

  if (/\b(commission|price|pricing|cost|rates?|quote|budget|package|tiers?)\b/.test(q)) {
    return {
      text: `Commissions are one sentence: “I’d like ___ for ___.” Fill in the blanks and it becomes an email. What he takes on:\n${bullet(commissions.map((c) => `${c.what}: ${c.arrives.join(', ')}. Usually ${c.time}.`))}`,
      links: [section('Commissions', 'commissions')],
    };
  }

  if (/\b(clients?|brands?|agenc(y|ies)|campaigns?|companies|worked with|toronto|canada|midea|burger|home depot|kd)\b/.test(q)) {
    const big = [...clients].sort((a, b) => b.files.length - a.files.length).slice(0, 6);
    return {
      text: `${counts.clients} clients, ${counts.pieces} pieces. The biggest bodies of work:\n${bullet(big.map((c) => `${c.name}: ${c.role}`))}`,
      links: [section('Clients', 'clients')],
    };
  }

  if (/\b(3d|environments?|worlds?|renders?|maya|arnold|zbrush|pagoda|shrine|koi|roman|fudo|personal)\b/.test(q) && !/\b(site|website|web)\b/.test(q)) {
    return {
      text: `${counts.worlds} personal worlds, each held at its own hour:\n${bullet(worlds.map((w) => `${w.title} (${w.hour}): ${w.sub}`))}`,
      links: [section('Worlds', 'worlds', worlds[0].tone)],
    };
  }

  if (/\b(studies|study|library|cars?|automotive|posters?|key art|product|illustrations?)\b/.test(q)) {
    const kinds = [...new Set(studies.map((s) => (s.kind ?? '').split(' · ')[0]))].filter(Boolean).slice(0, 10);
    return { text: `${counts.studies} studies in the library, including ${kinds.join(', ').toLowerCase()}.`, links: [section('The library', 'library')] };
  }

  if (/\b(stack|tools|software|tech|technology|framework|programs?)\b/.test(q)) {
    return {
      text: Object.entries(about.tools)
        .map(([k, v]) => `${k}: ${v}`)
        .concat(['On the web: three.js, GSAP, Lenis, React, Astro'])
        .join('\n'),
      links: [section('Who’s building', 'about')],
    };
  }

  if (/\b(how many|count|list|all|every)\b/.test(q)) {
    return {
      text: `${counts.worlds} worlds, ${counts.clients} clients, ${counts.studies} studies and ${projects.length} websites.`,
      links: [section('Worlds', 'worlds'), section('Clients', 'clients'), section('Library', 'library'), section('Websites', 'shelf')],
    };
  }

  if (/\b(clients?' sites|for clients|client sites|client websites)\b/.test(q)) {
    const ps = projects.filter((p) => p.kind === 'Client');
    return { text: bullet(ps.map((p) => `${p.title}: ${p.line}`)), links: ps.map(site) };
  }

  const scored = INDEX.map(({ p, bag, aliases }) => ({
    p,
    score: ws.reduce((s, w) => s + (aliases.has(w) ? 3 : 0) + (bag.has(w) ? 1 : 0) + (p.title.toLowerCase().includes(w) ? 4 : 0), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return {
      text: 'I couldn’t match that to anything here. Try the 3D worlds, the clients, the library of studies, a website, commissions, or the résumé.',
      links: [section('Worlds', 'worlds'), section('Clients', 'clients'), resume],
    };
  }

  const best = scored[0].p;
  const also = scored.slice(1, 3).filter((x) => x.score >= scored[0].score * 0.6).map((x) => x.p);
  return {
    text: `${best.title}: ${best.line}\n\n${best.story.idea}${also.length ? `\n\nAlso relevant: ${also.map((a) => a.title).join(' and ')}.` : ''}`,
    links: [best, ...also].map(site),
  };
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
    const links = (data.slugs ?? []).flatMap((s) => {
      const p = projects.find((x) => x.slug === s);
      return p ? [site(p)] : [];
    });
    return { text: data.reply, links };
  } catch {
    return answerLocally(question);
  }
}

export const usesModel = Boolean(import.meta.env.VITE_ASK_ENDPOINT);
