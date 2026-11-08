import * as THREE from 'three';
import { patchMaterial, makeNoise3, rng } from './shared';

export interface IslandOpts {
  seed: number;
  radius: number;        // plateau radius, metres
  depth?: number;        // how far the underside hangs below the top
  irregular?: number;    // rim wobble, 0..1
  topColor: THREE.ColorRepresentation;
  rockColor: THREE.ColorRepresentation;
  underColor?: THREE.ColorRepresentation;
  flat?: number;         // radius fraction kept flat for building on
  detail?: number;       // tessellation multiplier
  stretch?: [number, number]; // x/z stretch of the plateau
  terraces?: number;     // quarry steps on the top (Monuments)
  roots?: number;
  bump?: number;
}

export interface Island {
  group: THREE.Group;
  radius: number;
  /** World-space rim point at angle a (radians), at plateau height. */
  rim(a: number, inset?: number): THREE.Vector3;
  /** Top surface height near (x,z) in island-local space. */
  heightAt(x: number, z: number): number;
  material: THREE.MeshStandardMaterial;
}

/**
 * A floating island: a flat plateau to build on, a rounded lip, a cliff band and a long
 * hanging underside with vertical ridges and a few roots. Built from one (angle, s)
 * lattice so it is watertight and cheap; ambient occlusion lives in the vertex colours.
 */
export function createIsland(o: IslandOpts): Island {
  const R = o.radius, D = o.depth ?? R * 1.15, irr = o.irregular ?? 0.35, flat = o.flat ?? 0.7;
  const [sx, sz] = o.stretch ?? [1, 1];
  const n = makeNoise3(o.seed); const rand = rng(o.seed * 7 + 3);
  const detail = o.detail ?? 1;
  const NA = Math.round(176 * detail), NS = Math.round(96 * detail);
  const rimF = (a: number) => 1 + irr * (0.55 * n.fbm(Math.cos(a) * 1.3 + 9, Math.sin(a) * 1.3, o.seed * 0.1, 3) + 0.18 * n.noise(Math.cos(a) * 4 + 3, Math.sin(a) * 4, 1.7));
  const top = new THREE.Color(o.topColor), rock = new THREE.Color(o.rockColor), under = new THREE.Color(o.underColor ?? o.rockColor);

  const pos = new Float32Array((NA + 1) * (NS + 1) * 3);
  const col = new Float32Array((NA + 1) * (NS + 1) * 3);
  const tmp = new THREE.Color();
  const sT = 0.4, sE = 0.47, sC = 0.6;
  for (let i = 0; i <= NA; i++) {
    const a = (i / NA) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const rf = rimF(a);
    for (let j = 0; j <= NS; j++) {
      const s = j / NS;
      let r: number, y: number, region: number;
      if (s <= sT) {
        const t = s / sT; r = R * rf * t; y = 0; region = 0;
        // gentle relief outside the flat core, terraces for quarries
        const edge = THREE.MathUtils.smoothstep(t, flat, 1);
        y += edge * (n.fbm(ca * r * 0.03, sa * r * 0.03, 2.1) * 2.2) - edge * edge * 1.2;
        if (o.terraces) { const k = Math.floor(t * o.terraces * 1.6) / (o.terraces * 1.6); y += (1 - k) * (o.terraces * 1.8) * THREE.MathUtils.smoothstep(t, 0.15, 0.95) - (o.terraces * 1.2); }
      } else if (s <= sE) {
        const t = (s - sT) / (sE - sT); r = R * rf * (1 + 0.025 * Math.sin(t * Math.PI)); y = -Math.pow(t, 1.6) * R * 0.08 - 1.2; region = 1;
      } else if (s <= sC) {
        const t = (s - sE) / (sC - sE); r = R * rf * (1.0 - 0.06 * t); y = -R * 0.08 - 1.2 - t * R * 0.26; region = 2;
      } else {
        const t = (s - sC) / (1 - sC); const shape = Math.pow(1 - t, 0.85);
        r = R * rf * 0.94 * shape * (1 - 0.15 * t);
        y = -R * 0.34 - 1.2 - Math.pow(t, 1.25) * (D - R * 0.34); region = 3;
      }
      // displacement: rocky, ridged on the underside
      let px = ca * r * sx, pz = sa * r * sz;
      if (region > 0) {
        const k = region === 3 ? 1 : 0.5;
        const ridge = 1 - Math.abs(n.noise(a * 7, y * 0.025, o.seed));
        const d = (n.fbm(px * 0.04, y * 0.04, pz * 0.04, 5) * 0.9 + ridge * 0.35) * R * 0.11 * k;
        const rr = Math.hypot(px, pz) || 1;
        px += (px / rr) * d; pz += (pz / rr) * d;
        y += n.noise(px * 0.05, y * 0.03, pz * 0.05) * R * 0.03 * k;
      }
      const idx = (i * (NS + 1) + j) * 3;
      pos[idx] = px; pos[idx + 1] = y; pos[idx + 2] = pz;
      // colour + baked occlusion
      if (region === 0) tmp.copy(top).lerp(rock, THREE.MathUtils.smoothstep(s / sT, 0.85, 1.0));
      else if (region === 3) tmp.copy(rock).lerp(under, Math.min(1, (s - sC) / (1 - sC) * 1.4));
      else tmp.copy(rock);
      const cav = n.fbm(px * 0.08, y * 0.08, pz * 0.08, 3);
      let ao = 1 - Math.max(0, -cav) * 1.1;
      if (region === 3) ao *= 0.55 + 0.45 * (1 - (s - sC) / (1 - sC));
      if (region === 1) ao *= 1.08;
      tmp.multiplyScalar(THREE.MathUtils.clamp(ao, 0.25, 1.15));
      col[idx] = tmp.r; col[idx + 1] = tmp.g; col[idx + 2] = tmp.b;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < NA; i++) for (let j = 0; j < NS; j++) {
    const a = i * (NS + 1) + j, b = (i + 1) * (NS + 1) + j;
    index.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  // weld the seam normals (first and last meridian share positions)
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
  for (let j = 0; j <= NS; j++) {
    const a = j, b = NA * (NS + 1) + j;
    const x = (nrm.getX(a) + nrm.getX(b)) / 2, y = (nrm.getY(a) + nrm.getY(b)) / 2, z = (nrm.getZ(a) + nrm.getZ(b)) / 2;
    nrm.setXYZ(a, x, y, z); nrm.setXYZ(b, x, y, z);
  }
  const material = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }), { bump: o.bump ?? 0.55, bumpScale: 0.16, tint: 0.3, contour: 5 });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'island-rock';
  const group = new THREE.Group();
  group.add(mesh);

  // hanging roots
  const roots = o.roots ?? 18;
  if (roots > 0) {
    const rootMat = patchMaterial(new THREE.MeshStandardMaterial({ color: under.clone().multiplyScalar(0.7), roughness: 1 }), { contour: 0, chartGlow: 0.2 });
    const rootGeos: THREE.BufferGeometry[] = [];
    for (let k = 0; k < roots; k++) {
      const a = rand() * Math.PI * 2; const rr = R * (0.55 + rand() * 0.35);
      const start = new THREE.Vector3(Math.cos(a) * rr * sx, -R * 0.36 - rand() * R * 0.3, Math.sin(a) * rr * sz);
      const len = 8 + rand() * R * 0.45;
      const pts = [start];
      for (let m = 1; m <= 6; m++) pts.push(start.clone().add(new THREE.Vector3((rand() - 0.5) * 3 * m * 0.4, -len * (m / 6), (rand() - 0.5) * 3 * m * 0.4)));
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, 16, 0.18 + rand() * 0.35, 5, false);
      // taper
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      for (let v = 0; v < p.count; v++) {
        const t = Math.floor(v / 6) / 16; const c = curve.getPointAt(Math.min(1, t));
        p.setXYZ(v, c.x + (p.getX(v) - c.x) * (1 - t * 0.9), p.getY(v), c.z + (p.getZ(v) - c.z) * (1 - t * 0.9));
      }
      g.deleteAttribute('uv');
      rootGeos.push(g);
    }
    const merged = mergeGeos(rootGeos);
    if (merged) { merged.computeVertexNormals(); group.add(new THREE.Mesh(merged, rootMat)); }
  }

  const rim = (a: number, inset = 0) => {
    const rf = rimF(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    const r = R * rf * (1 - inset);
    return new THREE.Vector3(Math.cos(a) * r * sx, -1.2, Math.sin(a) * r * sz).applyMatrix4(group.matrixWorld);
  };
  const heightAt = (_x: number, _z: number) => 0;
  return { group, radius: R, rim, heightAt, material };
}

export function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!geos.length) return null;
  let vc = 0, ic = 0;
  for (const g of geos) { vc += g.getAttribute('position').count; ic += g.index ? g.index.count : g.getAttribute('position').count; }
  const pos = new Float32Array(vc * 3); const idx = new Uint32Array(ic);
  const hasColor = geos.every((g) => g.getAttribute('color'));
  const col = hasColor ? new Float32Array(vc * 3) : null;
  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    pos.set(p.array as Float32Array, vo * 3);
    if (col) col.set((g.getAttribute('color') as THREE.BufferAttribute).array as Float32Array, vo * 3);
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; }
    else { for (let i = 0; i < p.count; i++) idx[io + i] = vo + i; io += p.count; }
    vo += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
