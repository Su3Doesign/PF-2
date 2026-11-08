import * as THREE from 'three';
import { patchMaterial, rng, makeNoise3 } from './shared';
import { makeArtefact, neonSign, textTexture, type Artefact } from './artefact';
import { loadModel, fitModel, mergeByMaterial, applyEnv } from '../core/loaders';
import type { Island } from './island';
import type { Quality } from '../core/quality';

/**
 * 01 / Machines. A basalt island with a banked circuit, a Möbius loop standing up in the
 * infield, and Hangar 7 cut into the rock. Hyperion GEN.2 and the Alpine F1 lap the
 * circuit with light trails, then park: Hyperion on a turntable under a ring light, the
 * F1 on a pit lift where it comes apart; the Koenigsegg from Coachwork sits in an
 * assembly frame, half shaded, half wireframe; the Vanta helmet waits inside the hangar.
 */

const STRAIGHT = 46, TURN_R = 15, WIDTH = 9;
const PERIM = 2 * STRAIGHT + 2 * Math.PI * TURN_R;

/** Stadium-shaped circuit, arc-length parameterised. u in [0,1). */
export function trackAt(u: number) {
  let s = (((u % 1) + 1) % 1) * PERIM;
  const h = STRAIGHT / 2;
  const p = new THREE.Vector3(); const t = new THREE.Vector3(); let bank = 0;
  if (s < STRAIGHT) { p.set(-h + s, 0, TURN_R); t.set(1, 0, 0); }
  else if ((s -= STRAIGHT) < Math.PI * TURN_R) { const a = s / TURN_R; p.set(h + Math.sin(a) * TURN_R, 0, Math.cos(a) * TURN_R); t.set(Math.cos(a), 0, -Math.sin(a)); bank = Math.sin(a) * 0.24; }
  else if ((s -= Math.PI * TURN_R) < STRAIGHT) { p.set(h - s, 0, -TURN_R); t.set(-1, 0, 0); }
  else { s -= STRAIGHT; const a = s / TURN_R; p.set(-h - Math.sin(a) * TURN_R, 0, -Math.cos(a) * TURN_R); t.set(-Math.cos(a), 0, Math.sin(a)); bank = Math.sin(a) * 0.24; }
  p.y = 0.35 + bank * 2.5;
  return { p, t, bank };
}

function laneTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 1024);
  g.fillStyle = '#fff'; g.fillRect(6, 0, 3, 1024); g.fillRect(119, 0, 3, 1024);
  g.fillStyle = '#ffd9a0'; for (let y = 0; y < 1024; y += 128) g.fillRect(62, y, 4, 70);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

function ribbon(n: number, at: (i: number) => { a: THREE.Vector3; b: THREE.Vector3 }, closed: boolean) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const { a, b } = at(i);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, i / n, 1, i / n);
    if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export interface MachinesState { p: number; race: number; park: number; explode: number; wire: number; speed: number; t: number }

export function createMachines(island: Island, env: THREE.Texture, q: Quality) {
  const root = new THREE.Group(); root.name = 'machines';
  island.group.add(root);
  const r = rng(707);
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, x: number, y: number, z: number) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); anchors[name] = o; return o; };

  // --- the circuit
  const N = 320;
  const asphalt = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x0f1013, roughness: 0.32, metalness: 0.1, emissive: 0xffffff, emissiveMap: laneTexture(), emissiveIntensity: 0.0 }), { bump: 0.08, bumpScale: 1.4, tint: 0.15, contour: 0 });
  asphalt.emissiveMap!.repeat.set(1, 7);
  const trackGeo = ribbon(N, (i) => {
    const { p, t, bank } = trackAt(i / N);
    const nrm = new THREE.Vector3(-t.z, 0, t.x);
    const a = p.clone().addScaledVector(nrm, -WIDTH / 2); const b = p.clone().addScaledVector(nrm, WIDTH / 2);
    a.y -= bank * WIDTH * 0.5; b.y += bank * WIDTH * 0.5;
    return { a, b };
  }, true);
  const track = new THREE.Mesh(trackGeo, asphalt);
  root.add(track);
  // lane lines glow on their own material so bloom picks them up
  const lanes = new THREE.Mesh(trackGeo, new THREE.MeshBasicMaterial({ map: asphalt.emissiveMap, color: new THREE.Color(0xe6cc93).multiplyScalar(1.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false }));
  root.add(lanes);
  // kerbs on the turns, and a low barrier with a light strip
  const kerbTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const g = c.getContext('2d')!; for (let y = 0; y < 64; y += 16) { g.fillStyle = '#c8302a'; g.fillRect(0, y, 8, 8); g.fillStyle = '#e8e2d6'; g.fillRect(0, y + 8, 8, 8); } const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t; })();
  kerbTex.repeat.set(1, 60);
  const kerb = new THREE.Mesh(ribbon(N, (i) => {
    const { p, t, bank } = trackAt(i / N); const nrm = new THREE.Vector3(-t.z, 0, t.x);
    const a = p.clone().addScaledVector(nrm, WIDTH / 2); const b = p.clone().addScaledVector(nrm, WIDTH / 2 + 1.1);
    a.y += bank * WIDTH * 0.5 + 0.02; b.y += bank * WIDTH * 0.5 + 0.1; return { a, b };
  }, true), new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.6 }));
  root.add(kerb);
  const barrier = new THREE.Mesh(ribbon(N, (i) => {
    const { p, t, bank } = trackAt(i / N); const nrm = new THREE.Vector3(-t.z, 0, t.x);
    const a = p.clone().addScaledVector(nrm, WIDTH / 2 + 1.3); a.y += bank * WIDTH * 0.5;
    return { a, b: a.clone().add(new THREE.Vector3(0, 0.9, 0)) };
  }, true), patchMaterial(new THREE.MeshStandardMaterial({ color: 0x2a2b30, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }), { contour: 0 }));
  root.add(barrier);
  const strip = new THREE.Mesh(ribbon(N, (i) => {
    const { p, t, bank } = trackAt(i / N); const nrm = new THREE.Vector3(-t.z, 0, t.x);
    const a = p.clone().addScaledVector(nrm, WIDTH / 2 + 1.28); a.y += bank * WIDTH * 0.5 + 0.82;
    return { a, b: a.clone().add(new THREE.Vector3(0, 0.07, 0)) };
  }, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe6cc93).multiplyScalar(2.2), side: THREE.DoubleSide, toneMapped: false }));
  root.add(strip);

  // --- the Möbius loop: a strip of track standing up, twisting half a turn
  const LOOP_C = new THREE.Vector3(14, 8.5, 0), LOOP_R = 7.6;
  const loopGeo = ribbon(200, (i) => {
    const a = (i / 200) * Math.PI * 2;
    const c = new THREE.Vector3(LOOP_C.x + Math.sin(a) * LOOP_R, LOOP_C.y - Math.cos(a) * LOOP_R, LOOP_C.z + Math.sin(a * 0.5) * 1.2);
    const radial = new THREE.Vector3(Math.sin(a), -Math.cos(a), 0);
    const across = new THREE.Vector3(0, 0, 1).multiplyScalar(Math.cos(a / 2)).addScaledVector(radial, Math.sin(a / 2)).normalize();
    return { a: c.clone().addScaledVector(across, -2.1), b: c.clone().addScaledVector(across, 2.1) };
  }, true);
  const loop = new THREE.Mesh(loopGeo, patchMaterial(new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide }), { contour: 0 }));
  root.add(loop);
  const loopEdge = new THREE.LineSegments(new THREE.EdgesGeometry(loopGeo, 30), new THREE.LineBasicMaterial({ color: new THREE.Color(0xe6cc93).multiplyScalar(2.4), toneMapped: false }));
  root.add(loopEdge);
  for (const sx of [-1, 1]) { // two pylons holding it
    const pyl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 4.6), loop.material);
    pyl.position.set(LOOP_C.x + sx * 2.5, 0.7, 0); root.add(pyl);
  }
  anchor('loop', LOOP_C.x, LOOP_C.y, LOOP_C.z);

  // --- lamp posts around the outside of the circuit
  const lampMat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x24252a, roughness: 0.5, metalness: 0.7 }), { contour: 0 });
  const lampHead = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0d0).multiplyScalar(3), toneMapped: false });
  for (let i = 0; i < 14; i++) {
    const { p, t } = trackAt(i / 14 + 0.02); const nrm = new THREE.Vector3(-t.z, 0, t.x);
    const base = p.clone().addScaledVector(nrm, WIDTH / 2 + 3.2); base.y = 0;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 7.5, 6), lampMat); pole.position.copy(base).add(new THREE.Vector3(0, 3.75, 0)); root.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.2), lampMat); arm.position.copy(base).addScaledVector(nrm, -0.7).add(new THREE.Vector3(0, 7.5, 0)); arm.lookAt(base.clone().addScaledVector(nrm, -3).setY(7.5)); arm.rotateY(Math.PI / 2); root.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.3), lampHead); head.position.copy(base).addScaledVector(nrm, -1.4).add(new THREE.Vector3(0, 7.42, 0)); head.rotation.y = Math.atan2(t.x, t.z); root.add(head);
  }
  const trackLight = new THREE.PointLight(0xdfe6ff, 260, 70, 1.6); trackLight.position.set(0, 16, 0); root.add(trackLight);

  // --- Hangar 7, cut into a rock outcrop at the back of the island
  const H = new THREE.Group(); H.position.set(-2, 0, -40); root.add(H);
  const n3 = makeNoise3(91);
  const rockGeo = new THREE.IcosahedronGeometry(1, 5);
  const rp = rockGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < rp.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(rp, i);
    const d = 1 + n3.fbm(v.x * 1.8, v.y * 1.8, v.z * 1.8, 4) * 0.35;
    v.multiplyScalar(d); v.x *= 22; v.y *= 13; v.z *= 13; if (v.y < 0) v.y *= 0.2;
    rp.setXYZ(i, v.x, v.y, v.z);
  }
  rockGeo.computeVertexNormals();
  const outcrop = new THREE.Mesh(rockGeo, patchMaterial(new THREE.MeshStandardMaterial({ color: 0x1f2026, roughness: 0.95 }), { bump: 0.8, bumpScale: 0.35, tint: 0.15, contour: 5 }));
  outcrop.position.set(0, -1, -22); H.add(outcrop);
  const shellMat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x3a3c42, roughness: 0.38, metalness: 0.85, side: THREE.DoubleSide }), { bump: 0.15, bumpScale: 4, contour: 0 });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 22, 40, 1, true, -Math.PI / 2, Math.PI), shellMat);
  shell.rotation.x = Math.PI / 2; shell.rotation.z = Math.PI / 2; shell.position.set(0, 0, 2); H.add(shell);
  // ribs
  for (let i = 0; i < 6; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(9.15, 0.18, 6, 40, Math.PI), shellMat); rib.position.set(0, 0, 13 - i * 4.2); H.add(rib); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 22).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.22, metalness: 0.3, envMap: env, envMapIntensity: 0.6 }));
  floor.position.set(0, 0.03, 2); H.add(floor);
  const backWall = new THREE.Mesh(new THREE.CircleGeometry(9, 40, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.8 }));
  backWall.position.set(0, 0, -9); H.add(backWall);
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6e8).multiplyScalar(4), toneMapped: false });
  for (let i = 0; i < 5; i++) for (const a of [-0.55, 0, 0.55]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 3), stripMat);
    s.position.set(Math.sin(a) * 8.7, Math.cos(a) * 8.7, 10 - i * 4.4); s.rotation.z = -a; H.add(s);
  }
  const hangarLight = new THREE.PointLight(0xfff1dc, 220, 30, 1.6); hangarLight.position.set(0, 7, 2); H.add(hangarLight);
  const sign = neonSign('HANGAR 7', { font: '500 150px Antonio, "Arial Narrow", sans-serif', color: '#e6cc93', glow: 2.4, w: 8, h: 2 });
  sign.position.set(0, 10.3, 13.2); H.add(sign);
  anchor('hangarDoor', -2, 4, -27);
  anchor('hangarIn', -2, 2.4, -38);

  // --- apron: turntable with a ring light, pit lift, assembly frame
  const metal = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x2b2c31, roughness: 0.3, metalness: 0.9 }), { contour: 0 });
  const TT = new THREE.Vector3(-17, 0, -25.5);
  const turntable = new THREE.Group(); turntable.position.copy(TT); root.add(turntable);
  turntable.add(new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.75, 0.32, 64), metal).translateY(0.16));
  const ttRing = new THREE.Mesh(new THREE.TorusGeometry(3.68, 0.035, 6, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe6cc93).multiplyScalar(3), toneMapped: false }));
  ttRing.position.y = 0.33; turntable.add(ttRing);
  const ringLight = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.07, 8, 120).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4e2).multiplyScalar(2.2), toneMapped: false }));
  ringLight.position.set(TT.x, 7.2, TT.z); root.add(ringLight);
  const spot = new THREE.SpotLight(0xfff0dc, 320, 22, 0.75, 0.6, 1.5); spot.position.set(TT.x, 9, TT.z); spot.target.position.copy(TT); root.add(spot, spot.target);
  anchor('turntable', TT.x, 1.0, TT.z);

  const LIFT = new THREE.Vector3(10, 0, -26);
  const lift = new THREE.Group(); lift.position.copy(LIFT); root.add(lift);
  for (const sx of [-2.6, 2.6]) lift.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), metal).translateX(sx).translateY(0.8));
  lift.add(new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 2.6), metal).translateY(1.65));
  const liftLight = new THREE.PointLight(0xbcd0ff, 220, 16, 1.6); liftLight.position.set(LIFT.x, 6, LIFT.z + 3); root.add(liftLight);
  anchor('lift', LIFT.x, 2.6, LIFT.z);

  const FRAME = new THREE.Vector3(-15, 0, 0);
  const frame = new THREE.Group(); frame.position.copy(FRAME); root.add(frame);
  const beam = (w: number, h: number, d: number, x: number, y: number, z: number) => frame.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metal).translateX(x).translateY(y).translateZ(z));
  for (const x of [-3.2, 3.2]) for (const z of [-1.8, 1.8]) beam(0.15, 3.4, 0.15, x, 1.7, z);
  for (const z of [-1.8, 1.8]) beam(6.55, 0.15, 0.15, 0, 3.4, z);
  for (const x of [-3.2, 3.2]) beam(0.15, 0.15, 3.75, x, 3.4, 0);
  const frameLight = new THREE.PointLight(0xe8eeff, 320, 16, 1.6); frameLight.position.set(FRAME.x, 5, FRAME.z + 2); root.add(frameLight);
  anchor('frame', FRAME.x, 1.2, FRAME.z);

  // light trails behind the two racing cars
  const trailN = 90;
  const makeTrail = (c0: THREE.ColorRepresentation, c1: THREE.ColorRepresentation) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((trailN + 1) * 2 * 3), 3));
    const f = new Float32Array((trailN + 1) * 2); for (let i = 0; i <= trailN; i++) f[i * 2] = f[i * 2 + 1] = i / trailN;
    geo.setAttribute('aF', new THREE.BufferAttribute(f, 1));
    const idx: number[] = []; for (let i = 0; i < trailN; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color(c0) }, c1: { value: new THREE.Color(c1) }, uA: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float aF; varying float vF; void main(){ vF=aF; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 c0,c1; uniform float uA; varying float vF; void main(){ vec3 c=mix(c1,c0,vF); gl_FragColor=vec4(c*pow(vF,1.6)*2.6*uA,1.0); }',
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; root.add(mesh); return mesh;
  };
  const trails = {
    hyperion: [makeTrail(0xffe8b8, 0xc9a86a), makeTrail(0xffffff, 0xc9a86a)],
    f1: [makeTrail(0x8fd0ff, 0xff4f9a), makeTrail(0x6af0ff, 0x3a6bff)],
  };
  const writeTrail = (mesh: THREE.Mesh, u: number, len: number, side: number, height: number) => {
    const a = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i <= trailN; i++) {
      const { p, t, bank } = trackAt(u - len * (1 - i / trailN));
      const nrm = new THREE.Vector3(-t.z, 0, t.x);
      const c = p.clone().addScaledVector(nrm, side); c.y += bank * side + height;
      a.setXYZ(i * 2, c.x, c.y - 0.12, c.z); a.setXYZ(i * 2 + 1, c.x, c.y + 0.12, c.z);
    }
    a.needsUpdate = true;
  };

  // --- the real models
  const artefacts: Artefact[] = [];
  const cars: Record<string, THREE.Group> = {};
  const parts: { mesh: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3 }[] = [];
  let ageraWire: THREE.Group | null = null;
  const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const clipPlaneInv = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  const ready = Promise.all([
    loadModel('hyperion').then((g) => {
      const m = mergeByMaterial(g.scene);
      applyEnv(m, env, 1.1);
      const car = fitModel(m, 4.6, 'x');
      cars.hyperion = car; root.add(car);
      artefacts.push(makeArtefact('hyperion', car, root, 1.05, 0.8));
    }),
    loadModel('f1').then((g) => {
      applyEnv(g.scene, env, 1.0);
      const car = fitModel(g.scene, 5.6, 'x');
      cars.f1 = car; root.add(car);
      car.updateMatrixWorld(true);
      const cc = new THREE.Box3().setFromObject(car).getCenter(new THREE.Vector3());
      car.traverse((o) => {
        const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
        const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
        const d = c.sub(cc); d.y = d.y * 1.6 + 0.35; d.x *= 0.7;
        parts.push({ mesh, base: mesh.position.clone(), dir: mesh.parent!.worldToLocal(d.add(mesh.getWorldPosition(new THREE.Vector3()))).sub(mesh.position).normalize().multiplyScalar(d.length()) });
      });
      artefacts.push(makeArtefact('alpine', car, root, 1.05, 0.8));
    }),
    loadModel('agera').then((g) => {
      const solid = mergeByMaterial(g.scene);
      applyEnv(solid, env, 1.1);
      const car = fitModel(solid, 4.3, 'z');
      car.rotation.y = Math.PI / 2;
      car.position.copy(FRAME).add(new THREE.Vector3(0, 0.05, 0));
      root.add(car);
      solid.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const mats = Array.isArray(m.material) ? m.material : [m.material]; for (const mt of mats) { mt.clippingPlanes = [clipPlane]; mt.clipShadows = true; } });
      // the teardown half: the same body as glowing wire, clipped by the opposite plane
      const wireMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc9a86a), wireframe: true, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: [clipPlaneInv], toneMapped: false });
      const solids: THREE.Mesh[] = [];
      solid.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) solids.push(m); });
      const wire = new THREE.Group();
      for (const m of solids) { const w = new THREE.Mesh(m.geometry, wireMat); w.position.copy(m.position); w.quaternion.copy(m.quaternion); w.scale.copy(m.scale); m.parent!.add(w); }
      ageraWire = wire;
      cars.agera = car;
      artefacts.push(makeArtefact('coachwork', car, root, 1.05, 0.9));
    }),
    loadModel('helmet').then((g) => {
      applyEnv(g.scene, env, 1.2);
      const helmet = fitModel(g.scene, 1.6);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.4, 32), metal);
      ped.position.set(0, 0.7, -2); H.add(ped);
      helmet.position.set(0, 1.45, -2); H.add(helmet);
      const hs = new THREE.SpotLight(0xfff2e0, 280, 10, 0.5, 0.5, 1.3); hs.position.set(0, 6, 0); hs.target = helmet; H.add(hs);
      cars.helmet = helmet;
      artefacts.push(makeArtefact('vanta', helmet, root, 1.4, 0.5));
    }),
  ]).catch((e) => console.warn('machines models', e));

  const tmpQ = new THREE.Quaternion();
  const place = (car: THREE.Object3D, u: number) => {
    const { p, t, bank } = trackAt(u);
    car.position.copy(p).add(new THREE.Vector3(0, 0.05, 0));
    car.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), t);
    tmpQ.setFromAxisAngle(t, -bank * 1.2); car.quaternion.premultiply(tmpQ);
  };

  function update(s: MachinesState) {
    const park = THREE.MathUtils.smoothstep(s.park, 0, 1);
    const uH = s.race, uF = s.race * 1.11 + 0.38;
    if (cars.hyperion) {
      place(cars.hyperion, uH);
      if (park > 0) {
        const parked = new THREE.Vector3(TT.x, 0.33, TT.z);
        cars.hyperion.position.lerp(parked, park);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.t * 0.25);
        cars.hyperion.quaternion.slerp(q, park);
      }
    }
    if (cars.f1) {
      place(cars.f1, uF);
      if (park > 0) {
        cars.f1.position.lerp(new THREE.Vector3(LIFT.x, 1.76, LIFT.z), park);
        cars.f1.quaternion.slerp(new THREE.Quaternion(), park);
      }
      const e = THREE.MathUtils.smoothstep(s.explode, 0, 1) * 0.55;
      for (const pt of parts) pt.mesh.position.copy(pt.base).addScaledVector(pt.dir, e);
    }
    for (const [k, tr] of Object.entries(trails)) {
      const u = k === 'hyperion' ? uH : uF;
      const len = 0.12 + s.speed * 0.25;
      writeTrail(tr[0], u, len, -0.75, 0.55); writeTrail(tr[1], u, len, 0.75, 0.55);
      for (const m of tr) (m.material as THREE.ShaderMaterial).uniforms.uA.value = 1 - park;
    }
    // Coachwork split plane sweeps across the body
    if (cars.agera) {
      const x = FRAME.x + (s.wire - 0.5) * 6.4;
      const wp = root.localToWorld(new THREE.Vector3(x, 0, 0));
      const nW = new THREE.Vector3(1, 0, 0).transformDirection(root.matrixWorld);
      clipPlane.setFromNormalAndCoplanarPoint(nW.clone().negate(), wp);
      clipPlaneInv.setFromNormalAndCoplanarPoint(nW, wp);
    }
    if (cars.helmet) cars.helmet.rotation.y = s.t * 0.3;
    ttRing.rotation.y = s.t * 0.2;
    asphalt.emissiveIntensity = 0;
  }

  return { root, anchors, artefacts, update, ready, cars, trackAt };
}
