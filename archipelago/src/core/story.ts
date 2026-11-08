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
  { id: 'worlds', from: 180, to: 260, island: 'worlds', snap: 222 },
  { id: 'pond', from: 260, to: 340, island: 'worlds', works: ['koi', 'roman', 'caves'] },
  { id: 'gate', from: 340, to: 420, island: 'worlds', works: ['ringgate', 'rotunda'] },
  { id: 'shrine', from: 420, to: 490, island: 'worlds', works: ['fudo', 'castle'] },
  { id: 'archive', from: 490, to: 540, island: 'worlds', works: ['overgrown'] },
  { id: 'toMachines', from: 540, to: 580, island: 'transit', pull: 'Machines are worlds that move.' },
  { id: 'machines', from: 580, to: 620, island: 'machines', snap: 604 },
  { id: 'race', from: 620, to: 700, island: 'machines', works: ['hyperion', 'alpine'] },
  { id: 'park', from: 700, to: 780, island: 'machines', works: ['hyperion', 'alpine', 'coachwork'] },
  { id: 'hangar', from: 780, to: 860, island: 'machines', works: ['vanta', 'hyperion-case'] },
  { id: 'toMonuments', from: 860, to: 910, island: 'transit', pull: 'Stone remembers.' },
  { id: 'monuments', from: 910, to: 960, island: 'monuments', snap: 936 },
  { id: 'head', from: 960, to: 1030, island: 'monuments', works: ['parian'] },
  { id: 'halden', from: 1030, to: 1080, island: 'monuments', works: ['halden'] },
  { id: 'studies', from: 1080, to: 1120, island: 'monuments', works: ['sculpting', 'clock', 'extinguisher', 'interiors'] },
  { id: 'road', from: 1120, to: 1210, island: 'monuments', works: ['altair'] },
  { id: 'toBrands', from: 1210, to: 1270, island: 'transit', pull: 'Brands are buildings. You climb them one floor at a time.' },
  { id: 'street', from: 1270, to: 1320, island: 'brands', works: ['gcburger', 'midea', 'investohome', 'three-houses', 'brand-systems', 'shelf-table'], snap: 1296 },
  { id: 'kerb', from: 1320, to: 1360, island: 'brands', works: ['kerb'] },
  { id: 'deccan', from: 1360, to: 1400, island: 'brands', works: ['deccan'] },
  { id: 'lotus', from: 1400, to: 1440, island: 'brands', works: ['lotus'] },
  { id: 'rem', from: 1440, to: 1480, island: 'brands', works: ['rem'] },
  { id: 'capq', from: 1480, to: 1525, island: 'brands', works: ['capq'] },
  { id: 'clay', from: 1525, to: 1565, island: 'brands', works: ['mitti', 'maruneta'] },
  { id: 'signal', from: 1565, to: 1625, island: 'brands', works: ['bsnl', 'rujuvu', 'kosh', 'lagrange'] },
  { id: 'magma', from: 1625, to: 1665, island: 'brands', works: ['magma'] },
  { id: 'crown', from: 1665, to: 1710, island: 'brands', works: ['photon'] },
  { id: 'map', from: 1710, to: 1830, island: 'map', hint: 'Drag to chart · click to fly', snap: 1772 },
  { id: 'lighthouse', from: 1830, to: 1940, island: 'lighthouse' },
  { id: 'footer', from: 1940, to: 2000, island: 'lighthouse' },
];

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
  carPos: () => THREE.Vector3; carAhead: () => THREE.Vector3;
  road: THREE.Curve<THREE.Vector3>; roadParent: THREE.Object3D;
  floors: { slug: string; view: THREE.Vector3; look: THREE.Vector3 }[]; towerRoot: THREE.Object3D;
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
    // Worlds
    { at: 222, pos: W('worlds', 70, 64, 150), look: W('worlds', 0, 6, 4) },
    { at: 290, pos: W('worlds', -2, 16, 84), look: W('worlds', -16, 3.5, 22) },
    { at: 320, pos: W('worlds', -14, 8.5, 60), look: W('worlds', -22, 4.6, 34) },
    { at: 372, pos: W('worlds', 38, 22, 116), look: W('worlds', 60, 14, 46) },
    { at: 405, pos: W('worlds', 84, 10, 98), look: W('worlds', 46, 8, 52) },
    { at: 448, pos: W('worlds', -24, 22, 58), look: W('worlds', -60, 10, 14) },
    { at: 472, pos: W('worlds', -40, 30, 20), look: W('worlds', -86, 26, -46) },
    { at: 510, pos: W('worlds', 30, 7, -12), look: W('worlds', 70, 5, -44) },
    // transit along the light-falls to Machines
    { at: 560, pos: new THREE.Vector3(-30, 140, 380), look: W('machines', 0, 0, 0) },
    { at: 604, pos: W('machines', 6, 46, 92), look: W('machines', 0, 0, -4) },
    // race: chase the Hyperion round the circuit
    { at: 640, pos: () => dyn.carPos(), look: () => dyn.carAhead() },
    { at: 680, pos: () => dyn.carPos(), look: () => dyn.carAhead() },
    // park: turntable, the lift, the Coachwork frame
    { at: 712, pos: W('machines', -10.5, 3.1, -17.5), look: W('machines', -17.5, 1.0, -25.5) },
    { at: 740, pos: W('machines', 15, 5.5, -13), look: W('machines', 10, 2.6, -26) },
    { at: 768, pos: W('machines', -6, 4.6, 10), look: W('machines', -15, 1.4, 0) },
    // the hangar
    { at: 800, pos: W('machines', -2, 5, -12), look: W('machines', -2, 3, -40) },
    { at: 840, pos: W('machines', -2, 3, -31), look: W('machines', -2, 2.4, -42) },
    // up and over to Monuments
    { at: 885, pos: new THREE.Vector3(80, 230, -40), look: W('monuments', 0, 10, 0) },
    { at: 936, pos: W('monuments', 40, 46, 70), look: W('monuments', 0, 10, -4) },
    { at: 985, pos: W('monuments', 6, 15, 26), look: W('monuments', 0, 13, -4) },
    { at: 1015, pos: W('monuments', -10, 15, 22), look: W('monuments', 0, 13, -4) },
    { at: 1055, pos: W('monuments', 25, 4.4, 25), look: W('monuments', 9, 6.5, 5) },
    { at: 1100, pos: W('monuments', -6, 6.5, 8), look: W('monuments', -26, 4, 6) },
    ...roadScrub(0.0, 0.92, 1130, 1195, 3.2, 0.06),
    { at: 1208, pos: () => road(1, 6)().add(new THREE.Vector3(0, 4, 0)), look: road(1, 10) },
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
    { at: 1680, pos: T(new THREE.Vector3(30, 150, 42)), look: T(new THREE.Vector3(0, 136, 0)), fov: 34 },
    { at: 1700, pos: T(new THREE.Vector3(-40, 156, 30)), look: T(new THREE.Vector3(0, 134, 0)), fov: 34, orbit: { axis } },
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
  { id: 'worlds', label: 'Worlds', vh: 222 },
  { id: 'machines', label: 'Machines', vh: 604 },
  { id: 'monuments', label: 'Monuments', vh: 936 },
  { id: 'brands', label: 'Brands', vh: 1296 },
  { id: 'lighthouse', label: 'The lighthouse', vh: 1960 },
];

export { LAYOUT };
