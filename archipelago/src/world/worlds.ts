import * as THREE from 'three';
import { rng, G, makeNoise3 } from './shared';
import { std, glowMaterial, imageMaterial, marbleMaterial } from './materials';
import { makeArtefact, type Artefact } from './artefact';
import { loadModel, fitModel, loadTexture } from '../core/loaders';
import { NOISE2 } from './glsl';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Island } from './island';
import type { Quality } from '../core/quality';
import images from '../data/images.json';

/**
 * 03 / Worlds. The biggest island: a pagoda and a temple hall with paper lanterns over a
 * koi pond lit from below (the Koi Pond rule: no light from above), twelve koi; the Ring
 * Gate standing in a sea pool cut into the island's edge, built from the real gate mesh;
 * the Flooded Rotunda's twelve arches half-drowned beside it; the castle on its own crag;
 * a forest path for the Overgrown Archive; and the Fudō shrine with one candle.
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
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: /* glsl */ `
      uniform float uTime, uChart, uDim, uStir; uniform vec3 uGlow, uDeep; uniform vec3 uFish[12]; uniform vec4 uRipple;
      varying vec3 vW; varying vec2 vUv;
      ${NOISE2}
      void main(){
        vec2 p = vW.xz * 0.25;
        // caustics: two warped layers of cellular-ish noise
        float c1 = fbm2(p*1.6 + vec2(uTime*0.08, uTime*0.05));
        float c2 = fbm2(p*2.3 - vec2(uTime*0.06, -uTime*0.07) + c1);
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

  const wood = std(0x3a2219, 0.75, 0, { bump: 0.2, bumpScale: 3, tint: 0.2 });
  const lacquer = std(0x7a1e14, 0.45, 0, { tint: 0.1 });
  const roofMat = std(0x1d1f24, 0.6, 0.2, { tint: 0.1 });
  const stoneMat = std(0x55524c, 0.9, 0, { bump: 0.6, bumpScale: 0.8, tint: 0.3 });
  const moss = std(0x223322, 0.95, 0, { bump: 0.3, bumpScale: 2, tint: 0.35 });
  const lanternMat = glowMaterial(0xffa04a, 3.2);

  // ---- the koi pond: an irregular basin at the island's heart
  const POND = new THREE.Vector3(-6, 0.05, 10);
  const pondShape = new THREE.Shape();
  for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; const rr = 15 + n3.noise(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0) * 6; const x = Math.cos(a) * rr * 1.3, y = Math.sin(a) * rr; i === 0 ? pondShape.moveTo(x, y) : pondShape.lineTo(x, y); }
  const pondGeo = new THREE.ShapeGeometry(pondShape, 24).rotateX(-Math.PI / 2);
  // uv for edge falloff: map bounds
  pondGeo.computeBoundingBox(); const bb = pondGeo.boundingBox!; const pu = pondGeo.getAttribute('uv') as THREE.BufferAttribute; const pp = pondGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pp.count; i++) pu.setXY(i, (pp.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pp.getZ(i) - bb.min.z) / (bb.max.z - bb.min.z));
  const koiWater = waterMaterial(0x3fe0c5, { koi: true });
  const pond = new THREE.Mesh(pondGeo, koiWater.mat); pond.position.copy(POND); pond.renderOrder = 2; root.add(pond);
  // rim stones
  const rimStones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), stoneMat, 60);
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; const rr = 15 + n3.noise(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0) * 6 + 0.6; v.set(POND.x + Math.cos(a) * rr * 1.3, 0.2, POND.z + Math.sin(a) * rr); const s = 0.8 + r() * 1.3; rimStones.setMatrixAt(i, m4.compose(v, qt.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), sc.set(s * 1.3, s * 0.6, s))); }
  root.add(rimStones);
  const pondLight = new THREE.PointLight(0x3fe0c5, 900, 46, 1.5); pondLight.position.set(POND.x, 2, POND.z); root.add(pondLight);
  anchor('pond', POND.x, 1, POND.z);
  // twelve koi (two colourways plus a golden one, hidden until fed)
  const koiGeo = koiGeometry();
  const koiMats = [std(0xf2efe8, 0.4, 0, { contour: 0 }), std(0xe0461f, 0.4, 0, { contour: 0 }), std(0xf0f0f0, 0.4, 0, { contour: 0 })];
  const goldKoiMat = new THREE.MeshStandardMaterial({ color: 0xffc24a, emissive: 0xffb02e, emissiveIntensity: 2.5, roughness: 0.3, metalness: 0.6 });
  const koi: { m: THREE.Mesh; a: number; rr: number; sp: number; ph: number }[] = [];
  for (let i = 0; i < 13; i++) {
    const m = new THREE.Mesh(koiGeo, i === 12 ? goldKoiMat : koiMats[i % 3]);
    m.scale.setScalar(2.1 + r() * 0.6); m.visible = i < 12;
    root.add(m); koi.push({ m, a: r() * 6.28, rr: 4 + r() * 9, sp: 0.18 + r() * 0.2, ph: r() * 10 });
  }

  // ---- the temple hall and the pagoda behind the pond
  const TEMPLE = new THREE.Vector3(-30, 0, -20);
  const temple = new THREE.Group(); temple.position.copy(TEMPLE); temple.rotation.y = 0.5; root.add(temple);
  temple.add(new THREE.Mesh(new THREE.BoxGeometry(20, 1.4, 14), stoneMat).translateY(0.7));
  for (const x of [-8, -4, 0, 4, 8]) for (const z of [-5.5, 5.5]) temple.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 6, 10), lacquer).translateX(x).translateY(4.4).translateZ(z));
  const wall = new THREE.Mesh(new THREE.BoxGeometry(17, 5.2, 10), new THREE.MeshStandardMaterial({ color: 0x2b1810, emissive: 0xff8a3a, emissiveIntensity: 0.22, roughness: 0.9 }));
  wall.position.y = 4.2; temple.add(wall);
  // shoji glow
  for (const x of [-6, -2, 2, 6]) temple.add(new THREE.Mesh(new THREE.PlaneGeometry(3, 3.4), glowMaterial(0xffb46a, 1.6)).translateX(x).translateY(4).translateZ(5.02));
  // the sweeping roof: a lathe-like hipped roof from a scaled pyramid with curved eaves
  const roofGeo = (w: number, d: number, h: number, curve: number) => {
    const g = new THREE.PlaneGeometry(1, 1, 24, 24); const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i); const e = Math.max(Math.abs(x), Math.abs(y)) * 2; // 0 centre .. 1 edge
      const yy = h * (1 - e) - curve * Math.pow(e, 3) + curve * Math.pow(Math.max(Math.abs(x) * 2, Math.abs(y) * 2) > 0.98 ? 1 : 0, 1) * 0;
      const lift = Math.pow(Math.abs(x * 2) * Math.abs(y * 2), 4) * curve * 1.4;
      p.setXYZ(i, x * w, yy + lift, y * d);
    }
    g.computeVertexNormals(); return g;
  };
  const roof1 = new THREE.Mesh(roofGeo(26, 19, 4.5, 1.2), roofMat); roof1.material.side = THREE.DoubleSide; roof1.position.y = 7.5; temple.add(roof1);
  const roof1b = new THREE.Mesh(roofGeo(13, 9, 2.2, 0.6), roofMat); roof1b.position.y = 12.4; temple.add(roof1b);
  // paper lanterns along the eaves
  const lanternGeo = new THREE.SphereGeometry(0.55, 12, 8); lanternGeo.scale(1, 1.3, 1);
  const lanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, 14);
  for (let i = 0; i < 14; i++) { const t = i / 13; v.set(-11 + t * 22, 6.6, 9.4 + Math.sin(t * Math.PI) * 0.2); lanterns.setMatrixAt(i, m4.compose(v, qt.identity(), sc.set(1, 1, 1))); }
  temple.add(lanterns);
  const templeLight = new THREE.PointLight(0xff9a4a, 700, 40, 1.5); templeLight.position.set(0, 5, 10); temple.add(templeLight);
  anchor('temple', TEMPLE.x, 6, TEMPLE.z);

  const PAGODA = new THREE.Vector3(-8, 0, -36);
  const pagoda = new THREE.Group(); pagoda.position.copy(PAGODA); root.add(pagoda);
  pagoda.add(new THREE.Mesh(new THREE.BoxGeometry(11, 1.2, 11), stoneMat).translateY(0.6));
  let y = 1.2;
  for (let i = 0; i < 5; i++) {
    const w = 7.6 - i * 0.9, h = 3.6 - i * 0.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h, w * 0.72), i % 2 ? wood : lacquer); body.position.y = y + h / 2; pagoda.add(body);
    const rf = new THREE.Mesh(roofGeo(w * 1.6, w * 1.6, 1.4, 0.7), roofMat); rf.position.y = y + h + 0.2; pagoda.add(rf);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.73, 0.5, w * 0.73), glowMaterial(0xffa04a, 0.8 + (i === 0 ? 0.6 : 0))); lamp.position.y = y + h * 0.55; pagoda.add(lamp);
    y += h + 0.8;
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 7, 8), std(0xc9a86a, 0.3, 1, { contour: 0 })); spire.position.y = y + 3; pagoda.add(spire);
  for (let k = 0; k < 6; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 - k * 0.04, 0.05, 6, 16).rotateX(Math.PI / 2), spire.material); ring.position.y = y + 1 + k * 0.7; pagoda.add(ring); }
  anchor('pagoda', PAGODA.x, y * 0.6, PAGODA.z);
  // a ficus breaking through, and moss
  const ficusMat = std(0x2c2a22, 1, 0, { bump: 0.5, bumpScale: 2 });

  // ---- maples: instanced trees with red-gold canopy spheres around the temple
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.5, 6, 6); trunkGeo.translate(0, 3, 0);
  // a canopy is several lumpy blobs merged, so it reads as foliage rather than a ball
  const crownGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    const blobs: [number, number, number, number][] = [[0, 0, 0, 2.4], [1.7, 0.4, 0.6, 1.7], [-1.5, 0.2, -0.8, 1.8], [0.3, 1.3, -1.2, 1.5], [-0.6, 0.9, 1.4, 1.5], [0.9, -0.6, -1.6, 1.3]];
    for (const [x, y, z, rr] of blobs) {
      const g = new THREE.IcosahedronGeometry(rr, 2); const p = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const d = 1 + n3.fbm(v.x * 0.9 + x, v.y * 0.9 + y, v.z * 0.9 + z, 3) * 0.55; v.multiplyScalar(d); v.y *= 0.8; p.setXYZ(i, v.x + x, v.y + y, v.z + z); }
      g.deleteAttribute('uv'); parts.push(g);
    }
    const merged = mergeVertices(mergeGeometries(parts)!, 0.01); merged.computeVertexNormals(); return merged;
  })();
  const NT = 34;
  const trunks = new THREE.InstancedMesh(trunkGeo, ficusMat, NT);
  const crowns = new THREE.InstancedMesh(crownGeo, std(0xffffff, 0.9, 0, { contour: 0, chartGlow: 0.3, bump: 0.8, bumpScale: 2.2, tint: 0.35 }), NT);
  const leafCols = [0x8a1f12, 0xb3361a, 0x6e2a10, 0x2e3d24, 0x3a4a2a, 0xa8551c];
  for (let i = 0; i < NT; i++) {
    let a = r() * Math.PI * 2, rr = 36 + r() * 40;
    const x = Math.cos(a) * rr * 1.15, z = Math.sin(a) * rr * 0.9;
    if (Math.hypot(x - POND.x, z - POND.z) < 22) { i--; continue; }
    const s = 0.7 + r() * 0.8;
    trunks.setMatrixAt(i, m4.compose(v.set(x, 0, z), qt.identity(), sc.set(s, s, s)));
    crowns.setMatrixAt(i, m4.compose(v.set(x, 6 * s + 0.6 * s, z), qt.setFromEuler(new THREE.Euler(r(), r(), r())), sc.set(s * (1 + r() * 0.4), s * 0.8, s * (1 + r() * 0.4))));
    crowns.setColorAt(i, new THREE.Color(leafCols[Math.floor(r() * leafCols.length)]));
  }
  root.add(trunks, crowns);

  // ---- the forest path of the Overgrown Archive: stepping stones and stone lanterns to the edge
  const PATH: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; PATH.push(new THREE.Vector3(28 + t * 44 + Math.sin(t * 9) * 3, 0.1, -22 - t * 22 + Math.cos(t * 7) * 2)); }
  const stepGeo = new THREE.CylinderGeometry(0.9, 1, 0.25, 7);
  const steps = new THREE.InstancedMesh(stepGeo, stoneMat, PATH.length);
  PATH.forEach((p, i) => steps.setMatrixAt(i, m4.compose(p, qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i), sc.set(1 + r() * 0.3, 1, 1))));
  root.add(steps);
  const toro = new THREE.Group();
  const toroGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
  for (let i = 2; i < PATH.length; i += 4) {
    const p = PATH[i]; const t = new THREE.Group(); t.position.set(p.x + 2.4, 0, p.z + 1.2);
    t.add(new THREE.Mesh(toroGeo, stoneMat).translateY(0.9));
    t.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.1), glowMaterial(0x7af0d6, 1.6)).translateY(2.1));
    t.add(new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.7, 4).rotateY(Math.PI / 4), stoneMat).translateY(2.8));
    toro.add(t);
  }
  root.add(toro);
  const archiveLight = new THREE.PointLight(0x5fe8c8, 260, 40, 1.6); archiveLight.position.set(50, 4, -33); root.add(archiveLight);
  anchor('archive', 50, 2, -33);
  const overgrownSign = makeSignPost('overgrown', new THREE.Vector3(70, 0, -44), root, -0.6);
  artefacts.push(makeArtefact('overgrown', overgrownSign, root, 1.1, 0.4));

  // ---- Fudō shrine: a small stone hall on the left, one candle, a flame and a statue in shadow
  const FUDO = new THREE.Vector3(-56, 0, 20);
  const shrine = new THREE.Group(); shrine.position.copy(FUDO); shrine.rotation.y = 1.2; root.add(shrine);
  shrine.add(new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 8), stoneMat).translateY(0.4));
  for (const x of [-3.6, 3.6]) shrine.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), wood).translateX(x).translateY(3.4).translateZ(3.4));
  shrine.add(new THREE.Mesh(new THREE.BoxGeometry(8.4, 6, 0.5), wood).translateY(3.4).translateZ(-3.6));
  const shrineRoof = new THREE.Mesh(roofGeo(12, 11, 2.6, 0.8), moss); shrineRoof.position.y = 6.6; shrine.add(shrineRoof);
  const statue = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.2, 6, 12), std(0x2d332b, 0.8, 0, { bump: 0.6, bumpScale: 3 })); statue.position.set(0, 2.4, -1.8); shrine.add(statue);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 6, 40), glowMaterial(0xff6a2a, 2.2)); halo.position.set(0, 3.8, -2.3); shrine.add(halo);
  const candle = new THREE.PointLight(0xff8a3a, 120, 14, 1.6); candle.position.set(0, 1.6, 0.5); shrine.add(candle);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6).scale(1, 2.2, 1), glowMaterial(0xffc070, 6)); flame.position.set(0, 1.3, 0.5); shrine.add(flame);
  anchor('fudo', FUDO.x, 3, FUDO.z);
  artefacts.push(makeArtefact('fudo', shrine, root, 1.0, 1.2));

  // ---- the Ring Gate stands in a sea pool cut into the far edge of the island
  const GATE = new THREE.Vector3(66, 0, 38);
  const seaGeo = new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2);
  const seaUv = seaGeo.getAttribute('uv') as THREE.BufferAttribute; void seaUv;
  const sea = waterMaterial(0x1d6f8a, { depthTint: 0x020a12 });
  const seaPool = new THREE.Mesh(seaGeo, sea.mat); seaPool.position.copy(GATE).add(new THREE.Vector3(0, 0.25, 0)); root.add(seaPool);
  const gateLight = new THREE.SpotLight(0xffc98a, 900, 90, 0.5, 0.6, 1.4); gateLight.position.set(GATE.x - 30, 40, GATE.z + 30); gateLight.target.position.copy(GATE).add(new THREE.Vector3(0, 14, 0)); root.add(gateLight, gateLight.target);
  anchor('gate', GATE.x, 16, GATE.z);
  // the Flooded Rotunda: twelve arches in a ring, half-drowned, a marble keeper in the middle
  const ROT = new THREE.Vector3(40, 0, 62);
  const rot = new THREE.Group(); rot.position.copy(ROT); root.add(rot);
  const arch = (() => { const s = new THREE.Shape(); s.moveTo(-1.6, 0); s.lineTo(-1.6, 3.4); s.absarc(0, 3.4, 1.6, Math.PI, 0, true); s.lineTo(1.6, 0); s.lineTo(1.1, 0); s.lineTo(1.1, 3.4); s.absarc(0, 3.4, 1.1, 0, Math.PI, false); s.lineTo(-1.1, 0); return new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false }); })();
  const rotStone = std(0xb7b09f, 0.85, 0, { bump: 0.5, bumpScale: 1.5, tint: 0.3 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const m = new THREE.Mesh(arch, rotStone); m.position.set(Math.cos(a) * 7.5, -0.8, Math.sin(a) * 7.5); m.rotation.y = -a + Math.PI / 2; rot.add(m); }
  rot.add(new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.45, 6, 48).rotateX(Math.PI / 2), rotStone).translateY(5.5));
  const rotWater = waterMaterial(0x6fd19a, { depthTint: 0x03140d });
  const rotPool = new THREE.Mesh(new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2), rotWater.mat); rotPool.position.y = 0.6; rot.add(rotPool);
  const keeper = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.6, 6, 12), marbleMaterial({ scale: 1.2, crackBase: 0 })); keeper.position.y = 2.2; rot.add(keeper);
  const keeperHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), keeper.material); keeperHead.position.set(0, 4.2, 0); rot.add(keeperHead);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.2, 22, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8f2d8).multiplyScalar(0.05), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  shaft.position.y = 11; void shaft;
  const rotLight = new THREE.PointLight(0xbfe8c8, 260, 22, 1.6); rotLight.position.set(0, 7, 0); rot.add(rotLight);
  anchor('rotunda', ROT.x, 4, ROT.z);
  artefacts.push(makeArtefact('rotunda', rot, root, 1.0, 0.8));

  // ---- the castle on its crag: a rock needle off the island's side with spires
  const CASTLE = new THREE.Vector3(-86, 0, -48);
  const crag = new THREE.Group(); crag.position.copy(CASTLE); root.add(crag);
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(9, 4, 60, 12, 12), std(0x3a3d42, 0.95, 0, { bump: 0.9, bumpScale: 0.5, tint: 0.3 }));
  const np = needle.geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < np.count; i++) { const x = np.getX(i), yv = np.getY(i), z = np.getZ(i); const d = 1 + n3.fbm(x * 0.15, yv * 0.08, z * 0.15, 3) * 0.6; np.setXYZ(i, x * d, yv, z * d); }
  needle.geometry.computeVertexNormals(); needle.position.y = -18; crag.add(needle);
  const castleStone = std(0x6b6a70, 0.85, 0, { bump: 0.3, bumpScale: 3, tint: 0.2 });
  const towers: [number, number, number, number][] = [[0, 0, 2.2, 16], [4, 3, 1.4, 11], [-4, 2, 1.5, 12], [2, -4, 1.2, 9], [-3, -3, 1.1, 10], [5.5, -1, 0.9, 8], [-6, 0, 0.9, 7.5]];
  for (const [x, z, rr, h] of towers) {
    crag.add(new THREE.Mesh(new THREE.CylinderGeometry(rr, rr * 1.08, h, 12), castleStone).translateX(x).translateY(12 + h / 2).translateZ(z));
    crag.add(new THREE.Mesh(new THREE.ConeGeometry(rr * 1.3, h * 0.45, 12), roofMat).translateX(x).translateY(12 + h + h * 0.22).translateZ(z));
    // lit windows
    for (let k = 0; k < 3; k++) crag.add(new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.7), glowMaterial(0xffc27a, 2.4)).translateX(x + Math.cos(k * 2) * rr * 1.01).translateY(12 + h * (0.4 + k * 0.15)).translateZ(z + Math.sin(k * 2) * rr * 1.01).rotateY(Math.PI / 2 - k * 2));
  }
  crag.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 9), castleStone).translateY(15));
  const castleLight = new THREE.PointLight(0xffc27a, 300, 40, 1.6); castleLight.position.set(0, 26, 6); crag.add(castleLight);
  anchor('castle', CASTLE.x, 24, CASTLE.z);
  artefacts.push(makeArtefact('castle', crag, root, 0.9, 1));

  // framed stills for the Roman, Koi and Caves pieces: three glass cards set on the terrace,
  // joined to the island by a gold line (the concept render's cards)
  const cards: { slug: string; mesh: THREE.Mesh; u: { uHover: { value: number } } }[] = [];
  const cardSlugs = ['roman', 'koi', 'caves'];
  cardSlugs.forEach((slug, i) => {
    const img = IMG[slug]; if (!img?.cover) return;
    const { mat, u } = imageMaterial(loadTexture(img.cover), 1.15);
    const g = new THREE.Group(); g.position.set(-30 + i * 7.6, 0, 33 + i * 1.6); g.rotation.y = 0.18; root.add(g);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.1, 0.15), new THREE.MeshPhysicalMaterial({ color: 0x0b0d14, roughness: 0.1, metalness: 0.2, clearcoat: 1 }));
    frame.position.y = 4.4; g.add(frame);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 3.69), mat); pic.position.set(0, 4.4, 0.09); g.add(pic);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4), glowMaterial(0xc9a86a, 1.6)); post.position.y = 1.2; g.add(post);
    cards.push({ slug, mesh: pic, u });
    artefacts.push(makeArtefact(slug, frame, root, 1.1, 0.4));
  });
  anchor('cards', -22, 4.4, 35);

  // ---- the real Ring Gate
  let gate: THREE.Object3D | null = null;
  const ready = loadModel('gate').then((g) => {
    const mats: Record<string, THREE.Material> = {
      stone: std(0x8c857a, 0.88, 0, { bump: 0.12, bumpScale: 0.8, tint: 0.2 }), stone_light: std(0xb5ab98, 0.85, 0, { tint: 0.2 }),
      bark: std(0x2b2018, 1), leaf_green: std(0x2f4a24, 0.95, 0, { contour: 0 }), leaf_ivy: std(0x26401f, 0.95, 0, { contour: 0 }),
      dark: std(0x101114, 0.8), gold: new THREE.MeshStandardMaterial({ color: 0xc9a86a, metalness: 1, roughness: 0.25, emissive: 0xc9a86a, emissiveIntensity: 0.6 }), paving: std(0x6e6a63, 0.9),
    };
    g.scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const key = (m.name || m.parent?.name || '').replace(/[._]\d+$/, ''); m.material = mats[key] ?? mats.stone; });
    gate = fitModel(g.scene, 34);
    gate.position.copy(GATE).add(new THREE.Vector3(0, -7, 0));
    gate.rotation.y = -0.7;
    root.add(gate);
    artefacts.push(makeArtefact('ringgate', gate, root, 0.9, 1.2));
  }).catch((e) => console.warn('gate', e));

  function update(s: { t: number; stir: number; feed: number; goldKoi: boolean; ripple?: THREE.Vector3 }) {
    for (let i = 0; i < koi.length; i++) {
      const k = koi[i];
      const a = k.a + s.t * k.sp * (1 + s.stir * 1.5);
      const rr = k.rr * (1 - s.feed * 0.6) + Math.sin(s.t * 0.3 + k.ph) * 1.5;
      const x = POND.x + Math.cos(a) * rr * 1.2, z = POND.z + Math.sin(a) * rr;
      k.m.position.set(x, POND.y - 0.25 + (i === 12 ? 0.15 : 0), z);
      k.m.rotation.set(0, -a, 0);
      k.m.rotateY(Math.sin(s.t * 3 + k.ph) * 0.18);
      if (i < 12) koiWater.u.uFish.value[i].set(x - 0, 0, z).applyMatrix4(island.group.matrixWorld);
      if (i === 12) k.m.visible = s.goldKoi;
    }
    koiWater.u.uStir.value = s.stir;
    flame.scale.y = 2.2 + Math.sin(s.t * 13) * 0.25 + Math.sin(s.t * 7.3) * 0.2;
    candle.intensity = 120 + Math.sin(s.t * 11) * 18;
    keeper.parent!.rotation.y = s.t * 0.05;
    if (s.ripple) koiWater.u.uRipple.value.set(s.ripple.x, s.ripple.z, s.t, 0);
  }
  return { root, anchors, artefacts, update, ready, koiWater, pond, getGate: () => gate, cards };
}

function makeSignPost(slug: string, pos: THREE.Vector3, parent: THREE.Object3D, rotY: number) {
  const img = IMG[slug];
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rotY; parent.add(g);
  const torii = std(0xb3361a, 0.5);
  for (const x of [-3, 3]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 7, 10), torii).translateX(x).translateY(3.5));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.5, 0.7), torii).translateY(7));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.35, 0.5), torii).translateY(6));
  // neon outline on the torii, as in PF-1
  const neon = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.06, 0.06), glowMaterial(0x2fe0c0, 4)); neon.position.y = 7.3; g.add(neon);
  if (img?.cover) {
    const { mat } = imageMaterial(loadTexture(img.cover), 1.1);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.5), mat); pic.position.set(0, 3.6, -0.2); g.add(pic);
  }
  return g;
}
