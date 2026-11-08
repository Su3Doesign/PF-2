import * as THREE from 'three';
import { VPoint, VSpot } from './lights';
import { rng } from './shared';
import { marbleMaterial, std, glowMaterial, imageMaterial } from './materials';
import { makeArtefact, type Artefact } from './artefact';
import { loadModel, fitModel, applyEnv, loadTexture } from '../core/loaders';
import { createIsland, type Island } from './island';
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
  const headLight = new VSpot(0xfff0dd, 420, 70, 0.42, 0.7, 1.4); headLight.position.set(18, 34, 20); headLight.target.position.copy(HEAD).add(new THREE.Vector3(0, 12, 0)); root.add(headLight, headLight.target);
  const rimL = new VSpot(0x8ea7ff, 260, 70, 0.5, 0.8, 1.4); rimL.position.set(-22, 20, -26); rimL.target.position.copy(HEAD).add(new THREE.Vector3(0, 11, 0)); root.add(rimL, rimL.target);
  anchor('head', HEAD.x, 13, HEAD.z);

  // the atelier around the colossal head: scaffold towers, planks and a hoist with a block
  const wood = std(0x5b4330, 0.85, 0, { contour: 0 });
  const scaffold = new THREE.Group(); scaffold.position.copy(HEAD); root.add(scaffold);
  for (const [x, z] of [[-9, -6], [-9, 6], [9, -6], [9, 6], [-9, -14], [9, -14]] as const) {
    scaffold.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 22, 6), darkMetal).translateX(x).translateY(11).translateZ(z));
  }
  for (const yy of [6, 11, 16, 21]) for (const x of [-9, 9]) {
    scaffold.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 20), darkMetal).translateX(x).translateY(yy).translateZ(-4));
    scaffold.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 20), wood).translateX(x).translateY(yy - 0.12).translateZ(-4));
  }
  const hoist = new THREE.Group(); hoist.position.set(-16, 0, -14); root.add(hoist);
  hoist.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 26, 0.6), darkMetal).translateY(13));
  hoist.add(new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 0.5), darkMetal).translateX(5).translateY(26));
  hoist.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 10), darkMetal).translateX(10).translateY(21));
  const hoistBlock = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2.2), marbleBlock); hoistBlock.position.set(10, 14, 0); hoist.add(hoistBlock);
  // a ring of columns round the quarry, some whole, some broken
  const colGeo = new THREE.CylinderGeometry(0.9, 1.0, 1, 20, 1); colGeo.translate(0, 0.5, 0);
  const cols = new THREE.InstancedMesh(colGeo, marbleBlock, 22);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), marbleBlock, 22);
  for (let i = 0; i < 22; i++) {
    const a = 4.4 + 0.5 + (i / 22) * Math.PI * 1.55; const rad = 44 + (i % 2) * 3;
    const h = i % 4 === 1 ? 3 + r() * 4 : 13 + r() * 2;
    v.set(Math.cos(a) * rad, -0.6, Math.sin(a) * rad);
    cols.setMatrixAt(i, m4.compose(v, qt.identity(), sc.set(1, h, 1)));
    caps.setMatrixAt(i, m4.compose(v.clone().setY(h - 0.3), qt.identity(), sc.set(h > 10 ? 1 : 0.001, 1, h > 10 ? 1 : 0.001)));
  }
  root.add(cols, caps);
  // studies: the same head, half-carved, emerging from blocks across the quarry
  const studyHeads: [number, number, number, number, number][] = [[-24, -26, 4.2, 0.8, 2.1], [26, -22, 3.4, -0.9, 1.7], [-30, 12, 3.0, 1.9, 1.4]];

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
  const halden = new VPoint(0xfff0e0, 140, 14, 1.6); halden.position.set(-3, 5, 2); north.add(halden);
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
    const outward = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar((r() < 0.5 ? 1 : -1) * (RW / 2 + 3.4 + r() * 5));
    v.copy(p).add(outward); v.y -= 0.2;
    const s = 0.45 + r() * 0.6;
    trees.setMatrixAt(i, m4.compose(v, qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), sc.set(s, s * (0.8 + r() * 0.6), s)));
  }
  root.add(trees);
  // ---- Altair Estates: the house the road drives to, on its own sea cliff past the road's end.
  // The model is the estate's own (world/house.glb, see scripts/build-altair.mjs); its sea side
  // faces back up the road, so the arrival shot sees the terraces stepping down the cliff.
  const end = road.getPointAt(1);
  const outward = new THREE.Vector3(end.x, 0, end.z).normalize();
  const estate = createIsland({ seed: 91, radius: 24, stretch: [1.15, 1.3], topColor: '#33402a', rockColor: '#8a7e70', underColor: '#3a3430', irregular: 0.22, flat: 0.92, detail: q.detail * 0.6, roots: 6, depth: 46 });
  estate.group.position.copy(end).addScaledVector(outward, 46).add(new THREE.Vector3(0, -2, 0));
  estate.group.rotation.y = Math.atan2(outward.z, -outward.x);   // the islet's +x looks back at the road
  root.add(estate.group);
  const estateHouse = new THREE.Group(); estate.group.add(estateHouse);
  const estateWarm = new VPoint(0xffc48a, 520, 60, 1.4); estateWarm.position.set(14, 10, 0); estate.group.add(estateWarm);
  const estateCool = new VPoint(0x9fb7ff, 260, 70, 1.4); estateCool.position.set(-18, 26, -14); estate.group.add(estateCool);
  const roadLight = new VPoint(0xffd9a0, 220, 26, 1.6); roadLight.position.copy(end).add(new THREE.Vector3(0, 5, 0)); root.add(roadLight);
  anchor('roadTop', roadPts[0].x, roadPts[0].y, roadPts[0].z);
  anchor('roadMid', road.getPointAt(0.5).x, road.getPointAt(0.5).y, road.getPointAt(0.5).z);
  anchor('monolith', end.x, end.y + 6, end.z);
  // camera marks for the arrival: from the end of the road, then a step to the side
  const estateAt = (x: number, y: number, z: number) => estate.group.localToWorld(new THREE.Vector3(x, y, z));
  const estateMarks = { view: () => estateAt(36, 11, 14), view2: () => estateAt(31, 8, -19), look: () => estateAt(0, 1.5, 0) };

  // four studies on plinths, as framed prints
  const studies: [string, number][] = [['sculpting', 2.3], ['clock', 2.7], ['extinguisher', 3.1], ['interiors', 3.5]];
  for (const [slug, a] of studies) {
    const img = (images as Record<string, { thumb: string | null; cover: string | null }>)[slug];
    const rad = 30;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad); g.lookAt(0, 0, 0); root.add(g);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 1.6), marbleBlock).translateY(1.2));
    if (img?.cover) {
      const { mat } = imageMaterial(loadTexture(img.cover), 1.25);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.3, 0.22), darkMetal); frame.position.set(0, 5.0, 0); frame.rotation.x = -0.1; g.add(frame);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 3.94), mat); pic.position.set(0, 5.0, 0.12); pic.rotation.x = -0.1; g.add(pic);
      const lamp = new VPoint(0xfff0dc, 40, 8, 1.6); lamp.position.set(0, 6.5, 2); g.add(lamp);
      artefacts.push(makeArtefact(slug, frame, root, 1.1, 0.5));
    }
  }

  // the real models
  let headMesh: THREE.Object3D | null = null, cameraModel: THREE.Object3D | null = null;
  const ready = Promise.all([
    loadModel('head').then((g) => {
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = marble; } });
      for (const [x, z, size, ry, sink] of studyHeads) {
        const h2 = fitModel(g.scene.clone(), size * 2.2); h2.position.set(x, -sink, z); h2.rotation.y = ry; root.add(h2);
        root.add(new THREE.Mesh(new THREE.BoxGeometry(size * 2.4, sink * 1.6 + 1.2, size * 2.2), marbleBlock).translateX(x).translateY((sink * 1.6 + 1.2) / 2 - 0.6).translateZ(z));
      }
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
    loadModel('altair').then((g) => {
      const W = new THREE.Color(1, 1, 1);
      // plain lit materials: the estate's vertex colours already carry its palette
      const lit = (color: number, roughness: number, metalness = 0, vertexColors = true) => new THREE.MeshStandardMaterial({ color, roughness, metalness, vertexColors });
      const mats: Record<string, THREE.Material> = {
        stone: lit(0xf3e2c4, 0.85),
        cliff: lit(0xb3a08a, 0.95),
        rock: lit(0xffffff, 0.9),
        lawn: lit(0xa8d27a, 0.9),
        sand: lit(0xd8c8a2, 0.9, 0, false),
        metal: lit(0xffffff, 0.45, 0.55),
        wood: lit(0xffffff, 0.7),
        dark: lit(0xffffff, 0.6, 0.2),
        roof: lit(0x2c2b29, 0.7, 0.2, false),
        steel: lit(0x34373c, 0.35, 0.8, false),
        glass: new THREE.MeshStandardMaterial({ color: 0x0c1118, roughness: 0.15, metalness: 0.2, emissive: 0xffb36a, emissiveIntensity: 1.1 }),
        pool: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3fd6ff).multiplyScalar(1.3), toneMapped: false }),
        glow: new THREE.MeshBasicMaterial({ vertexColors: true, color: W.clone().multiplyScalar(2.4), toneMapped: false }),
      };
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh; if (!m.isMesh) return;
        const part = m.name.split('__')[1] ?? (m.material as THREE.Material).name;
        m.material = mats[part] ?? mats.stone;
      });
      applyEnv(g.scene, env, 0.6);
      // the plateau the house stands on is y = 27 in the estate's metres; the house centre is x 112, z -14
      const S = 0.22;
      const inner = new THREE.Group(); inner.scale.setScalar(S); inner.position.set(-112 * S, -27 * S, 14 * S); inner.add(g.scene);
      estateHouse.add(inner);
      artefacts.push(makeArtefact('altair', estateHouse, root, 1.05, 1.2));
    }),
  ]).catch((e) => console.warn('monuments models', e));

  let lastLit = -1, lastAll = false;
  function update(s: { t: number; lampsLit: number; headTurn: number; gold: number; allLamps?: boolean }) {
    gold.value = s.gold;
    if (headMesh) headMesh.rotation.y = s.headTurn;
    if (hoistBlock) hoistBlock.position.y = 14 + Math.sin(s.t * 0.35) * 3;
    // lamps light in sequence down the road (only rewritten when the count changes)
    const lit = Math.round(s.lampsLit * 400) / 400;
    if (lit === lastLit && !!s.allLamps === lastAll) return;
    lastLit = lit; lastAll = !!s.allLamps;
    for (let i = 0; i <= LAMPS; i++) {
      const on = lampT[i] <= lit && (i !== 1377 || s.allLamps);
      lamps.setColorAt(i, on ? lampOn : lampOff);
    }
    lamps.instanceColor!.needsUpdate = true;
  }
  update({ t: 0, lampsLit: 1, headTurn: 0, gold: 0.1 });
  const lampIndex = (tFrac: number) => Math.round(Math.min(1, tFrac) * LAMPS);

  return { root, anchors, artefacts, update, ready, road, lamps, lampIndex, LAMPS, getHead: () => headMesh, getCamera: () => cameraModel, estate: estate.group, estateMarks };
}
