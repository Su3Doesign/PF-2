import * as THREE from 'three';
import { createIsland, type Island } from './island';
import { createFalls, type FallSpec } from './falls';
import type { Quality } from '../core/quality';

export type IslandId = 'machines' | 'monuments' | 'worlds' | 'brands';

/** Where each island hangs. The archipelago sits on a ring around the origin; the cloud sea is y = 0. */
export const LAYOUT: Record<IslandId, { pos: THREE.Vector3; radius: number; rotY: number }> = {
  worlds: { pos: new THREE.Vector3(-300, 96, 170), radius: 96, rotY: 0.3 },
  monuments: { pos: new THREE.Vector3(-40, 150, -270), radius: 64, rotY: -0.4 },
  machines: { pos: new THREE.Vector3(150, 82, 250), radius: 60, rotY: 0.15 },
  brands: { pos: new THREE.Vector3(400, 70, -40), radius: 46, rotY: -0.2 },
};

export interface Archipelago {
  islands: Record<IslandId, Island>;
  falls: ReturnType<typeof createFalls>;
  heroFall: ReturnType<typeof createFalls>;
  heroFallOrigin: THREE.Vector3;
  moon: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
}

export function createArchipelago(scene: THREE.Scene, q: Quality): Archipelago {
  const islands = {
    worlds: createIsland({ seed: 11, radius: LAYOUT.worlds.radius, topColor: '#253025', rockColor: '#2b2b30', underColor: '#101014', irregular: 0.42, stretch: [1.15, 0.9], detail: q.detail, roots: 26, depth: 120 }),
    monuments: createIsland({ seed: 23, radius: LAYOUT.monuments.radius, topColor: '#d8d2c6', rockColor: '#9d988f', underColor: '#3b3a3d', irregular: 0.3, terraces: 3, detail: q.detail, roots: 10, depth: 90, bump: 0.6 }),
    machines: createIsland({ seed: 37, radius: LAYOUT.machines.radius, topColor: '#1c1d22', rockColor: '#1d1e24', underColor: '#0b0c10', irregular: 0.28, stretch: [1.25, 0.85], flat: 0.82, detail: q.detail, roots: 14, depth: 85 }),
    brands: createIsland({ seed: 51, radius: LAYOUT.brands.radius, topColor: '#3c3c3f', rockColor: '#232328', underColor: '#0d0d11', irregular: 0.32, flat: 0.8, detail: q.detail, roots: 12, depth: 80 }),
  } as Record<IslandId, Island>;
  for (const id of Object.keys(islands) as IslandId[]) {
    const L = LAYOUT[id];
    const g = islands[id].group;
    g.position.copy(L.pos); g.rotation.y = L.rotY; g.name = `island-${id}`;
    g.updateMatrixWorld(true);
    scene.add(g);
  }

  // thin light-falls off every island's lip (eleven in all, as in the bible)
  const fallAngles: Record<IslandId, number[]> = { worlds: [0.6, 2.4, 3.9, 5.3], monuments: [1.2, 3.4, 5.0], machines: [0.4, 2.8], brands: [1.9, 4.4] };
  const specs: FallSpec[] = [];
  for (const id of Object.keys(fallAngles) as IslandId[]) {
    for (const a of fallAngles[id]) {
      const o = islands[id].rim(a, 0.02); const c = LAYOUT[id].pos;
      const out = new THREE.Vector3(o.x - c.x, 0, o.z - c.z).normalize();
      specs.push({ origin: o.add(new THREE.Vector3(0, 0.8, 0)), out, width: 2 + Math.random() * 3, count: q.falls });
    }
  }
  const falls = createFalls(specs);
  scene.add(falls.points);

  // the hero light-fall between Machines and Monuments (Beat 5)
  const ho = islands.machines.rim(Math.PI * 0.95 + 0.3, 0.0);
  const hc = LAYOUT.machines.pos;
  const heroFallOrigin = ho.clone();
  const heroFall = createFalls([{ origin: ho.add(new THREE.Vector3(0, 1, 0)), out: new THREE.Vector3(ho.x - hc.x, 0, ho.z - hc.z).normalize(), width: 22, count: q.heroFall }]);
  scene.add(heroFall.points);

  // light: a cold moon, a cooler rim from behind, an indigo sky bounce
  const moon = new THREE.DirectionalLight(0xa9bbec, 1.6);
  moon.position.set(450, 330, -830);
  scene.add(moon);
  const rimLight = new THREE.DirectionalLight(0x5a6fb0, 0.7);
  rimLight.position.set(500, 180, 600);
  scene.add(rimLight);
  const hemi = new THREE.HemisphereLight(0x22305c, 0x06060c, 0.55);
  scene.add(hemi);

  return { islands, falls, heroFall, heroFallOrigin, moon, rimLight, hemi };
}
