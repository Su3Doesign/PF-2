// Altair Estates: the house at the end of the drive, from the estate's own web model
// (world/house.glb in the Altair-Estates-The-Aether-Monolith repository). Cropped to the house
// and its stretch of sea cliff, the glass split into windows and the pool, decimated and
// meshopt-packed into public/models/altair.glb. Faces are welded without normals so they
// decimate, then normals are baked back with creases kept sharp. Parts keep their names (stone, glass, glow...),
// and the vertex colours carry the house's own palette.
//
//   ALTAIR_SRC=/path/to/house.glb node scripts/build-altair.mjs
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, quantize, reorder, meshopt } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import fs from 'node:fs';
import * as THREE from 'three';
import { toCreasedNormals, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import path from 'node:path';

await MeshoptSimplifier.ready; await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const SRC = process.env.ALTAIR_SRC || '/home/user/su3doesign/altair/world/house.glb';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(SRC);
const BOX = { x0: 40, x1: 215, z0: -150, z1: 115 };
const RATIO = { stone: 0.3, cliff: 0.22, glow: 0.35, metal: 0.5, rock: 0.4 };
const buckets = new Map();
const bucket = (k) => { if (!buckets.has(k)) buckets.set(k, { pos: [], nrm: [], col: [], idx: [] }); return buckets.get(k); };
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const part = node.getName().split('__')[1];
  if (!part || part === 'misc') continue;
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), C = prim.getAttribute('COLOR_0'), I = prim.getIndices();
    const p = [], n = [], c = [];
    for (let i = 0; i < P.getCount(); i++) { p.push(...P.getElement(i, [])); n.push(...N.getElement(i, [])); c.push(...C.getElement(i, []).slice(0, 3)); }
    const count = I ? I.getCount() : P.getCount();
    for (let t = 0; t < count; t += 3) {
      const a = I ? I.getScalar(t) : t, b = I ? I.getScalar(t + 1) : t + 1, d = I ? I.getScalar(t + 2) : t + 2;
      const cx = (p[a * 3] + p[b * 3] + p[d * 3]) / 3, cy = (p[a * 3 + 1] + p[b * 3 + 1] + p[d * 3 + 1]) / 3, cz = (p[a * 3 + 2] + p[b * 3 + 2] + p[d * 3 + 2]) / 3;
      if (cx < BOX.x0 || cx > BOX.x1 || cz < BOX.z0 || cz > BOX.z1) continue;
      if (part === 'lawn' && cy < 18) continue;          // the sea-level lawn is not the house's
      let k = part;
      if (part === 'glass') {
        // flat glass facing up is the pool; the rest are windows
        const ny = (n[a * 3 + 1] + n[b * 3 + 1] + n[d * 3 + 1]) / 3;
        if (Math.abs(ny) > 0.7) k = 'pool';
      }
      const B = bucket(k);
      for (const v of [a, b, d]) { B.idx.push(B.pos.length / 3); B.pos.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); B.nrm.push(n[v * 3], n[v * 3 + 1], n[v * 3 + 2]); B.col.push(c[v * 3], c[v * 3 + 1], c[v * 3 + 2]); }
    }
  }
}
const out = new Document(); const buf = out.createBuffer(); const scene = out.createScene(); const root = out.createNode('altair'); scene.addChild(root);
for (const [k, b] of buckets) {
  if (!b.idx.length) continue;
  const mat = out.createMaterial(k).setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.85).setMetallicFactor(0);
  const acc = (type, arr) => out.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const prim = out.createPrimitive().setMaterial(mat)
    .setAttribute('POSITION', acc('VEC3', new Float32Array(b.pos))).setAttribute('COLOR_0', acc('VEC3', new Float32Array(b.col)))
    .setIndices(acc('SCALAR', new Uint32Array(b.idx)));
  root.addChild(out.createNode(`altair__${k}`).setMesh(out.createMesh(k).addPrimitive(prim)));
}
await out.transform(weld({ tolerance: 0.002 }));
let before = 0, after = 0;
for (const mesh of out.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  before += prim.getIndices().getCount() / 3;
  const r = RATIO[mesh.getName()];
  if (r) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: r, error: 0.02, lockBorder: false });
  // the cliff is rough rock: topology does not matter, so it can go much further
  if (mesh.getName() === 'cliff') {
    const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
    const [out2] = MeshoptSimplifier.simplifySloppy(new Uint32Array(idx), new Float32Array(pos), 3, null, Math.floor(idx.length * 0.25 / 3) * 3, 0.02);
    prim.getIndices().setArray(new Uint32Array(out2));
  }
  after += prim.getIndices().getCount() / 3;
  console.log(mesh.getName().padEnd(8), prim.getIndices().getCount() / 3);
}
console.log('tris', Math.round(before), '->', Math.round(after));
// sharp-edged normals, baked: split vertices along creases (over ~35 degrees) and re-index, so
// walls read flat and the browser has nothing to rebuild
for (const mesh of out.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const g = new THREE.BufferGeometry();
  // read element by element: after weld and simplify the accessors are not plain xyz arrays
  const read = (acc, n) => { const out = new Float32Array(acc.getCount() * n), e = []; for (let i = 0; i < acc.getCount(); i++) { acc.getElement(i, e); for (let k = 0; k < n; k++) out[i * n + k] = e[k]; } return out; };
  const I = prim.getIndices(), ia = new Uint32Array(I.getCount()); for (let i = 0; i < ia.length; i++) ia[i] = I.getScalar(i);
  g.setAttribute('position', new THREE.BufferAttribute(read(prim.getAttribute('POSITION'), 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(read(prim.getAttribute('COLOR_0'), 3), 3));
  g.setIndex(new THREE.BufferAttribute(ia, 1));
  const c = mergeVertices(toCreasedNormals(g, 0.6), 1e-4);
  const acc = (type, arr) => out.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  prim.setAttribute('POSITION', acc('VEC3', new Float32Array(c.getAttribute('position').array)));
  prim.setAttribute('NORMAL', acc('VEC3', new Float32Array(c.getAttribute('normal').array)));
  prim.setAttribute('COLOR_0', acc('VEC3', new Float32Array(c.getAttribute('color').array)));
  prim.setIndices(acc('SCALAR', new Uint32Array(c.getIndex().array)));
  console.log(mesh.getName().padEnd(8), 'verts', c.getAttribute('position').count);
}
await out.transform(quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeColor: 8 }), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
const dst = path.resolve('public/models/altair.glb');
await io.write(dst, out);
console.log('altair.glb', (fs.statSync(dst).size / 1048576).toFixed(2), 'MB');
