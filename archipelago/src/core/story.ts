import * as THREE from 'three';
import type { Key } from './voyage';
import { LAYOUT, type IslandId } from '../world/archipelago';
import { LIGHTHOUSE, SEA_Y } from '../world/finale';

export interface Beat {
  id: string;
  from: number; to: number;
  island?: IslandId | 'map' | 'lighthouse' | 'hero' | 'transit';
  works?: string[];
  pull?: string;
  hint?: string;
  snap?: number;           // vh to soft-snap to
}

export const TOTAL = 2000;

export const BEATS: Beat[] = [
  { id: 'hero', from: 0, to: 100, island: 'hero', hint: 'Scroll to set sail' },
  { id: 'intro', from: 100, to: 180, island: 'transit', pull: 'Four islands, one night, and every piece of work I have made, from the first render to the newest brand.' },
  { id: 'worlds', from: 180, to: 240, island: 'worlds', snap: 215 },
  { id: 'pond', from: 240, to: 290, island: 'worlds', works: ['koi'] },
  { id: 'pagoda', from: 290, to: 330, island: 'worlds', works: ['roman'] },
  { id: 'caves', from: 330, to: 365, island: 'worlds', works: ['caves'] },
  { id: 'gate', from: 365, to: 405, island: 'worlds', works: ['ringgate'] },
  { id: 'rotunda', from: 405, to: 440, island: 'worlds', works: ['rotunda'] },
  { id: 'shrine', from: 440, to: 470, island: 'worlds', works: ['fudo'] },
  { id: 'castle', from: 470, to: 505, island: 'worlds', works: ['castle'] },
  { id: 'archive', from: 505, to: 540, island: 'worlds', works: ['overgrown'] },
  { id: 'toMachines', from: 540, to: 580, island: 'transit', pull: 'Machines are worlds that move.' },
  { id: 'machines', from: 580, to: 620, island: 'machines', snap: 604 },
  { id: 'race', from: 620, to: 690, island: 'machines', works: ['hyperion', 'alpine'] },
  { id: 'turntable', from: 690, to: 735, island: 'machines', works: ['hyperion'] },
  { id: 'lift', from: 735, to: 760, island: 'machines', works: ['alpine'] },
  { id: 'frame', from: 760, to: 785, island: 'machines', works: ['coachwork'] },
  { id: 'hangar', from: 785, to: 860, island: 'machines', works: ['vanta', 'hyperion-case'] },
  { id: 'toMonuments', from: 860, to: 910, island: 'transit', pull: 'Stone remembers.' },
  { id: 'monuments', from: 910, to: 960, island: 'monuments', snap: 936 },
  { id: 'head', from: 960, to: 1030, island: 'monuments', works: ['parian'] },
  { id: 'halden', from: 1030, to: 1080, island: 'monuments', works: ['halden'] },
  { id: 'studies', from: 1080, to: 1120, island: 'monuments', works: ['sculpting', 'clock', 'extinguisher', 'interiors'] },
  { id: 'road', from: 1120, to: 1200, island: 'monuments', works: ['altair'] },
  { id: 'estate', from: 1200, to: 1232, island: 'monuments', works: ['altair'] },
  { id: 'toBrands', from: 1232, to: 1270, island: 'transit', pull: 'Brands are buildings. You climb them one floor at a time.' },
  { id: 'street', from: 1270, to: 1320, island: 'brands', works: ['gcburger', 'midea', 'investohome', 'three-houses', 'brand-systems', 'shelf-table'], snap: 1296 },
  { id: 'kerb', from: 1320, to: 1360, island: 'brands', works: ['kerb'] },
  { id: 'deccan', from: 1360, to: 1400, island: 'brands', works: ['deccan'] },
  { id: 'lotus', from: 1400, to: 1440, island: 'brands', works: ['lotus'] },
  { id: 'rem', from: 1440, to: 1480, island: 'brands', works: ['rem'] },
  { id: 'capq', from: 1480, to: 1525, island: 'brands', works: ['capq'] },
  { id: 'clay', from: 1525, to: 1565, island: 'brands', works: ['mitti', 'maruneta'] },
  { id: 'signal', from: 1565, to: 1625, island: 'brands', works: ['bsnl', 'rujuvu', 'kosh', 'lagrange'] },
  { id: 'magma', from: 1625, to: 1665, island: 'brands', works: ['magma'] },
  { id: 'crown', from: 1665, to: 1710, island: 'brands', works: ['s3', 'photon'] },
  { id: 'map', from: 1710, to: 1830, island: 'map', hint: 'Drag to chart · click to fly', snap: 1772 },
  { id: 'lighthouse', from: 1830, to: 1940, island: 'lighthouse' },
  { id: 'footer', from: 1940, to: 2000, island: 'lighthouse' },
];

/**
 * The story is authored in units (2000 in all). Scroll is mapped onto it in two kinds of
 * stretch: a dwell for every stop, where the camera rests on a work and scroll moves it
 * only gently, and the travel between stops. Dwells take a fixed amount of scroll however
 * short they are in the story, so no work goes by in a flick.
 */
export const DWELLS: [number, number][] = [
  [0, 40], [135, 150], [205, 225], [258, 280], [306, 322], [346, 358], [382, 398], [420, 434], [452, 464], [485, 499], [516, 524],
  [556, 566], [600, 608], [628, 648], [658, 666], [688, 692], [714, 730], [746, 756], [772, 782], [804, 808], [828, 832], [850, 854],
  [880, 890], [932, 940], [978, 1020], [1052, 1058], [1098, 1112], [1130, 1195], [1206, 1222], [1245, 1255],
  [1290, 1305], [1340, 1344], [1380, 1384], [1420, 1424], [1460, 1464], [1503, 1507], [1536, 1540], [1553, 1557], [1576, 1580], [1591, 1595], [1604, 1608], [1616, 1620],
  [1640, 1650], [1680, 1700], [1745, 1800], [1905, 1915], [1990, 2000],
];
const dwellScroll = (a: number, b: number) => Math.min(140, Math.max(60, (b - a) * 2.2));
const travelScroll = (gap: number) => Math.min(110, Math.max(28, gap * 0.8));
const KNOTS: [number, number][] = (() => {
  const k: [number, number][] = [[0, 0]]; let v = 0, sv = 0;
  for (const [a, b] of DWELLS) {
    if (a > v) { sv += travelScroll(a - v); k.push([a, sv]); }
    sv += dwellScroll(Math.max(a, v), b); k.push([b, sv]); v = b;
  }
  if (v < TOTAL) { sv += travelScroll(TOTAL - v); k.push([TOTAL, sv]); }
  return k;
})();
/** Each dwell in scroll units (vh), for snapping and stepping. */
export const DWELL_SCROLL = DWELLS.map(([a, b]) => ({ a, b, sa: 0, sb: 0 }));
export const SCROLL_TOTAL = KNOTS[KNOTS.length - 1][1];
export function storyFromScroll(sv: number) {
  for (let i = 0; i < KNOTS.length - 1; i++) { const [a, sa] = KNOTS[i], [b, sb] = KNOTS[i + 1]; if (sv <= sb) return a + (b - a) * Math.max(0, (sv - sa) / (sb - sa)); }
  return TOTAL + (sv - SCROLL_TOTAL);
}
export function scrollFromStory(v: number) {
  for (let i = 0; i < KNOTS.length - 1; i++) { const [a, sa] = KNOTS[i], [b, sb] = KNOTS[i + 1]; if (v <= b) return sa + (sb - sa) * Math.max(0, (v - a) / (b - a)); }
  return SCROLL_TOTAL;
}
for (const d of DWELL_SCROLL) { d.sa = scrollFromStory(d.a); d.sb = scrollFromStory(d.b); }
/** The stop a story position belongs to: inside a dwell, or the nearest one on either side. */
export function dwellAt(v: number) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < DWELLS.length; i++) { const [a, b] = DWELLS[i]; const d = v < a ? a - v : v > b ? v - b : 0; if (d < bd) { bd = d; best = i; } }
  return { i: best, inside: bd === 0 };
}

export function beatAt(vh: number) {
  for (const b of BEATS) if (vh >= b.from && vh < b.to) return b;
  return BEATS[BEATS.length - 1];
}

type Islands = Record<IslandId, { group: THREE.Object3D }>;

/**
 * Authors the camera keys from the built world. `dyn` carries the moving targets
 * (the cars, the road) so keys can follow them.
 */
export function buildKeys(islands: Islands, dyn: {
  cragView: (x: number, y: number, z: number) => THREE.Vector3; cragAt: (x: number, y: number, z: number) => THREE.Vector3;
  road: THREE.Curve<THREE.Vector3>; roadParent: THREE.Object3D;
  floors: { slug: string; view: THREE.Vector3; look: THREE.Vector3 }[]; towerRoot: THREE.Object3D;
  /** A point riding with the Hyperion on the circuit: metres behind, above and outside it. */
  chase: (back: number, lift: number, side: number) => THREE.Vector3;
  /** The Altair house at the end of the road: two camera marks and the point they look at. */
  estate: { view: () => THREE.Vector3; view2: () => THREE.Vector3; look: () => THREE.Vector3 };
}): Key[] {
  const W = (id: IslandId, x: number, y: number, z: number) => islands[id].group.localToWorld(new THREE.Vector3(x, y, z));
  const T = (v: THREE.Vector3) => dyn.towerRoot.localToWorld(v.clone());
  const axis = T(new THREE.Vector3(0, 0, 0));
  const fl = (slug: string) => dyn.floors.find((f) => f.slug === slug)!;
  const road = (t: number, lift = 3.2, back = 0) => () => { const p = dyn.road.getPointAt(THREE.MathUtils.clamp(t - back, 0, 1)); return dyn.roadParent.localToWorld(p.clone().add(new THREE.Vector3(0, lift, 0))); };
  const roadScrub = (a: number, b: number, vhA: number, vhB: number, lift: number, ahead: number) => {
    const keys: Key[] = [];
    for (let i = 0; i <= 6; i++) { const t = a + (b - a) * (i / 6); keys.push({ at: vhA + (vhB - vhA) * (i / 6), pos: road(t, lift), look: road(Math.min(1, t + ahead), lift * 0.4) }); }
    return keys;
  };
  const C = new THREE.Vector3(40, 100, 0);
  const lh = LIGHTHOUSE;

  const keys: Key[] = [
    // hero: the whole archipelago from high above the cloud sea
    { at: 0, pos: new THREE.Vector3(30, 300, 860), look: new THREE.Vector3(50, 92, -10), fov: 34 },
    { at: 60, pos: new THREE.Vector3(10, 280, 800), look: new THREE.Vector3(30, 92, -10), fov: 34 },
    { at: 140, pos: new THREE.Vector3(-150, 210, 640), look: W('worlds', 0, 10, 0), fov: 32 },
    // Worlds: one stop per work, each framed with its plate
    { at: 215, pos: W('worlds', 70, 64, 150), look: W('worlds', 0, 6, 4) },
    { at: 258, pos: W('worlds', 4, 19, 71), look: W('worlds', -12, 2.5, 20) },
    { at: 280, pos: W('worlds', -6, 15, 67), look: W('worlds', -18, 3, 22) },
    { at: 306, pos: W('worlds', 27, 12.5, 7), look: W('worlds', 2, 8, -30) },
    { at: 322, pos: W('worlds', 20, 10, -6), look: W('worlds', -2, 8, -32) },
    { at: 346, pos: W('worlds', -46, 10, 6), look: W('worlds', -80, 4, -9) },
    { at: 358, pos: W('worlds', -49, 9.5, 3), look: W('worlds', -82, 3.5, -10) },
    { at: 382, pos: W('worlds', 5, 17, 21), look: W('worlds', 62, 14, 38) },
    { at: 398, pos: W('worlds', 10, 15, 19), look: W('worlds', 62, 14, 38) },
    { at: 420, pos: W('worlds', 40, 9, 94), look: W('worlds', 32, 3.5, 64) },
    { at: 434, pos: W('worlds', 44, 8, 92), look: W('worlds', 32, 3.5, 64) },
    { at: 452, pos: W('worlds', -30, 8, 31), look: W('worlds', -55, 3.6, 23) },
    { at: 464, pos: W('worlds', -32, 7.5, 29), look: W('worlds', -56, 3.6, 22) },
    { at: 485, pos: dyn.cragView(54, 26, 30), look: dyn.cragAt(0, 14, 0) },
    { at: 499, pos: dyn.cragView(58, 22, 18), look: dyn.cragAt(0, 13, 0) },
    { at: 520, pos: W('worlds', 30, 9.5, -7), look: W('worlds', 72, 6, -46) },
    // transit along the light-falls to Machines
    { at: 560, pos: new THREE.Vector3(-30, 140, 380), look: W('machines', 0, 0, 0) },
    { at: 604, pos: W('machines', 6, 46, 92), look: W('machines', 0, 0, -4) },
    // the race: riding with the Hyperion, then a wide shot of both cars, then the pits
    { at: 630, pos: () => dyn.chase(10, 3.4, 3.5), look: () => dyn.chase(-9, 0.9, 0) },
    { at: 646, pos: () => dyn.chase(-13, 1.7, -3), look: () => dyn.chase(0, 0.8, 0) },
    { at: 662, pos: W('machines', 44, 18, 38), look: W('machines', 2, 1, 0) },
    { at: 690, pos: W('machines', 0, 16, 5), look: W('machines', 0, 1, -21) },
    { at: 714, pos: W('machines', -9.5, 4.4, -16), look: W('machines', -17, 1.1, -25.5) },
    { at: 730, pos: W('machines', -10.5, 3.8, -17.5), look: W('machines', -17, 1.0, -25.5) },
    { at: 746, pos: W('machines', 16.5, 5, -15.5), look: W('machines', 10, 2.2, -26) },
    { at: 756, pos: W('machines', 17, 4.6, -16.5), look: W('machines', 10, 2.2, -26) },
    { at: 772, pos: W('machines', -6.5, 4.5, 9), look: W('machines', -15, 1.3, 0) },
    { at: 782, pos: W('machines', -7, 4.2, 8), look: W('machines', -15, 1.3, 0) },
    { at: 806, pos: W('machines', -2, 5.5, -12), look: W('machines', -2, 3.2, -45) },
    { at: 830, pos: W('machines', -2, 3.0, -27), look: W('machines', -2, 2.2, -42) },
    { at: 852, pos: W('machines', -4.4, 2.8, -26.4), look: W('machines', -7.6, 2.2, -32.2) },
    // up and over to Monuments
    { at: 885, pos: new THREE.Vector3(80, 230, -40), look: W('monuments', 0, 10, 0) },
    { at: 936, pos: W('monuments', 40, 46, 70), look: W('monuments', 0, 10, -4) },
    { at: 978, pos: W('monuments', 6, 15, 28), look: W('monuments', 0, 13, -4) },
    { at: 1004, pos: W('monuments', -10, 15, 24), look: W('monuments', 0, 13, -4) },
    { at: 1020, pos: W('monuments', -13, 14, 21), look: W('monuments', 0, 13, -4) },
    { at: 1055, pos: W('monuments', 25, 4.4, 25), look: W('monuments', 9, 6.5, 5) },
    { at: 1098, pos: W('monuments', -4, 7.5, 7), look: W('monuments', -27, 5, 6) },
    { at: 1112, pos: W('monuments', -5, 7, 8), look: W('monuments', -27, 5, 6) },
    ...roadScrub(0.0, 0.92, 1130, 1195, 7, 0.08),
    // the house at the end of the drive
    { at: 1206, pos: dyn.estate.view, look: dyn.estate.look },
    { at: 1222, pos: dyn.estate.view2, look: dyn.estate.look },
    // the long glide to the tower
    { at: 1245, pos: new THREE.Vector3(260, 170, -110), look: T(new THREE.Vector3(0, 40, 0)) },
    { at: 1290, pos: T(fl('gcburger').view.clone().add(new THREE.Vector3(0, 3, 10))), look: T(fl('gcburger').look) },
  ];
  // the climb: every floor a stop, orbiting the tower between them
  const climb: [string, number][] = [['gcburger', 1305], ['kerb', 1342], ['deccan', 1382], ['lotus', 1422], ['rem', 1462], ['capq', 1505], ['mitti', 1538], ['maruneta', 1555], ['bsnl', 1578], ['rujuvu', 1593], ['kosh', 1606], ['lagrange', 1618]];
  for (const [slug, at] of climb) keys.push({ at, pos: T(fl(slug).view), look: T(fl(slug).look), orbit: { axis } });
  keys.push(
    // into the core and up the molten shaft
    { at: 1630, pos: T(new THREE.Vector3(0, 26, 0)), look: T(new THREE.Vector3(0.6, 60, 0.3)), fov: 52 },
    { at: 1660, pos: T(new THREE.Vector3(0, 118, 0)), look: T(new THREE.Vector3(0.5, 160, 0.2)), fov: 52 },
    { at: 1680, pos: T(new THREE.Vector3(30, 156, 42)), look: T(new THREE.Vector3(0, 147, 0)), fov: 34 },
    { at: 1700, pos: T(new THREE.Vector3(-40, 158, 30)), look: T(new THREE.Vector3(0, 144, 0)), fov: 34, orbit: { axis } },
    // the map: rise and flatten into an almost orthographic chart
    { at: 1745, pos: new THREE.Vector3(C.x, 4200, C.z + 30), look: new THREE.Vector3(C.x, 0, C.z), fov: 12 },
    { at: 1800, pos: new THREE.Vector3(C.x, 4200, C.z + 30), look: new THREE.Vector3(C.x, 0, C.z), fov: 12 },
    // dive through the cloud to the sea at dawn
    { at: 1855, pos: new THREE.Vector3(lh.x, SEA_Y + 90, lh.z + 520), look: new THREE.Vector3(lh.x, SEA_Y + 40, lh.z), fov: 32 },
    { at: 1910, pos: new THREE.Vector3(lh.x - 20, SEA_Y + 9, lh.z + 230), look: new THREE.Vector3(lh.x, SEA_Y + 34, lh.z - 120), fov: 32 },
    { at: 2000, pos: new THREE.Vector3(lh.x - 14, SEA_Y + 8, lh.z + 205), look: new THREE.Vector3(lh.x, SEA_Y + 38, lh.z - 140), fov: 32 },
  );
  return keys;
}

/** Where each island's rail pin sends you. */
export const RAIL: { id: string; label: string; vh: number }[] = [
  { id: 'worlds', label: 'Worlds', vh: 215 },
  { id: 'machines', label: 'Machines', vh: 604 },
  { id: 'monuments', label: 'Monuments', vh: 936 },
  { id: 'brands', label: 'Brands', vh: 1296 },
  { id: 'lighthouse', label: 'The lighthouse', vh: 1960 },
];

export { LAYOUT };
