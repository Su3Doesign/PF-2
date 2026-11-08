// The Castle on the Crag: Sumanth's own castle (21 architecture pieces from the
// wizardingworld repository, converted from FBX with FBX2glTF) on its granite crags,
// merged by material, cropped and decimated for the web into public/models/castle.glb.
//
//   CASTLE_SRC=/path/to/converted/glbs node scripts/build-castle.mjs
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, quantize, reorder, meshopt } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

await MeshoptSimplifier.ready; await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const SRC = process.env.CASTLE_SRC;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const buckets = new Map(); // material -> { pos: number[], idx: number[] }
const bucket = (k) => { if (!buckets.has(k)) buckets.set(k, { pos: [], idx: [] }); return buckets.get(k); };
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.glb') && f !== 'test.glb');
const mul = (m, v) => [m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
for (const f of files) {
  const doc = await io.read(path.join(SRC, f));
  const terrain = f.includes('Terrain');
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const name = terrain ? 'Terrain' : (prim.getMaterial()?.getName() ?? 'Stone').replace(/^M_/, '').replace(/[._]\d+$/, '');
      const b = bucket(name); const base = b.pos.length / 3;
      const P = prim.getAttribute('POSITION'); const el = [];
      for (let i = 0; i < P.getCount(); i++) { P.getElement(i, el); b.pos.push(...mul(m, el)); }
      const I = prim.getIndices(); const n = I ? I.getCount() : P.getCount();
      for (let i = 0; i < n; i++) b.idx.push(base + (I ? I.getScalar(i) : i));
    }
  }
}
// castle bounds (without terrain), to crop the crags around it
const cb = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
for (const [k, b] of buckets) if (k !== 'Terrain') for (let i = 0; i < b.pos.length; i += 3) for (let a = 0; a < 3; a++) { cb.min[a] = Math.min(cb.min[a], b.pos[i + a]); cb.max[a] = Math.max(cb.max[a], b.pos[i + a]); }
console.log('castle bounds', cb.min.map(Math.round), cb.max.map(Math.round));
const t = buckets.get('Terrain');
if (t) {
  // a round crag: keep terrain within a circle round the castle, so an island rim can take the edge
  const ccx = (cb.min[0] + cb.max[0]) / 2, ccz = (cb.min[2] + cb.max[2]) / 2, R = Math.max(cb.max[0] - cb.min[0], cb.max[2] - cb.min[2]) * 0.56;
  const keep = [];
  for (let i = 0; i < t.idx.length; i += 3) {
    let cx = 0, cz = 0; for (let k = 0; k < 3; k++) { cx += t.pos[t.idx[i + k] * 3]; cz += t.pos[t.idx[i + k] * 3 + 2]; }
    cx /= 3; cz /= 3;
    if (Math.hypot(cx - ccx, cz - ccz) < R) keep.push(t.idx[i], t.idx[i + 1], t.idx[i + 2]);
  }
  console.log('crag radius', Math.round(R), 'centre', Math.round(ccx), Math.round(ccz));
  t.idx = keep;
}
const out = new Document(); const buf = out.createBuffer(); const scene = out.createScene(); const root = out.createNode('castle'); scene.addChild(root);
const COLORS = { CastleStone: [0.42, 0.41, 0.39], Trim: [0.55, 0.53, 0.49], Slate: [0.13, 0.15, 0.18], Lead: [0.2, 0.22, 0.24], Glass: [1, 0.72, 0.4], Wood: [0.24, 0.16, 0.11], Terrain: [0.24, 0.25, 0.24] };
for (const [k, b] of buckets) {
  if (!b.idx.length) continue;
  const mat = out.createMaterial(k).setBaseColorFactor([...(COLORS[k] ?? [0.4, 0.4, 0.4]), 1]).setRoughnessFactor(k === 'Glass' ? 0.3 : 0.9).setMetallicFactor(k === 'Lead' ? 0.4 : 0);
  if (k === 'Glass') mat.setEmissiveFactor([1, 0.62, 0.3]);
  const prim = out.createPrimitive().setMaterial(mat)
    .setAttribute('POSITION', out.createAccessor().setType('VEC3').setArray(new Float32Array(b.pos)).setBuffer(buf))
    .setIndices(out.createAccessor().setType('SCALAR').setArray(new Uint32Array(b.idx)).setBuffer(buf));
  root.addChild(out.createNode(k).setMesh(out.createMesh(k).addPrimitive(prim)));
  console.log(k, b.idx.length / 3, 'tris');
}
await out.transform(weld({ tolerance: 0.001 }));
for (const mesh of out.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const terrain = mesh.getName() === 'Terrain';
  simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: terrain ? 0.025 : 0.11, error: terrain ? 0.01 : 0.003, lockBorder: false });
}
// terrain decimates harder than the architecture
let tris = 0; for (const m of out.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount() / 3;
console.log('after simplify', Math.round(tris));
await out.transform(quantize({ quantizePosition: 14 }), reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
const dst = path.resolve('public/models/castle.glb');
await io.write(dst, out);
console.log('castle.glb', (fs.statSync(dst).size / 1048576).toFixed(2), 'MB');
