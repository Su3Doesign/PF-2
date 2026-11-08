import * as THREE from 'three';
import { G, rng } from './shared';
import { std, glowMaterial, imageMaterial } from './materials';
import { makeArtefact, textTexture, type Artefact } from './artefact';
import { loadTexture } from '../core/loaders';
import { NOISE } from './glsl';
import type { Island } from './island';
import type { Quality } from '../core/quality';
import images from '../data/images.json';

/**
 * 04 / Brands. "Brands are buildings. You climb them one floor at a time."
 * An asymmetric concrete tower on the last island. Every brand gets a space shaped by its
 * design, set into the architecture rather than floated in front of it: GC Burger's diner
 * at street level, KERB's pit terrace on a cantilever, Deccan Night Run's arcade bridge,
 * Lotus's half-built wing under a crane, REM's after-hours floor, CapQ's glass atrium,
 * Mitti and Maruneta on the clay floor, the signal floor (BSNL, Rujuvu, Kosh, LAGRANGE),
 * Magma's molten core running up the middle, and Photon Yard's beacon in the crown.
 */

type Img = { cover: string | null; thumb: string | null; gallery: { src: string; w: number; h: number }[] };
const IMG = images as Record<string, Img>;

export interface Floor {
  slug: string;
  level: string;
  y: number;              // floor height (island local)
  center: THREE.Vector3;  // room centre (tower local)
  face: number;           // the angle the room opens toward (radians)
  view: THREE.Vector3;    // camera position for this stop (tower local)
  look: THREE.Vector3;    // look target (tower local)
}

function lavaMaterial() {
  const u = { uTime: G.uTime, uCrack: { value: 0.3 }, uHeat: { value: 1 }, uCursor: { value: new THREE.Vector3(0, -999, 0) }, uChart: G.uChart, uDim: G.uDim };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vO; varying vec3 vW; void main(){ vO=position; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: /* glsl */ `
      uniform float uTime, uCrack, uHeat, uChart, uDim; uniform vec3 uCursor; varying vec3 vO; varying vec3 vW;
      ${NOISE}
      void main(){
        vec3 p = vO * 0.18;
        vec3 q = vec3(fbm3(p + vec3(0.0, -uTime*0.12, 0.0)), fbm3(p + vec3(5.2, -uTime*0.1, 1.3)), 0.0);
        float n = fbm3(p*1.6 + q*1.8 + vec3(0.0, -uTime*0.2, 0.0));
        // crust: cells of dark rock, molten veins between them
        float cells = abs(snoise(p*2.2 + q));
        float vein = 1.0 - smoothstep(0.0, 0.1 + uCrack*0.28, cells);
        float cool = exp(-pow(length(vW - uCursor), 2.0) * 0.02);
        float heat = clamp(vein * (0.85 + n*0.9) * uHeat - cool*0.8, 0.0, 1.0) + 0.06;
        vec3 crust = vec3(0.025,0.018,0.016) * (0.6 + n*0.4);
        vec3 ramp = mix(vec3(0.6,0.03,0.02), vec3(1.0,0.32,0.05), smoothstep(0.2,0.7,heat));
        ramp = mix(ramp, vec3(1.0,0.85,0.55), smoothstep(0.75,1.0,heat));
        vec3 col = mix(crust, ramp * (2.0 + heat*5.0), smoothstep(0.05, 0.4, heat));
        col = mix(col, vec3(0.02,0.026,0.055) + vec3(0.79,0.66,0.42)*vein*0.4, uChart);
        gl_FragColor = vec4(col * (1.0 - uDim*0.6), 1.0);
      }`,
    toneMapped: false,
  });
  return { mat, u };
}

export function createBrands(island: Island, env: THREE.Texture, q: Quality) {
  const root = new THREE.Group(); root.name = 'brands';
  island.group.add(root);
  const r = rng(5150);
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, x: number, y: number, z: number) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); anchors[name] = o; return o; };
  const artefacts: Artefact[] = [];
  const floors: Floor[] = [];
  const hovers: { slug: string; u: { uHover: { value: number } } }[] = [];

  const concrete = std(0x77736d, 0.92, 0, { bump: 0.08, bumpScale: 0.9, tint: 0.18, contour: 4 });
  const concreteDark = std(0x3e3c3a, 0.9, 0, { bump: 0.08, bumpScale: 0.9, tint: 0.18, contour: 4 });
  const steel = std(0x2b2d33, 0.35, 0.85, { contour: 0 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0c1220, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, envMap: env, envMapIntensity: 1.2, depthWrite: false });
  const ink = new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 0.85 });

  // ---- the tower shell: stacked volumes with setbacks around a central core
  const shell = new THREE.Group(); root.add(shell);
  const vols: { x: number; z: number; hx: number; hz: number; y0: number; y1: number }[] = [];
  const vol = (w: number, h: number, d: number, x: number, y: number, z: number, mat = concrete) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); shell.add(m); vols.push({ x, z, hx: w / 2, hz: d / 2, y0: y, y1: y + h }); return m; };
  /** How far the tower reaches in direction `face` between heights y0 and y1 (box support distance). */
  const reach = (face: number, y0: number, y1: number) => {
    const ux = Math.sin(face), uz = Math.cos(face); let r = 0;
    for (const v of vols) if (v.y1 > y0 && v.y0 < y1) r = Math.max(r, v.x * ux + v.z * uz + v.hx * Math.abs(ux) + v.hz * Math.abs(uz));
    return r;
  };
  vol(18, 10, 16, 0, 0, 0, concreteDark);          // base
  vol(16, 14, 14, -1, 10, 1);                       // L2 block
  vol(14, 12, 18, 1, 24, -1);                       // L4
  vol(17, 16, 13, -1.5, 36, 0.5);                   // L7 Lotus block
  vol(13, 8, 13, 0.5, 52, -0.5, concreteDark);      // REM
  vol(15, 18, 15, 0, 60, 0);                        // CapQ atrium body
  vol(12, 10, 14, 1, 78, 1);                        // clay floor
  vol(13, 14, 12, -1, 88, -1, concreteDark);        // signal floor
  vol(10, 26, 10, 0, 102, 0);                       // upper shaft
  // floor bands: thin frames round each volume's perimeter (open in the middle, so the core stays clear)
  const bandGeo = new THREE.BoxGeometry(1, 0.18, 1);
  const bands = new THREE.InstancedMesh(bandGeo, steel, 400); let nb = 0;
  const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  for (const vo of vols) for (let yy = vo.y0 + 4; yy < vo.y1 - 0.5; yy += 4) {
    const edges: [number, number, number, number][] = [[vo.x, vo.z + vo.hz + 0.08, vo.hx * 2 + 0.3, 0.3], [vo.x, vo.z - vo.hz - 0.08, vo.hx * 2 + 0.3, 0.3], [vo.x + vo.hx + 0.08, vo.z, 0.3, vo.hz * 2 + 0.3], [vo.x - vo.hx - 0.08, vo.z, 0.3, vo.hz * 2 + 0.3]];
    for (const [x, z, w, d] of edges) if (nb < 400) bands.setMatrixAt(nb++, m4.compose(v.set(x, yy, z), qt.identity(), sc.set(w, 1, d)));
  }
  bands.count = nb; shell.add(bands);
  // window grid: emissive cells placed on the real faces of each volume
  const winGeo = new THREE.PlaneGeometry(0.8, 1.6);
  const NW = 900;
  const wins = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NW);
  const warm = new THREE.Color(0xffd7a0), cool = new THREE.Color(0xbcd0ff);
  for (let i = 0; i < NW; i++) {
    const vo = vols[Math.floor(r() * vols.length)]; const side = Math.floor(r() * 4);
    const floorsIn = Math.max(1, Math.floor((vo.y1 - vo.y0) / 4));
    const yy = vo.y0 + Math.floor(r() * floorsIn) * 4 + 2;
    const a = side * Math.PI / 2;
    const half = side % 2 === 0 ? vo.hz : vo.hx, span = side % 2 === 0 ? vo.hx : vo.hz;
    const along = (r() - 0.5) * 2 * (span - 0.8);
    v.set(vo.x + Math.sin(a) * (half + 0.02) + Math.cos(a) * along, yy, vo.z + Math.cos(a) * (half + 0.02) - Math.sin(a) * along);
    qt.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
    wins.setMatrixAt(i, m4.compose(v, qt, sc.set(1, 1, 1)));
    const lit = r() < 0.32;
    wins.setColorAt(i, lit ? (r() < 0.75 ? warm : cool).clone().multiplyScalar(0.6 + r() * 1.4) : new THREE.Color(0x0a0d16));
  }
  shell.add(wins);

  // ---- the molten core: a slot down one face shows the lava shaft inside
  const lava = lavaMaterial();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 128, 48, 32, true), lava.mat);
  core.position.y = 64; root.add(core);
  const slot = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 110), lava.mat); slot.position.set(-4.3, 62, 9.06); root.add(slot);
  const coreLight = new THREE.PointLight(0xff4a1a, 160, 26, 1.8); coreLight.position.set(-4.5, 60, 11); root.add(coreLight);
  // cans set into the shaft wall like fossils, lit from behind
  const magma = IMG.magma;
  const canTex = magma?.cover ? loadTexture(magma.gallery[0]?.src ?? magma.cover) : null;
  const canMat = canTex ? imageMaterial(canTex, 1.6).mat : glowMaterial(0xe2552b, 2);
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39; const yy = 20 + i * 5.6;
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.4, 24, 1, true), canMat);
    can.position.set(Math.cos(a) * 3.9, yy, Math.sin(a) * 3.9); can.lookAt(0, yy, 0); can.rotateX(Math.PI / 2); root.add(can);
  }
  anchor('coreBottom', 0, 22, 0); anchor('coreTop', 0, 120, 0);
  floors.push({ slug: 'magma', level: 'Core shaft', y: 64, center: new THREE.Vector3(0, 64, 0), face: 0, view: new THREE.Vector3(0, 30, 0), look: new THREE.Vector3(0, 120, 0) });
  const magmaHit = new THREE.Group(); magmaHit.add(new THREE.Mesh(new THREE.BoxGeometry(4, 100, 1))); magmaHit.position.set(-4.3, 62, 9.1); (magmaHit.children[0] as THREE.Mesh).visible = false; root.add(magmaHit);
  artefacts.push(makeArtefact('magma', magmaHit, root, 1, 0));

  // ---- a room builder: a lit box set into the facade, open toward `face`
  const room = (o: { slug: string; level: string; y: number; face: number; w: number; d: number; h: number; out?: number; floor?: THREE.Material; wall?: THREE.Material; accent: number; sign?: string; signFont?: string; panels?: number; glass?: boolean; light?: number; lightColor?: number }) => {
    const g = new THREE.Group();
    const dirX = Math.sin(o.face), dirZ = Math.cos(o.face);
    const out = reach(o.face, o.y - 0.6, o.y + o.h + 0.6) + o.d / 2 + 0.25;
    o.out = out;
    g.position.set(dirX * out, o.y, dirZ * out); g.rotation.y = o.face; root.add(g);
    const fm = o.floor ?? concreteDark, wm = o.wall ?? ink;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(o.w, 0.6, o.d), fm).translateY(-0.3));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(o.w, 0.6, o.d), concreteDark).translateY(o.h + 0.3));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, 0.4), wm).translateY(o.h / 2).translateZ(-o.d / 2));
    for (const sx of [-1, 1]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, o.h, o.d), wm).translateX(sx * o.w / 2).translateY(o.h / 2));
    if (o.glass) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), glassMat); gl.position.set(0, o.h / 2, o.d / 2); g.add(gl); }
    // accent strip around the opening
    const strip = glowMaterial(o.accent, 2.6);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(o.w, 0.08, 0.08), strip).translateY(o.h + 0.02).translateZ(o.d / 2));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(o.w, 0.08, 0.08), strip).translateY(0.02).translateZ(o.d / 2));
    const L = new THREE.PointLight(o.lightColor ?? o.accent, (o.light ?? 160) * 0.55, Math.max(o.w, o.d) * 1.6, 1.6); L.position.set(0, o.h * 0.55, o.d * 0.3); g.add(L);
    const wash = new THREE.SpotLight(0xfff4e6, 90, o.d * 2.5, 0.9, 0.8, 1.4); wash.position.set(0, o.h - 0.4, o.d / 2 - 0.4); wash.target.position.set(0, o.h * 0.5, -o.d / 2); g.add(wash, wash.target);
    // image panels on the back wall, from the brand's own gallery
    const img = IMG[o.slug];
    const gal = img ? [img.cover, ...img.gallery.slice(1).map((x) => x.src)].filter(Boolean) as string[] : [];
    const nP = Math.min(o.panels ?? 3, gal.length);
    const pw = Math.min((o.w - 1.2) / Math.max(nP, 1) - 0.4, o.h * 1.25);
    for (let i = 0; i < nP; i++) {
      const { mat, u } = imageMaterial(loadTexture(gal[i]), 1.25);
      const ph = pw * 0.66;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
      pic.position.set((i - (nP - 1) / 2) * (pw + 0.4), o.h * 0.52, -o.d / 2 + 0.25);
      g.add(pic); hovers.push({ slug: o.slug, u });
    }
    if (o.sign) {
      const t = textTexture([{ text: o.sign, font: o.signFont ?? '500 140px Antonio, sans-serif', color: '#fff', y: 128, spacing: 6 }], 1024, 256);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(o.w * 0.7, o.w * 0.7 / 4), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(o.accent).multiplyScalar(3), transparent: true, depthWrite: false, toneMapped: false }));
      s.position.set(0, o.h + 1.6, o.d / 2); g.add(s);
    }
    const center = new THREE.Vector3(dirX * out, o.y + o.h / 2, dirZ * out);
    const view = center.clone().add(new THREE.Vector3(dirX * (o.d * 1.05 + 6), o.h * 0.1 + 0.6, dirZ * (o.d * 1.05 + 6)));
    floors.push({ slug: o.slug, level: o.level, y: o.y, center, face: o.face, view, look: center.clone().add(new THREE.Vector3(-dirX * 2, -o.h * 0.05, -dirZ * 2)) });
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.d)); hitBox.visible = false; hitBox.position.set(0, o.h / 2, 0); g.add(hitBox);
    artefacts.push(makeArtefact(o.slug, hitBox, root, 1, 0.8));
    return g;
  };

  // L0 GC Burger: a chrome-and-neon diner jutting out onto the plaza
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 1.4 });
  const redVinyl = std(0x9e1b1b, 0.5, 0, { contour: 0 });
  const diner = room({ slug: 'gcburger', level: 'L0 · Street', y: 0.4, face: 0, w: 20, d: 9, h: 6.2, out: 12, floor: std(0x1a1a1a, 0.3, 0.2, { contour: 0 }), wall: std(0x8a1a16, 0.6, 0, { contour: 0 }), accent: 0xff3b30, sign: 'GC BURGER', signFont: '700 150px Antonio, sans-serif', panels: 5, glass: true, light: 320, lightColor: 0xffd0b0 });
  diner.add(new THREE.Mesh(new THREE.BoxGeometry(14, 1.1, 1.2), chrome).translateY(0.55).translateZ(-1));
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.4), redVinyl); b.position.set(-7.6 + i * 3.8, 0.55, 2.6); diner.add(b); }
  // the plaza: billboards for the agency work ("the city is the billboard")
  const boards: [string, number, number, number][] = [['midea', -22, 7, 0.6], ['investohome', 22, 6, -0.6], ['three-houses', -16, 16, 0.9], ['brand-systems', 18, 18, -0.9], ['shelf-table', -26, -10, 1.9]];
  for (const [slug, x, z, ry] of boards) {
    const img = IMG[slug]; if (!img?.cover) continue;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry + Math.PI; root.add(g);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 7), steel).translateY(3.5));
    const { mat, u } = imageMaterial(loadTexture(img.cover), 1.3);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.5), mat); pic.position.y = 8.6; pic.rotation.y = Math.PI; g.add(pic);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.8, 0.3), steel).translateY(8.6).translateZ(0.18));
    hovers.push({ slug, u });
    artefacts.push(makeArtefact(slug, pic, root, 1.05, 0.4));
  }

  // L2 KERB: the pit terrace on a cantilever, kerb-striped edge, a roaster drum
  const kerbTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d')!; for (let x = 0; x < 64; x += 16) { g.fillStyle = '#c8302a'; g.fillRect(x, 0, 8, 8); g.fillStyle = '#efe9dc'; g.fillRect(x + 8, 0, 8, 8); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t; })();
  const kerbRoom = room({ slug: 'kerb', level: 'L2 · Pit terrace', y: 12, face: Math.PI * 0.5, w: 16, d: 10, h: 5.4, out: 14, accent: 0x7a3cff, sign: 'KERB', signFont: 'italic 800 170px Antonio, sans-serif', panels: 2, light: 200, lightColor: 0xfff0dc });
  const kerbEdge = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 0.7), new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.6 })); kerbEdge.position.set(0, 0.25, 5.2); kerbRoom.add(kerbEdge);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 24).rotateZ(Math.PI / 2), chrome); drum.position.set(5, 1.8, 1); kerbRoom.add(drum);
  anchor('kerbDrum', 0, 0, 0);

  // L4 Deccan Night Run: an arcade bridge of lit arches, sodium on midnight
  const dnr = room({ slug: 'deccan', level: 'L4 · Arcade bridge', y: 24, face: -Math.PI * 0.5, w: 15, d: 9, h: 6, out: 13, wall: std(0x0c1640, 0.8, 0, { contour: 0 }), accent: 0xf3a521, sign: 'DECCAN NIGHT RUN', panels: 3, light: 220, lightColor: 0xffb340 });
  const archShape = (() => { const s = new THREE.Shape(); s.moveTo(-0.9, 0); s.lineTo(-0.9, 2.2); s.absarc(0, 2.2, 0.9, Math.PI, 0, true); s.lineTo(0.9, 0); return new THREE.ShapeGeometry(s, 12); })();
  const archLine = new THREE.EdgesGeometry(archShape);
  for (let i = 0; i < 6; i++) { const a = new THREE.LineSegments(archLine, new THREE.LineBasicMaterial({ color: new THREE.Color(0xf3a521).multiplyScalar(2.2), toneMapped: false })); a.scale.setScalar(0.55); a.position.set(-6 + i * 2.4, 0.05, 4.4); dnr.add(a); }

  // L7 Lotus: a half-finished wing, exposed beams on one half, a tower crane above
  const lotus = room({ slug: 'lotus', level: 'L7 · Cantilever', y: 37, face: Math.PI, w: 18, d: 11, h: 7, out: 13, accent: 0xe8c07a, panels: 3, light: 220, lightColor: 0xfff1dc });
  for (let i = 0; i < 4; i++) { lotus.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 7, 0.22), steel).translateX(2.6 + i * 2).translateY(3.5).translateZ(5.3)); }
  lotus.add(new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.22, 0.22), steel).translateX(5.6).translateY(6.6).translateZ(5.3));
  // scaffold netting on the unfinished half
  lotus.add(new THREE.Mesh(new THREE.PlaneGeometry(6.4, 7), new THREE.MeshBasicMaterial({ color: 0x2a6b3a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })).translateX(5.6).translateY(3.5).translateZ(5.5));
  const crane = new THREE.Group(); crane.position.set(13, 44, -17); root.add(crane);
  const craneMat = std(0xd8a43a, 0.6, 0.3, { contour: 0 });
  crane.add(new THREE.Mesh(new THREE.BoxGeometry(1, 70, 1), craneMat).translateY(35));
  const jib = new THREE.Mesh(new THREE.BoxGeometry(34, 0.8, 0.8), craneMat); jib.position.set(10, 70, 0); crane.add(jib);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 20), steel); hook.position.set(22, 60, 0); crane.add(hook);
  crane.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), glowMaterial(0xff3b30, 4)).translateY(71));

  // L11 REM: the after-hours floor, dark until dreaming, a pink hypnogram line
  const rem = room({ slug: 'rem', level: 'L11 · After hours', y: 52.5, face: Math.PI * 0.25, w: 13, d: 8, h: 5.6, out: 12, wall: std(0x07060d, 0.9, 0, { contour: 0 }), accent: 0xff4fa3, sign: 'REM', signFont: '600 180px Antonio, sans-serif', panels: 3, light: 120, lightColor: 0xff7fbf });
  const hyp = [0, 1, 1, 3, 3, 2, 2, 4, 4, 1, 1, 2, 2, 0];
  for (let i = 0; i < hyp.length - 1; i++) {
    const x0 = -6 + i * (12 / (hyp.length - 1)), x1 = -6 + (i + 1) * (12 / (hyp.length - 1));
    rem.add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.06, 0.06, 0.06), glowMaterial(hyp[i] === 1 ? 0xff4fa3 : 0xece6da, hyp[i] === 1 ? 4 : 1.4)).translateX((x0 + x1) / 2).translateY(5.1 - hyp[i] * 0.3).translateZ(3.9));
    if (hyp[i] !== hyp[i + 1]) rem.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, Math.abs(hyp[i] - hyp[i + 1]) * 0.3 + 0.06, 0.06), glowMaterial(0xece6da, 1.4)).translateX(x1).translateY(5.1 - (hyp[i] + hyp[i + 1]) * 0.15).translateZ(3.9));
  }

  // L14 CapQ: the glass atrium, gold chart lines etched into the glass
  const capq = room({ slug: 'capq', level: 'L14 · Atrium', y: 61, face: Math.PI * 1.25, w: 15, d: 12, h: 11, out: 12, floor: std(0x8f8b84, 0.3, 0, { contour: 0 }), wall: std(0xa9a59c, 0.7, 0, { contour: 0 }), accent: 0x22c55e, sign: 'CapQ', signFont: '600 170px Geist, sans-serif', panels: 2, glass: true, light: 150, lightColor: 0xfff6ea });
  const chartPts: THREE.Vector3[] = []; for (let i = 0; i <= 30; i++) chartPts.push(new THREE.Vector3(-6.5 + i * 0.43, 2 + Math.pow(i / 30, 1.6) * 7 + Math.sin(i * 1.3) * 0.4, 6.02));
  capq.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(chartPts), new THREE.LineBasicMaterial({ color: new THREE.Color(0xc9a86a).multiplyScalar(2.4), toneMapped: false })));
  for (let i = 0; i < 4; i++) capq.add(new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.03, 0.03), glowMaterial(0xc9a86a, 0.9)).translateY(2 + i * 2.4).translateZ(6.02));
  capq.add(new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2.2), std(0x1a1a1a, 0.3, 0.6, { contour: 0 })).translateY(1.2).translateZ(1));

  // L17 the clay floor: Mitti in terracotta, Maruneta on the loom wall
  room({ slug: 'mitti', level: 'L17 · Clay floor', y: 79, face: Math.PI * 0.08, w: 11, d: 8, h: 6, out: 11, floor: std(0x8a4a32, 0.8, 0, { contour: 0 }), wall: std(0xb4613f, 0.85, 0, { contour: 0 }), accent: 0xe8a070, sign: 'MITTI', signFont: '300 160px "Instrument Serif", serif', panels: 3, light: 200, lightColor: 0xffd2a8 });
  room({ slug: 'maruneta', level: 'L17 · Loom wall', y: 79, face: Math.PI * 0.62, w: 11, d: 8, h: 6, out: 11, floor: std(0x2a2f45, 0.8, 0, { contour: 0 }), wall: std(0xd9d2c3, 0.85, 0, { contour: 0 }), accent: 0x3a4fb0, sign: 'maruneta', signFont: '600 150px Geist, sans-serif', panels: 3, light: 200, lightColor: 0xf3ecdf });

  // L20 the signal floor: four new identities, one per face
  room({ slug: 'bsnl', level: 'L20 · Signal floor', y: 90, face: Math.PI * 1.55, w: 11, d: 7, h: 6, out: 10.5, wall: std(0x1a2fe0, 0.6, 0, { contour: 0 }), accent: 0xd8ff3a, sign: 'bsnl', signFont: '600 170px Geist, sans-serif', panels: 2, light: 200, lightColor: 0xdfe6ff });
  room({ slug: 'rujuvu', level: 'L20 · Signal floor', y: 90, face: Math.PI * 1.05, w: 11, d: 7, h: 6, out: 10.5, wall: std(0x1d1f24, 0.6, 0, { contour: 0 }), accent: 0xff6a1f, sign: 'rujuvu', signFont: '700 160px Geist, sans-serif', panels: 2, light: 200, lightColor: 0xfff0e2 });
  room({ slug: 'kosh', level: 'L20 · Signal floor', y: 96.5, face: Math.PI * 0.55, w: 11, d: 7, h: 5.5, out: 10.5, wall: std(0x5a2df0, 0.6, 0, { contour: 0 }), accent: 0xffc83a, sign: 'kosh', signFont: '800 170px Geist, sans-serif', panels: 2, light: 200, lightColor: 0xfff2da });
  room({ slug: 'lagrange', level: 'L20 · Signal floor', y: 96.5, face: Math.PI * 0.05, w: 11, d: 7, h: 5.5, out: 10.5, wall: std(0x0b0e18, 0.7, 0, { contour: 0 }), accent: 0xff7a2f, sign: 'LAGRANGE', signFont: '500 140px Geist, sans-serif', panels: 2, light: 160, lightColor: 0xdfe6ff });

  // ---- the crown: open concrete fins, a roof terrace, Photon Yard's spectral beacon, a flag
  const crown = new THREE.Group(); crown.position.y = 128; root.add(crown);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 16 + (i % 3) * 3, 3.4), concrete); fin.position.set(Math.cos(a) * 6, 8, Math.sin(a) * 6); fin.rotation.y = -a; crown.add(fin); }
  crown.add(new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.6, 32), concreteDark).translateY(0.3));
  const spectrum = [0xf2f2f2, 0x6f5bff, 0x3a8bff, 0x3fe0c5, 0xffd23a, 0xff5a3a];
  spectrum.forEach((c, i) => crown.add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.5, 0.5), glowMaterial(c, 3)).translateY(3 + i * 0.85).translateX(-0.3 * i).rotateY(0.2)));
  const beacon = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2d6).multiplyScalar(0.08), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beacon.position.y = 46; beacon.rotation.x = Math.PI; crown.add(beacon);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12), steel); flagPole.position.set(4, 10, 3); crown.add(flagPole);
  const flagTex = textTexture([{ text: 'SUMANTH', font: '500 120px Antonio, sans-serif', color: '#e6cc93', y: 128, spacing: 18 }], 1024, 256, '#0b0f1e');
  const flagGeo = new THREE.PlaneGeometry(6, 1.5, 24, 4); flagGeo.translate(3, 0, 0);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 })); flag.position.set(4, 15, 3); crown.add(flag);
  const flagBase = (flagGeo.getAttribute('position') as THREE.BufferAttribute).array.slice();
  const photon = IMG.photon;
  const crownHit = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 3)); crownHit.visible = false; crownHit.position.set(-1, 5, 0); crown.add(crownHit);
  if (photon?.cover) {
    const { mat, u } = imageMaterial(loadTexture(photon.cover), 1.3);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4), mat); pic.position.set(0, 4.2, 6.2); crown.add(pic); hovers.push({ slug: 'photon', u });
  }
  artefacts.push(makeArtefact('photon', crownHit, root, 1, 0.8));
  floors.push({ slug: 'photon', level: 'Crown · Beacon', y: 128, center: new THREE.Vector3(0, 133, 0), face: 0, view: new THREE.Vector3(0, 137, 26), look: new THREE.Vector3(0, 132, 0) });
  anchor('crown', 0, 134, 0);
  const crownLight = new THREE.PointLight(0xfff0dc, 260, 30, 1.6); crownLight.position.set(0, 140, 4); root.add(crownLight);

  // plaza paving
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), std(0x2d2c2f, 0.6, 0.1, { contour: 0, bump: 0.1, bumpScale: 2 }));
  plaza.position.y = 0.06; root.add(plaza);
  const streetLight = new THREE.PointLight(0xffd0a0, 380, 44, 1.5); streetLight.position.set(0, 9, 18); root.add(streetLight);

  // order the climb bottom to top
  const order = ['gcburger', 'kerb', 'deccan', 'lotus', 'rem', 'capq', 'mitti', 'maruneta', 'bsnl', 'rujuvu', 'kosh', 'lagrange', 'magma', 'photon'];
  floors.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

  function update(s: { t: number; crack: number; cursor?: THREE.Vector3; flagUnfurl: number }) {
    lava.u.uCrack.value = s.crack;
    if (s.cursor) lava.u.uCursor.value.copy(s.cursor);
    beacon.rotation.y = s.t * 0.2;
    // flag ripples (a cheap travelling wave)
    const p = flagGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = flagBase[i * 3], yv = flagBase[i * 3 + 1];
      const k = x / 6;
      p.setXYZ(i, x * (0.25 + 0.75 * s.flagUnfurl), yv - k * k * 0.3 * (1 - s.flagUnfurl), Math.sin(s.t * 4 - x * 1.2) * 0.25 * k);
    }
    p.needsUpdate = true;
    jib.rotation.y = Math.sin(s.t * 0.05) * 0.4;
    drum.rotation.x = s.t * 1.5;
  }
  return { root, anchors, artefacts, floors, update, hovers, lava, ready: Promise.resolve() };
}
