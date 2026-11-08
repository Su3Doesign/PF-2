import * as THREE from 'three';
import { rng } from './shared';
import { marbleMaterial, std, glowMaterial, imageMaterial } from './materials';
import { makeArtefact, type Artefact } from './artefact';
import { loadModel, fitModel, applyEnv, loadTexture } from '../core/loaders';
import type { Island } from './island';
import type { Quality } from '../core/quality';
import images from '../data/images.json';

/**
 * 02 / Monuments. A white marble quarry stepped into the island. At its centre the Parian
 * head stands colossal on a plinth with gold in its cracks; Halden's field camera stands
 * on its tripod under a north-light frame, taking the head's portrait. The Altair road
 * winds down the cliff in a spiral of 2,141 lamps and 808 trees to the dark monolith.
 * Four smaller studies stand on plinths along the terrace.
 */
export function createMonuments(island: Island, env: THREE.Texture, q: Quality) {
  const root = new THREE.Group(); root.name = 'monuments';
  island.group.add(root);
  const r = rng(4242);
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, x: number, y: number, z: number) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); anchors[name] = o; return o; };
  const artefacts: Artefact[] = [];
  const gold = { value: 0.1 };

  const marble = marbleMaterial({ scale: 0.35, gold, crackScale: 0.12, crackBase: 0.08 });
  const marbleBlock = marbleMaterial({ scale: 0.8, crackScale: 0.4, gold: { value: 0 }, crackBase: 0 });
  const stone = std(0xb9b3a8, 0.85, 0, { bump: 0.4, bumpScale: 0.6, tint: 0.2 });
  const darkMetal = std(0x1b1c20, 0.4, 0.8);

  // quarry blocks, scaffold and cut faces around the terraces
  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  const blocks = new THREE.InstancedMesh(blockGeo, marbleBlock, 70);
  const m4 = new THREE.Matrix4(); const qt = new THREE.Quaternion(); const v = new THREE.Vector3(); const sc = new THREE.Vector3();
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, rad = 26 + r() * 30;
    if (Math.abs(Math.atan2(Math.sin(a - 4.4), Math.cos(a - 4.4))) < 0.5) { i--; continue; }
    v.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    sc.set(1.5 + r() * 4, 0.8 + r() * 3, 1.2 + r() * 3);
    v.y = sc.y / 2 - 0.6 - (rad > 45 ? 2.4 : rad > 34 ? 1.2 : 0);
    qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
    blocks.setMatrixAt(i, m4.compose(v, qt, sc));
  }
  root.add(blocks);

  // the plinth and the colossal head
  const HEAD = new THREE.Vector3(0, 0, -4);
  const plinth = new THREE.Group(); plinth.position.copy(HEAD); root.add(plinth);
  plinth.add(new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.2, 1.2, 8), stone).translateY(0.6));
  plinth.add(new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 4.2, 8), marbleBlock).translateY(3.3));
  const plate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 0.1), glowMaterial(0xc9a86a, 0.9)); plate.position.set(0, 3.3, 5.0); plinth.add(plate);
  const headLight = new THREE.SpotLight(0xfff0dd, 420, 70, 0.42, 0.7, 1.4); headLight.position.set(18, 34, 20); headLight.target.position.copy(HEAD).add(new THREE.Vector3(0, 12, 0)); root.add(headLight, headLight.target);
  const rimL = new THREE.SpotLight(0x8ea7ff, 260, 70, 0.5, 0.8, 1.4); rimL.position.set(-22, 20, -26); rimL.target.position.copy(HEAD).add(new THREE.Vector3(0, 11, 0)); root.add(rimL, rimL.target);
  anchor('head', HEAD.x, 13, HEAD.z);

  // Halden: the field camera on its tripod, under a north-light frame, aimed at the head
  const CAM = new THREE.Vector3(17, 0, 15);
  const north = new THREE.Group(); north.position.copy(CAM); north.lookAt(HEAD.x, 0, HEAD.z); root.add(north);
  const frameMat = std(0x26272c, 0.5, 0.7, { contour: 0 });
  for (const x of [-4, 4]) north.add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 7, 0.25), frameMat).translateX(x).translateY(3.5).translateZ(-2.5));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(8, 5.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfe8ff).multiplyScalar(1.4), transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  glass.position.set(0, 6.2, -1.2); glass.rotation.x = -0.9; glass.visible = false;
  const mullions = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(8, 5.4, 4, 3)), new THREE.LineBasicMaterial({ color: 0x3a3c44 }));
  mullions.position.copy(glass.position); mullions.rotation.copy(glass.rotation); north.add(mullions);
  const softbox = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), glowMaterial(0xfff4e6, 2.2)); softbox.position.set(-5, 3.2, 1); softbox.rotation.y = 0.9; north.add(softbox);
  const northLight = new THREE.RectAreaLight(0xe8eeff, 0, 1, 1); north.add(northLight);
  const halden = new THREE.PointLight(0xfff0e0, 140, 14, 1.6); halden.position.set(-3, 5, 2); north.add(halden);
  anchor('camera', CAM.x, 3, CAM.z);

  // the Altair road: a spiral down the cliff from the terrace edge
  const roadPts: THREE.Vector3[] = [];
  const R0 = island.radius * 0.97, turns = 1.35, drop = 70;
  for (let i = 0; i <= 260; i++) {
    const t = i / 260; const a = 4.4 + t * turns * Math.PI * 2;
    const rr = R0 * (1 - 0.32 * t) + Math.sin(t * 40) * 0.6;
    roadPts.push(new THREE.Vector3(Math.cos(a) * rr, -1.5 - t * drop, Math.sin(a) * rr));
  }
  const road = new THREE.CatmullRomCurve3(roadPts);
  const RW = 3.4, RN = 600;
  const rpos: number[] = [], ridx: number[] = [];
  const frames = road.computeFrenetFrames(RN, false);
  for (let i = 0; i <= RN; i++) {
    const p = road.getPointAt(i / RN); const tan = road.getTangentAt(i / RN);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const a = p.clone().addScaledVector(side, -RW / 2), b = p.clone().addScaledVector(side, RW / 2);
    rpos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (i < RN) { const k = i * 2; ridx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  void frames;
  const roadGeo = new THREE.BufferGeometry(); roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3)); roadGeo.setIndex(ridx); roadGeo.computeVertexNormals();
  const roadMesh = new THREE.Mesh(roadGeo, std(0x2a2a2e, 0.7, 0, { contour: 0 })); roadMesh.material.side = THREE.DoubleSide;
  root.add(roadMesh);
  // a ledge under the road so it is cut into the rock
  const ledge = new THREE.Mesh(new THREE.TubeGeometry(road, 300, 2.2, 5, false), std(0x6b665e, 0.95, 0, { bump: 0.6, bumpScale: 0.5, tint: 0.3 }));
  ledge.position.y = -1.6; ledge.scale.set(1, 1, 1); root.add(ledge);

  // 2,141 lamps: tiny emissive heads on both sides, plus one that is out (the easter egg)
  const LAMPS = 2141;
  const lampGeo = new THREE.SphereGeometry(0.16, 6, 4);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, LAMPS + 1);
  const lampOn = new THREE.Color(0xffd9a0).multiplyScalar(3.2), lampOff = new THREE.Color(0x221d18);
  const lampT: number[] = [];
  for (let i = 0; i <= LAMPS; i++) {
    const t = (i + 0.5) / (LAMPS + 1); const p = road.getPointAt(t); const tan = road.getTangentAt(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar((i % 2 ? 1 : -1) * (RW / 2 + 0.45));
    v.copy(p).add(side).add(new THREE.Vector3(0, 0.75, 0));
    lamps.setMatrixAt(i, m4.compose(v, qt.identity(), sc.set(1, 1, 1)));
    lamps.setColorAt(i, i === 1377 ? lampOff : lampOn);
    lampT.push(t);
  }
  lamps.instanceMatrix.needsUpdate = true; root.add(lamps);
  // 808 trees: dark cone pines just outside the lamps
  const TREES = 808;
  const treeGeo = new THREE.ConeGeometry(0.9, 3.4, 6); treeGeo.translate(0, 1.7, 0);
  const trees = new THREE.InstancedMesh(treeGeo, std(0x1d2a22, 0.95, 0, { contour: 0, chartGlow: 0.4 }), TREES);
  for (let i = 0; i < TREES; i++) {
    const t = r(); const p = road.getPointAt(t); const tan = road.getTangentAt(t);
    const outward = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar((r() < 0.5 ? 1 : -1) * (RW / 2 + 1.6 + r() * 3.5));
    v.copy(p).add(outward); v.y -= 0.2;
    const s = 0.6 + r() * 0.9;
    trees.setMatrixAt(i, m4.compose(v, qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), sc.set(s, s * (0.8 + r() * 0.6), s)));
  }
  root.add(trees);
  // the monolith where the road ends
  const end = road.getPointAt(1);
  const mono = new THREE.Group(); mono.position.copy(end).add(new THREE.Vector3(0, 0, 0)); root.add(mono);
  mono.lookAt(0, end.y, 0);
  mono.add(new THREE.Mesh(new THREE.BoxGeometry(9, 22, 6), std(0x0d0e12, 0.35, 0.3, { contour: 2 })).translateY(10).translateZ(-5));
  mono.add(new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.12, 0.1), glowMaterial(0xffd9a0, 4)).translateY(12).translateZ(-1.95));
  mono.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 8, 0.1), glowMaterial(0xffd9a0, 3)).translateY(8).translateZ(-1.95).translateX(2.2));
  const monoLight = new THREE.PointLight(0xffd9a0, 300, 30, 1.6); monoLight.position.set(0, 6, 2); mono.add(monoLight);
  anchor('roadTop', roadPts[0].x, roadPts[0].y, roadPts[0].z);
  anchor('roadMid', road.getPointAt(0.5).x, road.getPointAt(0.5).y, road.getPointAt(0.5).z);
  anchor('monolith', end.x, end.y + 10, end.z);
  const altairHit = new THREE.Group(); altairHit.add(new THREE.Mesh(new THREE.BoxGeometry(9, 22, 6))); altairHit.position.copy(mono.position).add(new THREE.Vector3(0, 10, 0)); root.add(altairHit); (altairHit.children[0] as THREE.Mesh).visible = false;
  artefacts.push(makeArtefact('altair', altairHit, root, 1.1, 1));

  // four studies on plinths, as framed prints
  const studies: [string, number][] = [['sculpting', 2.3], ['clock', 2.7], ['extinguisher', 3.1], ['interiors', 3.5]];
  for (const [slug, a] of studies) {
    const img = (images as Record<string, { thumb: string | null; cover: string | null }>)[slug];
    const rad = 30;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad); g.lookAt(0, 0, 0); root.add(g);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 1.6), marbleBlock).translateY(1.2));
    if (img?.cover) {
      const { mat } = imageMaterial(loadTexture(img.cover), 1.25);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.3, 0.22), darkMetal); frame.position.set(0, 4.2, 0); frame.rotation.x = -0.12; g.add(frame);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 2.94), mat); pic.position.set(0, 4.2, 0.12); pic.rotation.x = -0.12; g.add(pic);
      const lamp = new THREE.PointLight(0xfff0dc, 40, 8, 1.6); lamp.position.set(0, 6.5, 2); g.add(lamp);
      artefacts.push(makeArtefact(slug, frame, root, 1.1, 0.5));
    }
  }

  // the real models
  let headMesh: THREE.Object3D | null = null, cameraModel: THREE.Object3D | null = null;
  const ready = Promise.all([
    loadModel('head').then((g) => {
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = marble; } });
      const head = fitModel(g.scene, 14);
      head.position.copy(HEAD).add(new THREE.Vector3(0, 5.4, 0));
      root.add(head); headMesh = head;
      artefacts.push(makeArtefact('parian', head, root, 1.0, 1.2));
    }),
    loadModel('camera').then((g) => {
      applyEnv(g.scene, env, 0.9);
      const cam = fitModel(g.scene, 2.6);
      const s = 5.2 / (cam.userData.size as THREE.Vector3).y; cam.scale.setScalar(s);
      cam.position.copy(CAM);
      cam.lookAt(HEAD.x, 0, HEAD.z); cam.rotateY(Math.PI / 2);
      root.add(cam); cameraModel = cam;
      artefacts.push(makeArtefact('halden', cam, root, 1.1, 0.6));
    }),
  ]).catch((e) => console.warn('monuments models', e));

  function update(s: { t: number; lampsLit: number; headTurn: number; gold: number; allLamps?: boolean }) {
    gold.value = s.gold;
    if (headMesh) headMesh.rotation.y = s.headTurn;
    // lamps light in sequence down the road
    const lit = s.lampsLit;
    for (let i = 0; i <= LAMPS; i++) {
      const on = lampT[i] <= lit && (i !== 1377 || s.allLamps);
      lamps.setColorAt(i, on ? lampOn : lampOff);
    }
    lamps.instanceColor!.needsUpdate = true;
  }
  update({ t: 0, lampsLit: 1, headTurn: 0, gold: 0.1 });
  const lampIndex = (tFrac: number) => Math.round(Math.min(1, tFrac) * LAMPS);

  return { root, anchors, artefacts, update, ready, road, lamps, lampIndex, LAMPS, getHead: () => headMesh, getCamera: () => cameraModel };
}
