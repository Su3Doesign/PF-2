import data from './works.json';
import imgs from './images.json';

export type IslandKey = 'machines' | 'monuments' | 'worlds' | 'brands' | 'archive';
export interface Work {
  slug: string; island: IslandKey; title: string; line: string; year?: number; role?: string; tools?: string[];
  live?: string; repo?: string; voyage?: boolean; brief?: string; facts?: [string, string][]; client?: string;
  floor?: string; alt?: number; isNew?: boolean; concept?: boolean; note?: string;
}
export interface Images { cover: string | null; thumb: string | null; square?: string; gallery: { src: string; w: number; h: number }[] }

export const profile = data.profile;
export const islands = data.islands;
export const works = data.works as Work[];
export const images = imgs as Record<string, Images>;
export const bySlug = Object.fromEntries(works.map((w) => [w.slug, w])) as Record<string, Work>;
export const islandOf = (id: string) => islands.find((i) => i.id === id);
export const ISLAND_ORDER: IslandKey[] = ['worlds', 'machines', 'monuments', 'brands'];
/** "MACHINES — 01" style index within the island. */
export function indexOf(w: Work) {
  const list = works.filter((x) => x.island === w.island);
  return String(list.indexOf(w) + 1).padStart(2, '0');
}
export const base = import.meta.env.BASE_URL;
export const asset = (p: string) => `${base}${p}`;
