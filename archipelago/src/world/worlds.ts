import * as THREE from 'three';
import { VPoint, VSpot } from './lights';
import { rng, G, makeNoise3 } from './shared';
import { std, glowMaterial, imageMaterial, marbleMaterial } from './materials';
import { makeArtefact, type Artefact } from './artefact';
import { loadModel, fitModel, loadTexture } from '../core/loaders';
import { TEXNOISE } from './noise';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createIsland } from './island';
import type { Island } from './island';
import type { Quality } from '../core/quality';
import images from '../data/images.json';

/**
 * 01 / Worlds. Every world here is a render first, so every work gets a framed plate set
 * into the island next to the thing it shows: the koi pond under a red bridge, the pagoda
 * at first light, a cave mouth glowing red, the Ring Gate (the real citadel mesh, in
 * Tirthavel's own sandstone and ivy) rising from a lagoon, the Flooded Rotunda's twelve
 * arches, the Fudō shrine with one candle, the Overgrown Archive's torii, and, on a crag
 * of its own, the real Castle on the Crag.
 */

const IMG = images as Record<string, { cover: string | null; thumb: string | null }>;

function waterMaterial(glow: THREE.ColorRepresentation, opts: { koi?: boolean; depthTint?: THREE.ColorRepresentation } = {}) {
  const u = {
    uTime: G.uTime, uChart: G.uChart, uDim: G.uDim,
    uGlow: { value: new THREE.Color(glow) },
    uDeep: { value: new THREE.Color(opts.depthTint ?? 0x02121a) },
    uFish: { value: Array.from({ length: 12 }, () => new THREE.Vector3(1e4, 0, 1e4)) },
    uStir: { value: 0 },
    uRipple: { value: new THREE.Vector4(0, 0, -100, 0) },
    tNoise: G.tNoise,
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: /* glsl */ `
      uniform float uTime, uChart, uDim, uStir; uniform vec3 uGlow, uDeep; uniform vec3 uFish[12]; uniform vec4 uRipple;
      varying vec3 vW; varying vec2 vUv;
      ${TEXNOISE}
      void main(){
        vec2 p = vW.xz * 0.25;
        // caustics: two warped layers of the noise texture
        float c1 = tn(p*0.11 + vec2(uTime*0.012, uTime*0.008));
        float c2 = tn(p*0.16 - vec2(uTime*0.009, -uTime*0.011) + c1*0.3);
        float caust = pow(1.0 - abs(c1 - c2) * 2.2, 6.0);
        float plankton = 0.0;
        ${opts.koi ? `for (int i=0;i<12;i++){ float d = length(vW.xz - uFish[i].xz); plankton += exp(-d*d*0.35); }` : ''}
        float rd = length(vW.xz - uRipple.xy); float rt = uTime - uRipple.z;
        float ring = rt > 0.0 && rt < 3.0 ? exp(-pow(rd - rt*4.0, 2.0)*1.5) * (1.0 - rt/3.0) : 0.0;
        vec3 col = uDeep + uGlow * (0.25 + caust*1.1 + plankton*0.9 + ring*1.5 + uStir*0.3);
        float edge = smoothstep(0.0, 0.08, vUv.x)*smoothstep(1.0,0.92,vUv.x)*smoothstep(0.0,0.08,vUv.y)*smoothstep(1.0,0.92,vUv.y);
        col = mix(col, vec3(0.02,0.026,0.055) + vec3(0.79,0.66,0.42)*caust*0.25, uChart);
        gl_FragColor = vec4(col * (1.0 - uDim*0.6), 0.92);
      }`,
    toneMapped: false,
  });
  return { mat, u };
}

/** A koi body: a tapered spindle with a tail fan, coloured per fish. */
function koiGeometry() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.16 * (1 - t * 0.55), t * 1.1 - 0.55)); }
  const g = new THREE.LatheGeometry(pts, 10); g.rotateX(Math.PI / 2); g.scale(1, 0.7, 1);
  return g;
}


export function createWorlds(island: Island, env: THREE.Texture, q: Quality) {
  const root = new THREE.Group(); root.name = 'worlds';
  island.group.add(root);
  const r = rng(9090); const n3 = makeNoise3(7);
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, x: number, y: number, z: number) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); anchors[name] = o; return o; };
  const artefacts: Artefact[] = [];
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();

  const wood = std(0x3a2219, 0.75, 0, { bump: 0.2, bumpScale: 3, tint: 0.2 });
  const lacquer = std(0x8a2216, 0.45, 0, { tint: 0.1 });
  const roofMat = std(0x1b1d22, 0.55, 0.2, { tint: 0.12 });
  const stoneMat = std(0x5d5a53, 0.9, 0, { bump: 0.5, bumpScale: 0.8, tint: 0.3 });
  const moss = std(0x2a3a24, 0.95, 0, { bump: 0.3, bumpScale: 2, tint: 0.35 });
  const lanternMat = glowMaterial(0xffa04a, 3.2);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0d14, roughness: 0.25, metalness: 0.6, clearcoat: 1, envMap: env, envMapIntensity: 0.6 });

  /** A plate: the work's render, framed and standing on the island, joined by a gold post. */
  const plate = (slug: string, x: number, z: number, rotY: number, w = 7.2, y = 1.2) => {
    const img = IMG[slug]; if (!img?.cover) return null;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; root.add(g);
    const h = w * 0.625;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.36, h + 0.36, 0.22), frameMat); frame.position.y = y + h / 2; g.add(frame);
    const { mat } = imageMaterial(loadTexture(img.cover), 1.18);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); pic.position.set(0, y + h / 2, 0.12); g.add(pic);
    for (const sx of [-w * 0.35, w * 0.35]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, y + 0.1), glowMaterial(0xc9a86a, 1.4)).translateX(sx).translateY((y + 0.1) / 2));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.04, 0.04), glowMaterial(0xc9a86a, 2.2)).translateY(y - 0.12).translateZ(0.12));
    artefacts.push(makeArtefact(slug, frame, root, 1.05, 0.5));
    return g;
  };

  // ---- the koi pond
  const POND = new THREE.Vector3(-6, 0.05, 10);
  const pondShape = new THREE.Shape();
  for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; const rr = 15 + n3.noise(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0) * 6; const x = Math.cos(a) * rr * 1.3, y = Math.sin(a) * rr; i === 0 ? pondShape.moveTo(x, y) : pondShape.lineTo(x, y); }
  const pondGeo = new THREE.ShapeGeometry(pondShape, 24).rotateX(-Math.PI / 2);
  pondGeo.computeBoundingBox(); const bb = pondGeo.boundingBox!; const pu = pondGeo.getAttribute('uv') as THREE.BufferAttribute; const pp = pondGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pp.count; i++) pu.setXY(i, (pp.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pp.getZ(i) - bb.min.z) / (bb.max.z - bb.min.z));
  const koiWater = waterMaterial(0x3fe0c5, { koi: true });
  const pond = new THREE.Mesh(pondGeo, koiWater.mat); pond.position.copy(POND); pond.renderOrder = 2; root.add(pond);
  const rimStones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), stoneMat, 70);
  for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2; const rr = 15 + n3.noise(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0) * 6 + 0.6; v.set(POND.x + Math.cos(a) * rr * 1.3, 0.15, POND.z + Math.sin(a) * rr); const s = 0.7 + r() * 1.2; rimStones.setMatrixAt(i, m4.compose(v, qt.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), sc.set(s * 1.3, s * 0.55, s))); }
  root.add(rimStones);
  const pondLight = new VPoint(0x3fe0c5, 700, 46, 1.5); pondLight.position.set(POND.x, 2, POND.z); root.add(pondLight);
  anchor('pond', POND.x, 1, POND.z);
  // a red arched bridge across the narrow end
  const bridge = new THREE.Group(); bridge.position.set(POND.x + 6, 0, POND.z - 2); bridge.rotation.y = 0.35; root.add(bridge);
  const arc = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => { const t = i / 8; return new THREE.Vector3(-12 + t * 24, Math.sin(t * Math.PI) * 2.6 + 0.3, 0); }));
  for (const z of [-1.3, 1.3]) { const rail = new THREE.Mesh(new THREE.TubeGeometry(arc.clone(), 40, 0.09, 6, false), lacquer); rail.position.set(0, 1.1, z); bridge.add(rail); }
  for (let i = 0; i <= 12; i++) { const t = i / 12; const p = arc.getPointAt(t); for (const z of [-1.3, 1.3]) bridge.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.16), lacquer).translateX(p.x).translateY(p.y + 0.55).translateZ(z)); }
  const deckGeo = new THREE.BufferGeometry(); const dp: number[] = [], di: number[] = [];
  for (let i = 0; i <= 40; i++) { const p = arc.getPointAt(i / 40); dp.push(p.x, p.y, -1.35, p.x, p.y, 1.35); if (i < 40) { const k = i * 2; di.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); deckGeo.setIndex(di); deckGeo.computeVertexNormals();
  bridge.add(new THREE.Mesh(deckGeo, std(0x4a2a1c, 0.7, 0, { contour: 0 })));
  // koi: two colourways and the golden one that only comes when fed
  const koiGeo = koiGeometry();
  const koiMats = [std(0xf2efe8, 0.4, 0, { contour: 0 }), std(0xe0461f, 0.4, 0, { contour: 0 }), std(0xf0f0f0, 0.4, 0, { contour: 0 })];
  const goldKoiMat = new THREE.MeshStandardMaterial({ color: 0xffc24a, emissive: 0xffb02e, emissiveIntensity: 2.5, roughness: 0.3, metalness: 0.6 });
  const koi: { m: THREE.Mesh; a: number; rr: number; sp: number; ph: number }[] = [];
  for (let i = 0; i < 13; i++) {
    const m = new THREE.Mesh(koiGeo, i === 12 ? goldKoiMat : koiMats[i % 3]);
    m.scale.setScalar(2.1 + r() * 0.6); m.visible = i < 12;
    root.add(m); koi.push({ m, a: r() * 6.28, rr: 4 + r() * 9, sp: 0.18 + r() * 0.2, ph: r() * 10 });
  }
  plate('koi', -27, 33, 0.72);
  // stone lanterns round the pond, lit
  const toro = (x: number, z: number, s = 1) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); root.add(t);
    t.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.4, 6), stoneMat).translateY(0.2));
    t.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 6), stoneMat).translateY(1.1));
    t.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), glowMaterial(0xffb45a, 2.2)).translateY(2.15));
    t.add(new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4).rotateY(Math.PI / 4), stoneMat).translateY(2.8));
  };
  [[-30, 0], [18, 22], [10, -10], [-20, -12], [-38, 22]].forEach(([x, z]) => toro(x, z));

  // ---- the temple hall and the pagoda behind the pond (Rōman no Yoake)
  const roofGeo = (w: number, d: number, h: number, curve: number) => {
    const g = new THREE.PlaneGeometry(1, 1, 24, 24); const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i); const e = Math.max(Math.abs(x), Math.abs(y)) * 2;
      const lift = Math.pow(Math.abs(x * 2) * Math.abs(y * 2), 4) * curve * 1.4;
      p.setXYZ(i, x * w, h * (1 - e) - curve * Math.pow(e, 3) + lift, y * d);
    }
    g.computeVertexNormals(); return g;
  };
  const TEMPLE = new THREE.Vector3(-30, 0, -20);
  const temple = new THREE.Group(); temple.position.copy(TEMPLE); temple.rotation.y = 0.5; root.add(temple);
  temple.add(new THREE.Mesh(new THREE.BoxGeometry(21, 1.4, 15), stoneMat).translateY(0.7));
  for (let k = 0; k < 4; k++) temple.add(new THREE.Mesh(new THREE.BoxGeometry(8 - k * 0.6, 0.3, 1.2), stoneMat).translateY(0.15 + k * 0.32).translateZ(8.4 - k * 0.5));
  for (const x of [-8, -4, 0, 4, 8]) for (const z of [-5.5, 5.5]) temple.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 6, 10), lacquer).translateX(x).translateY(4.4).translateZ(z));
  temple.add(new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 12), wood).translateY(7.4));
  const wall = new THREE.Mesh(new THREE.BoxGeometry(17, 5.2, 10), new THREE.MeshStandardMaterial({ color: 0x2b1810, emissive: 0xff8a3a, emissiveIntensity: 0.18, roughness: 0.9 }));
  wall.position.y = 4.2; temple.add(wall);
  for (const x of [-6, -2, 2, 6]) {
    temple.add(new THREE.Mesh(new THREE.PlaneGeometry(3, 3.4), glowMaterial(0xffb46a, 1.4)).translateX(x).translateY(4).translateZ(5.02));
    for (let k = 1; k < 4; k++) temple.add(new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 0.05), wood).translateX(x).translateY(2.3 + k * 0.85).translateZ(5.05));
  }
  const roof1 = new THREE.Mesh(roofGeo(27, 20, 4.6, 1.3), roofMat); roof1.material.side = THREE.DoubleSide; roof1.position.y = 7.6; temple.add(roof1);
  const roof1b = new THREE.Mesh(roofGeo(14, 9.5, 2.4, 0.7), roofMat); roof1b.position.y = 12.6; temple.add(roof1b);
  temple.add(new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.4, 0.5), roofMat).translateY(15.0));
  const lanternGeo = new THREE.SphereGeometry(0.55, 12, 8); lanternGeo.scale(1, 1.3, 1);
  const lanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, 14);
  for (let i = 0; i < 14; i++) { const t = i / 13; v.set(-11 + t * 22, 6.4, 9.6 + Math.sin(t * Math.PI) * 0.2); lanterns.setMatrixAt(i, m4.compose(v, qt.identity(), sc.set(1, 1, 1))); }
  temple.add(lanterns);
  const templeLight = new VPoint(0xff9a4a, 600, 40, 1.5); templeLight.position.set(0, 5, 10); temple.add(templeLight);
  anchor('temple', TEMPLE.x, 6, TEMPLE.z);

  const PAGODA = new THREE.Vector3(-8, 0, -36);
  const pagoda = new THREE.Group(); pagoda.position.copy(PAGODA); root.add(pagoda);
  pagoda.add(new THREE.Mesh(new THREE.BoxGeometry(11, 1.2, 11), stoneMat).translateY(0.6));
  let y = 1.2;
  for (let i = 0; i < 5; i++) {
    const w = 7.6 - i * 0.9, h = 3.6 - i * 0.2;
    pagoda.add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h, w * 0.72), i % 2 ? wood : lacquer).translateY(y + h / 2));
    const rf = new THREE.Mesh(roofGeo(w * 1.6, w * 1.6, 1.4, 0.7), roofMat); rf.position.y = y + h + 0.2; pagoda.add(rf);
    pagoda.add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.73, 0.5, w * 0.73), glowMaterial(0xffa04a, 0.8 + (i === 0 ? 0.6 : 0))).translateY(y + h * 0.55));
    y += h + 0.8;
  }
  const spireMat = std(0xc9a86a, 0.3, 1, { contour: 0 });
  pagoda.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 7, 8), spireMat).translateY(y + 3));
  for (let k = 0; k < 6; k++) pagoda.add(new THREE.Mesh(new THREE.TorusGeometry(0.42 - k * 0.04, 0.05, 6, 16).rotateX(Math.PI / 2), spireMat).translateY(y + 1 + k * 0.7));
  anchor('pagoda', PAGODA.x, y * 0.6, PAGODA.z);
  plate('roman', 9, -27, 0.48);

  // ---- maples, bushes and grass
  const crownGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    const blobs: [number, number, number, number][] = [[0, 0, 0, 2.4], [1.7, 0.4, 0.6, 1.7], [-1.5, 0.2, -0.8, 1.8], [0.3, 1.3, -1.2, 1.5], [-0.6, 0.9, 1.4, 1.5], [0.9, -0.6, -1.6, 1.3], [2.2, -0.4, -0.8, 1.1], [-2.0, -0.5, 0.9, 1.2]];
    for (const [x, yy, z, rr] of blobs) {
      const g = new THREE.IcosahedronGeometry(rr, 2); const p = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const d = 1 + n3.fbm(v.x * 0.9 + x, v.y * 0.9 + yy, v.z * 0.9 + z, 3) * 0.55; v.multiplyScalar(d); v.y *= 0.8; p.setXYZ(i, v.x + x, v.y + yy, v.z + z); }
      g.deleteAttribute('uv'); parts.push(g);
    }
    const merged = mergeVertices(mergeGeometries(parts)!, 0.01); merged.computeVertexNormals(); return merged;
  })();
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.5, 6, 6); trunkGeo.translate(0, 3, 0);
  const keepClear: [number, number, number][] = [[POND.x, POND.z, 26], [TEMPLE.x, TEMPLE.z, 16], [PAGODA.x, PAGODA.z, 10], [66, 38, 34], [40, 62, 14], [-56, 20, 9], [-85, -12, 14], [9, -27, 7], [-27, 33, 7], [40, 26, 7], [24, 74, 7], [-46, 34, 6],
    // camera stops: nothing grows where the lens stands
    [4, 71, 10], [-6, 67, 9], [27, 7, 7], [-46, 6, 8], [5, 21, 8], [10, 19, 6], [40, 94, 8], [-30, 31, 7], [30, -7, 8]];
  // and nothing grows across each stop's line of sight (camera to subject, in story order)
  const sight: [number, number, number, number][] = [[4, 71, -12, 20], [-6, 67, -18, 22], [27, 7, 2, -30], [-46, 6, -80, -9], [-49, 3, -82, -10], [5, 21, 62, 38], [10, 19, 62, 38], [40, 94, 32, 64], [-30, 31, -55, 23], [-32, 29, -56, 22], [30, -7, 72, -46]];
  const segD = (x: number, z: number, [ax, az, bx, bz]: [number, number, number, number]) => {
    const dx = bx - ax, dz = bz - az; const t = Math.max(0, Math.min(0.9, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - dx * t, z - az - dz * t);
  };
  const clear = (x: number, z: number, pad = 0) => keepClear.every(([cx, cz, rr]) => Math.hypot(x - cx, z - cz) > rr + pad) && sight.every((sg) => segD(x, z, sg) > 5 + pad);
  const NT = q.tier === 1 ? 26 : 40;
  const trunks = new THREE.InstancedMesh(trunkGeo, std(0x2c2a22, 1, 0, { bump: 0.5, bumpScale: 2 }), NT);
  const crowns = new THREE.InstancedMesh(crownGeo, std(0xffffff, 0.9, 0, { contour: 0, chartGlow: 0.3, bump: 0.6, bumpScale: 2.2, tint: 0.3 }), NT);
  const leafCols = [0x8a1f12, 0xb3361a, 0x6e2a10, 0x2e3d24, 0x3a4a2a, 0xa8551c, 0xc4762a];
  for (let i = 0, tries = 0; i < NT && tries < 2000; tries++) {
    const a = r() * Math.PI * 2, rr = 28 + r() * 62;
    const x = Math.cos(a) * rr * 1.1, z = Math.sin(a) * rr * 0.85;
    if (!clear(x, z, 3)) continue;
    const s = 0.7 + r() * 0.8;
    trunks.setMatrixAt(i, m4.compose(v.set(x, 0, z), qt.identity(), sc.set(s, s, s)));
    crowns.setMatrixAt(i, m4.compose(v.set(x, 6.6 * s, z), qt.setFromEuler(new THREE.Euler(r() * 0.4, r() * 6, r() * 0.4)), sc.set(s * (1 + r() * 0.4), s * 0.85, s * (1 + r() * 0.4))));
    crowns.setColorAt(i, new THREE.Color(leafCols[Math.floor(r() * leafCols.length)]));
    i++;
  }
  root.add(trunks, crowns);
  // grass tufts and moss mounds over the open ground
  const tuft = (() => { const parts: THREE.BufferGeometry[] = []; for (let k = 0; k < 5; k++) { const g = new THREE.ConeGeometry(0.06, 0.9 + k * 0.12, 3); g.translate(0, 0.45, 0); g.rotateZ((k - 2) * 0.22); g.rotateY(k * 1.3); parts.push(g); } return mergeGeometries(parts)!; })();
  const NG = q.tier === 1 ? 700 : 1600;
  const grass = new THREE.InstancedMesh(tuft, std(0xffffff, 0.95, 0, { contour: 0, chartGlow: 0 }), NG);
  const gcols = [0x2f4a2a, 0x3d5a30, 0x4a5e33, 0x5a5a2e];
  for (let i = 0, tries = 0; i < NG && tries < 8000; tries++) {
    const x = (r() - 0.5) * 210, z = (r() - 0.5) * 170;
    if ((x / 108) ** 2 + (z / 84) ** 2 > 0.92 || !clear(x, z, 0.5)) continue;
    const s = 0.6 + r() * 1.1;
    grass.setMatrixAt(i, m4.compose(v.set(x, 0, z), qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), sc.set(s, s * (0.7 + r() * 0.8), s)));
    grass.setColorAt(i, new THREE.Color(gcols[Math.floor(r() * gcols.length)]));
    i++;
  }
  root.add(grass);
  // fireflies over the pond
  const NF = 180, fpos = new Float32Array(NF * 3), fph = new Float32Array(NF);
  for (let i = 0; i < NF; i++) { const a = r() * 6.28, rr = r() * 26; fpos[i * 3] = POND.x + Math.cos(a) * rr * 1.2; fpos[i * 3 + 1] = 0.6 + r() * 4; fpos[i * 3 + 2] = POND.z + Math.sin(a) * rr; fph[i] = r() * 6.28; }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); fg.setAttribute('aPh', new THREE.BufferAttribute(fph, 1));
  const flies = new THREE.Points(fg, new THREE.ShaderMaterial({
    uniforms: { uTime: G.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'uniform float uTime; attribute float aPh; varying float vA; void main(){ vec3 p = position + vec3(sin(uTime*0.4+aPh)*1.5, sin(uTime*0.7+aPh*2.0)*0.6, cos(uTime*0.35+aPh)*1.5); vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; vA = pow(0.5+0.5*sin(uTime*2.0+aPh*3.0), 3.0); gl_PointSize = 220.0 / -mv.z; }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vec3(0.75,1.0,0.55)*smoothstep(0.5,0.0,d)*vA*1.6, 1.0); }',
  }));
  flies.frustumCulled = false; root.add(flies);

  // ---- Caves: a rock arch at the western edge, red light inside, flowers under a crack of sky
  const CAVE = new THREE.Vector3(-85, 0, -12);
  const cave = new THREE.Group(); cave.position.copy(CAVE); cave.rotation.y = Math.PI / 2 + 0.25; root.add(cave);
  const archGeo = new THREE.TorusGeometry(7, 3.4, 10, 28, Math.PI);
  const ap = archGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < ap.count; i++) { v.fromBufferAttribute(ap, i); const d = 1 + n3.fbm(v.x * 0.25, v.y * 0.25, v.z * 0.25, 3) * 0.35; ap.setXYZ(i, v.x * d, v.y * d, v.z * d * 1.6); }
  archGeo.computeVertexNormals();
  const caveRock = std(0x3b302b, 0.95, 0, { bump: 0.9, bumpScale: 0.6, tint: 0.3 });
  cave.add(new THREE.Mesh(archGeo, caveRock));
  const back = new THREE.Mesh(new THREE.SphereGeometry(8, 20, 14, 0, Math.PI), caveRock); back.scale.set(1, 1, 1.4); back.position.z = -2; back.rotation.y = Math.PI; back.material.side = THREE.DoubleSide; cave.add(back);
  const caveGlow = new VPoint(0xff3a1e, 420, 22, 1.4); caveGlow.position.set(0, 2.5, -4); cave.add(caveGlow);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 4), glowMaterial(0xff4a2a, 2.4), 40);
  for (let i = 0; i < 40; i++) flowers.setMatrixAt(i, m4.compose(v.set((r() - 0.5) * 8, 0.2 + r() * 0.3, -2 - r() * 5), qt.identity(), sc.set(1, 1, 1)));
  cave.add(flowers);
  anchor('cave', CAVE.x, 4, CAVE.z);
  plate('caves', -74, 4, 1.94);

  // ---- the Overgrown Archive: stepping stones and stone lanterns to a neon torii
  const PATH: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; PATH.push(new THREE.Vector3(28 + t * 44 + Math.sin(t * 9) * 3, 0.1, -22 - t * 22 + Math.cos(t * 7) * 2)); }
  const steps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 1, 0.25, 7), stoneMat, PATH.length);
  PATH.forEach((p, i) => steps.setMatrixAt(i, m4.compose(p, qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i), sc.set(1 + r() * 0.3, 1, 1))));
  root.add(steps);
  for (let i = 2; i < PATH.length; i += 4) {
    const p = PATH[i]; const t = new THREE.Group(); t.position.set(p.x + 2.4, 0, p.z + 1.2); root.add(t);
    t.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), stoneMat).translateY(0.9));
    t.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.1), glowMaterial(0x7af0d6, 1.6)).translateY(2.1));
    t.add(new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.7, 4).rotateY(Math.PI / 4), stoneMat).translateY(2.8));
  }
  const archiveLight = new VPoint(0x5fe8c8, 260, 40, 1.6); archiveLight.position.set(50, 4, -33); root.add(archiveLight);
  anchor('archive', 60, 3, -40);
  const torii = new THREE.Group(); torii.position.set(72, 0, -46); torii.rotation.y = -0.6; root.add(torii);
  const toriiMat = std(0xb3361a, 0.5);
  for (const x of [-3.4, 3.4]) torii.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 7.6, 10), toriiMat).translateX(x).translateY(3.8));
  torii.add(new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.55, 0.75), toriiMat).translateY(7.6));
  torii.add(new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.35, 0.5), toriiMat).translateY(6.5));
  torii.add(new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.06, 0.06), glowMaterial(0x2fe0c0, 4)).translateY(7.95));
  const overImg = IMG.overgrown;
  if (overImg?.cover) { const pic = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.9), imageMaterial(loadTexture(overImg.cover), 1.15).mat); pic.position.set(0, 3.6, -0.3); torii.add(pic); }
  artefacts.push(makeArtefact('overgrown', torii, root, 1.05, 0.4));

  // ---- Fudō shrine: one candle, a flaming halo, the render as the shrine's painting
  const FUDO = new THREE.Vector3(-56, 0, 20);
  const shrine = new THREE.Group(); shrine.position.copy(FUDO); shrine.rotation.y = 1.2; root.add(shrine);
  shrine.add(new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 9), stoneMat).translateY(0.4));
  for (const x of [-4, 4]) for (const z of [3.8, -3.8]) shrine.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.4, 0.6), wood).translateX(x).translateY(3.6).translateZ(z));
  shrine.add(new THREE.Mesh(new THREE.BoxGeometry(9.2, 6, 0.5), wood).translateY(3.6).translateZ(-4.0));
  const shrineRoof = new THREE.Mesh(roofGeo(13.5, 12.5, 2.8, 0.9), moss); shrineRoof.material.side = THREE.DoubleSide; shrineRoof.position.y = 7.0; shrine.add(shrineRoof);
  if (IMG.fudo?.cover) { const painting = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4), imageMaterial(loadTexture(IMG.fudo.cover), 1.1).mat); painting.position.set(0, 3.8, -3.7); shrine.add(painting); }
  const statue = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 1.6, 6, 12), std(0x2d332b, 0.8, 0, { bump: 0.6, bumpScale: 3 })); statue.position.set(0, 1.9, -1.4); shrine.add(statue);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 6, 40), glowMaterial(0xff6a2a, 2.4)); halo.position.set(0, 3.2, -1.8); shrine.add(halo);
  const candle = new VPoint(0xff8a3a, 140, 16, 1.6); candle.position.set(0, 1.6, 1.2); shrine.add(candle);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6).scale(1, 2.2, 1), glowMaterial(0xffc070, 6)); flame.position.set(0, 1.3, 1.2); shrine.add(flame);
  shrine.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8), glowMaterial(0xf3eadb, 1)).translateY(0.95).translateZ(1.2));
  anchor('fudo', FUDO.x, 3, FUDO.z);
  artefacts.push(makeArtefact('fudo', shrine, root, 1.0, 1.2));
  plate('fudo', -45, 36, 0.83, 6.4);

  // ---- the Ring Gate, the real citadel in a lagoon at the island's edge
  const GATE = new THREE.Vector3(66, 0, 38);
  const lagoonShape = new THREE.Shape();
  for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; const rr = 34 + n3.noise(Math.cos(a) * 1.4, Math.sin(a) * 1.4, 4) * 7; const x = Math.cos(a) * rr, yy = Math.sin(a) * rr; i === 0 ? lagoonShape.moveTo(x, yy) : lagoonShape.lineTo(x, yy); }
  const lagoonGeo = new THREE.ShapeGeometry(lagoonShape, 16).rotateX(-Math.PI / 2);
  lagoonGeo.computeBoundingBox(); { const b2 = lagoonGeo.boundingBox!; const u2 = lagoonGeo.getAttribute('uv') as THREE.BufferAttribute; const p2 = lagoonGeo.getAttribute('position') as THREE.BufferAttribute; for (let i = 0; i < p2.count; i++) u2.setXY(i, (p2.getX(i) - b2.min.x) / (b2.max.x - b2.min.x), (p2.getZ(i) - b2.min.z) / (b2.max.z - b2.min.z)); }
  const sea = waterMaterial(0x2a7f96, { depthTint: 0x020a12 });
  const lagoon = new THREE.Mesh(lagoonGeo, sea.mat); lagoon.position.copy(GATE).add(new THREE.Vector3(0, 0.22, 0)); root.add(lagoon);
  const gateLight = new VSpot(0xffc98a, 900, 110, 0.5, 0.6, 1.3); gateLight.position.set(GATE.x - 34, 36, GATE.z + 40); root.add(gateLight);
  const gateFill = new VPoint(0x8fb6ff, 260, 80, 1.5); gateFill.position.set(GATE.x + 30, 20, GATE.z - 20); root.add(gateFill);
  anchor('gate', GATE.x, 18, GATE.z);
  plate('ringgate', 40, 26, -1.41);

  // ---- the Flooded Rotunda: twelve arches, half-drowned, a marble keeper in the middle
  const ROT = new THREE.Vector3(36, 0, 64);
  const rot = new THREE.Group(); rot.position.copy(ROT); root.add(rot);
  const archShape = (() => { const s = new THREE.Shape(); s.moveTo(-1.6, 0); s.lineTo(-1.6, 3.4); s.absarc(0, 3.4, 1.6, Math.PI, 0, true); s.lineTo(1.6, 0); s.lineTo(1.1, 0); s.lineTo(1.1, 3.4); s.absarc(0, 3.4, 1.1, 0, Math.PI, false); s.lineTo(-1.1, 0); return new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false }); })();
  const rotStone = std(0xb7b09f, 0.85, 0, { bump: 0.5, bumpScale: 1.5, tint: 0.3 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const m = new THREE.Mesh(archShape, rotStone); m.position.set(Math.cos(a) * 7.5, -0.8, Math.sin(a) * 7.5); m.rotation.y = -a + Math.PI / 2; rot.add(m); }
  rot.add(new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.45, 6, 48).rotateX(Math.PI / 2), rotStone).translateY(5.5));
  // ivy strands hanging off the ring, cut-out leaf cards (the Ring Gate's own ivy texture)
  const ivyTex = loadTexture('tex/gate/ivy.png'); ivyTex.anisotropy = 4;
  const ivyMat = new THREE.MeshStandardMaterial({ map: ivyTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8, emissive: 0x1d2e0c, emissiveIntensity: 0.35 });
  const ivyGeo = new THREE.PlaneGeometry(1.5, 3.2); ivyGeo.translate(0, -1.6, 0);
  const NIVY = 34;
  const ivy = new THREE.InstancedMesh(ivyGeo, ivyMat, NIVY);
  for (let i = 0; i < NIVY; i++) {
    const a = (i + r() * 0.6) / NIVY * Math.PI * 2, rr = 8.05 + r() * 0.15, len = 0.7 + r() * 0.7;
    ivy.setMatrixAt(i, m4.compose(v.set(Math.cos(a) * rr, 5.85, Math.sin(a) * rr), qt.setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, (r() - 0.5) * 0.12)), sc.set(0.8 + r() * 0.5, len, 1)));
  }
  ivy.frustumCulled = false; rot.add(ivy);
  // a mossy crown along the top of the ring
  const leafTex = loadTexture('tex/gate/leaves.png');
  const crownMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8, emissive: 0x24360d, emissiveIntensity: 0.3 });
  const NCR = 40;
  const crownCards = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, 1.1), crownMat, NCR);
  for (let i = 0; i < NCR; i++) {
    const a = r() * Math.PI * 2, rr = 7.6 + (r() - 0.5) * 0.9;
    crownCards.setMatrixAt(i, m4.compose(v.set(Math.cos(a) * rr, 6.0 + r() * 0.3, Math.sin(a) * rr), qt.setFromEuler(new THREE.Euler(-1.1 + r() * 0.5, -a + Math.PI / 2 + (r() - 0.5), 0)), sc.setScalar(0.7 + r() * 0.6)));
  }
  crownCards.frustumCulled = false; rot.add(crownCards);
  const rotWater = waterMaterial(0x6fd19a, { depthTint: 0x03140d });
  const rotPool = new THREE.Mesh(new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2), rotWater.mat); rotPool.position.y = 0.6; rot.add(rotPool);
  const keeperMat = marbleMaterial({ scale: 1.2, crackBase: 0 });
  const keeper = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.6, 6, 12), keeperMat); keeper.position.y = 2.2; rot.add(keeper);
  const keeperHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), keeperMat); keeperHead.position.set(0, 4.2, 0); rot.add(keeperHead);
  const rotLight = new VPoint(0xbfe8c8, 240, 22, 1.6); rotLight.position.set(0, 7, 0); rot.add(rotLight);
  anchor('rotunda', ROT.x, 4, ROT.z);
  artefacts.push(makeArtefact('rotunda', rot, root, 1.0, 0.8));
  plate('rotunda', 24, 74, 0.67, 6.4);

  // ---- the Castle on the Crag: its own floating crag beside the island
  const crag = createIsland({ seed: 77, radius: 30, topColor: '#2a2c2c', rockColor: '#2c2d31', underColor: '#0e0e12', irregular: 0.3, detail: q.detail * 0.7, roots: 8, depth: 60 });
  crag.group.position.set(-345, 168, 6); crag.group.rotation.y = 0.9;
  island.group.parent!.add(crag.group); crag.group.updateMatrixWorld(true);
  const castleRoot = new THREE.Group(); crag.group.add(castleRoot);
  const castleLight = new VPoint(0xffc27a, 500, 70, 1.4); castleLight.position.set(0, 26, 14); crag.group.add(castleLight);
  const castleMoon = new VPoint(0x9fb7ff, 320, 90, 1.4); castleMoon.position.set(-30, 50, -20); crag.group.add(castleMoon);
  const castleAnchor = new THREE.Object3D(); castleAnchor.position.set(0, 14, 0); crag.group.add(castleAnchor); anchors.castle = castleAnchor;
  const castlePlate = (() => { const img = IMG.castle; if (!img?.cover) return; const g = new THREE.Group(); g.position.set(22, 0, 14); g.rotation.y = 1.11; crag.group.add(g); const fr = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.8, 0.22), frameMat); fr.position.y = 3.6; g.add(fr); const pic = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.5), imageMaterial(loadTexture(img.cover), 1.18).mat); pic.position.set(0, 3.6, 0.12); g.add(pic); })();
  void castlePlate;

  // ---- the real models: the Ring Gate citadel and the castle
  let gate: THREE.Object3D | null = null;
  const tex = (f: string, srgb = true) => { const t = loadTexture(`tex/gate/${f}`, srgb); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false; return t; };
  const ready = Promise.all([
    loadModel('gate').then((g) => {
      const sand = tex('sand.webp'), sandN = tex('sandN.webp', false), ashlar = tex('ashlar.webp'), ashlarN = tex('ashlarN.webp', false);
      const mats: Record<string, THREE.Material> = {
        stone: new THREE.MeshStandardMaterial({ map: sand, normalMap: sandN, color: new THREE.Color(0.95, 0.85, 0.74), roughness: 0.95, normalScale: new THREE.Vector2(1.2, 1.2) }),
        stone_light: new THREE.MeshStandardMaterial({ map: ashlar, normalMap: ashlarN, color: new THREE.Color(0.66, 0.62, 0.56), roughness: 0.9 }),
        paving: new THREE.MeshStandardMaterial({ map: ashlar, normalMap: ashlarN, color: new THREE.Color(0.5, 0.48, 0.45), roughness: 0.9 }),
        dark: new THREE.MeshStandardMaterial({ map: ashlar, color: new THREE.Color(0.2, 0.19, 0.18), roughness: 0.95 }),
        gold: new THREE.MeshStandardMaterial({ color: 0xd2a35c, metalness: 1, roughness: 0.32, envMap: env, emissive: 0x6a4a1a, emissiveIntensity: 0.6 }),
        bark: new THREE.MeshStandardMaterial({ map: tex('bark.webp'), roughness: 0.95 }),
        leaf_green: new THREE.MeshStandardMaterial({ map: tex('leaves.png'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, emissive: 0x31420f, emissiveIntensity: 0.25 }),
        leaf_ivy: new THREE.MeshStandardMaterial({ map: tex('ivy.png'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, emissive: 0x24360d, emissiveIntensity: 0.25 }),
      };
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const key = (m.name || m.parent?.name || '').replace(/[._]\d+$/, ''); m.material = mats[key] ?? mats.stone; });
      gate = fitModel(g.scene, 46);
      gate.position.copy(GATE).add(new THREE.Vector3(0, -12, 0));
      gate.rotation.y = -0.95;
      root.add(gate);
      artefacts.push(makeArtefact('ringgate', gate, root, 0.9, 1.2));
    }),
    loadModel('castle').then((g) => {
      const c = fitModel(g.scene, 58);
      c.position.set(0, -2.4, 0);
      castleRoot.add(c);
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.MeshStandardMaterial).name === 'Glass') { const mt = m.material as THREE.MeshStandardMaterial; mt.emissive.setRGB(1, 0.62, 0.3); mt.emissiveIntensity = 2.2; mt.toneMapped = false; } });
      artefacts.push(makeArtefact('castle', c, crag.group, 0.9, 1));
    }),
  ]).catch((e) => console.warn('worlds models', e));

  function update(s: { t: number; stir: number; feed: number; goldKoi: boolean; ripple?: THREE.Vector3 }) {
    for (let i = 0; i < koi.length; i++) {
      const k = koi[i];
      const a = k.a + s.t * k.sp * (1 + s.stir * 1.5);
      const rr = k.rr * (1 - s.feed * 0.6) + Math.sin(s.t * 0.3 + k.ph) * 1.5;
      const x = POND.x + Math.cos(a) * rr * 1.2, z = POND.z + Math.sin(a) * rr;
      k.m.position.set(x, POND.y - 0.25 + (i === 12 ? 0.15 : 0), z);
      k.m.rotation.set(0, -a, 0);
      k.m.rotateY(Math.sin(s.t * 3 + k.ph) * 0.18);
      if (i < 12) koiWater.u.uFish.value[i].set(x, 0, z).applyMatrix4(island.group.matrixWorld);
      if (i === 12) k.m.visible = s.goldKoi;
    }
    koiWater.u.uStir.value = s.stir;
    flame.scale.y = 2.2 + Math.sin(s.t * 13) * 0.25 + Math.sin(s.t * 7.3) * 0.2;
    candle.intensity = 140 + Math.sin(s.t * 11) * 18;
    rot.rotation.y = s.t * 0.05;
    if (s.ripple) koiWater.u.uRipple.value.set(s.ripple.x, s.ripple.z, s.t, 0);
  }
  return { root, anchors, artefacts, update, ready, koiWater, pond, getGate: () => gate, crag };
}
