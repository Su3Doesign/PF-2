import './styles/main.css';
import * as THREE from 'three';
import Lenis from 'lenis';
import { App } from './core/app';
import { Rig, curve, span } from './core/voyage';
import { BEATS, TOTAL, beatAt, buildKeys, RAIL, storyFromScroll, scrollFromStory, SCROLL_TOTAL, DWELLS, dwellAt } from './core/story';
import { createSky } from './world/sky';
import { createClouds } from './world/clouds';
import { createMotes } from './world/motes';
import { createArchipelago, LAYOUT, type IslandId } from './world/archipelago';
import { createMachines, ENTRY_H, ENTRY_F, trackAt } from './world/machines';
import { LightPool } from './world/lights';
import { TinyCuller } from './world/cull';
import { createMonuments } from './world/monuments';
import { createWorlds } from './world/worlds';
import { createBrands } from './world/brands';
import { createFinale, LIGHTHOUSE, SEA_Y } from './world/finale';
import { G, PATCH } from './world/shared';
import { studioEnvironment, modelProgress, onLoadProgress } from './core/loaders';
import { UI } from './ui/ui';
import { Sound } from './audio/sound';
import { bySlug, works, profile } from './data';
import type { Artefact } from './world/artefact';

const params = new URLSearchParams(location.search);
const html = document.documentElement;
console.log(`%c
        .        *        .            ~ THE ARCHIPELAGO ~
   _/\\_      __/\\__        |>
  /____\\    /______\\      _|_        Looking under the hood?
   \\__/  ~~~ \\____/ ~~~  |___|       I wrote all of this. Say hello.
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   ${profile.email}
`, 'color:#c9a86a;font-family:monospace');

if (html.classList.contains('no-webgl')) {
  document.getElementById('loader')?.remove();
} else {
  try { boot(); } catch (e) { console.error(e); html.classList.add('no-webgl'); document.getElementById('loader')?.remove(); }
}

function boot() {
  const canvas = document.querySelector<HTMLCanvasElement>('#gl')!;
  const app = new App(canvas);
  const q = app.quality;
  PATCH.lite = q.tier < 3 && (q.mobile || q.tablet || q.tier === 1);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let calm = reduce;
  (window as any).__app = app;

  // ---------------------------------------------------------------- the world
  const sky = createSky(); app.scene.add(sky.mesh);
  const clouds = createClouds(q.clouds); app.scene.add(clouds.group);
  const motes = createMotes(q.motes); app.scene.add(motes.points);
  const arch = createArchipelago(app.scene, q);
  const env = studioEnvironment(app.renderer);
  const machines = createMachines(arch.islands.machines, env, q);
  const monuments = createMonuments(arch.islands.monuments, env, q);
  const worlds = createWorlds(arch.islands.worlds, env, q);
  const brands = createBrands(arch.islands.brands, env, q);
  const finale = createFinale(app.scene);
  app.scene.updateMatrixWorld(true);
  // a few real lights, handed each frame to the virtual lights nearest the camera
  const pool = new LightPool(app.scene, q.lights);
  pool.scan(app.scene);
  const culler = new TinyCuller();
  document.getElementById('voyage')!.style.height = `calc(${SCROLL_TOTAL}vh + 100vh)`;

  // the voyage route: a dotted gold line through the islands, shown from above
  const routePts = [new THREE.Vector3(30, 120, 700), LAYOUT.worlds.pos, LAYOUT.machines.pos, LAYOUT.monuments.pos, LAYOUT.brands.pos, new THREE.Vector3(LIGHTHOUSE.x, 60, LIGHTHOUSE.z)].map((p, i) => p.clone().add(new THREE.Vector3(0, i === 0 || i === 5 ? 0 : 6, 0)));
  const routeCurve = new THREE.CatmullRomCurve3(routePts, false, 'centripetal');
  const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(routeCurve.getPoints(400)), new THREE.LineDashedMaterial({ color: new THREE.Color(0xe3cc97).multiplyScalar(1.6), dashSize: 5, gapSize: 9, transparent: true, opacity: 0.9, toneMapped: false }));
  route.computeLineDistances(); app.scene.add(route);
  const stations = new THREE.InstancedMesh(new THREE.OctahedronGeometry(2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe3cc97).multiplyScalar(2.2), toneMapped: false }), 4);
  [LAYOUT.worlds.pos, LAYOUT.machines.pos, LAYOUT.monuments.pos, LAYOUT.brands.pos].forEach((p, i) => stations.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y + 6, p.z)));
  app.scene.add(stations);

  // artefacts arrive as models load; the flat list is rebuilt only when the count changes
  let artCache: Artefact[] = [];
  const artefacts = (): Artefact[] => {
    const n = machines.artefacts.length + monuments.artefacts.length + worlds.artefacts.length + brands.artefacts.length;
    if (n !== artCache.length) artCache = [...machines.artefacts, ...monuments.artefacts, ...worlds.artefacts, ...brands.artefacts];
    return artCache;
  };
  const contents: { id: IslandId; root: THREE.Object3D }[] = [
    { id: 'machines', root: machines.root }, { id: 'monuments', root: monuments.root }, { id: 'worlds', root: worlds.root }, { id: 'worlds', root: worlds.crag.group }, { id: 'brands', root: brands.root },
  ];
  const contentRoots = new Set(contents.map((c) => c.root));
  /** An artefact can be picked only while its island's contents are on stage. */
  const live = (a: Artefact) => { let o: THREE.Object3D | null = a.hit; while (o) { if (contentRoots.has(o)) return o.visible; o = o.parent; } return true; };

  // when frames stay long after resolution has stepped down, shed the costliest layers
  app.onDegrade = (level) => {
    const layers = clouds.group.children;
    if (level >= 1) layers.forEach((l, i) => { l.visible = i % 2 === 0; });
    if (level >= 2) { motes.points.geometry.setDrawRange(0, Math.floor(q.motes / 2)); arch.heroFall.points.geometry.setDrawRange(0, Math.floor(q.heroFall / 2)); }
    if (level >= 3) { layers.forEach((l, i) => { l.visible = i === 0; }); app.bloom.intensity = 0.7; }
  };

  // ---------------------------------------------------------------- the camera path
  const cragAt = (x: number, y: number, z: number) => worlds.crag.group.localToWorld(new THREE.Vector3(x, y, z));
  const race = { uH: ENTRY_H };
  const chase = (back: number, lift: number, side: number) => {
    const { p, t } = trackAt(race.uH); const n = new THREE.Vector3(-t.z, 0, t.x);
    return machines.root.localToWorld(p.addScaledVector(t, -back).addScaledVector(n, side).setY(p.y + lift));
  };
  const rig = new Rig(buildKeys(arch.islands, { cragView: cragAt, cragAt, road: monuments.road, roadParent: monuments.root, floors: brands.floors, towerRoot: brands.root, chase, estate: monuments.estateMarks }));

  // tower stops for the altimeter
  const floorVh: Record<string, number> = {};
  for (const b of BEATS) for (const s of b.works ?? []) if (bySlug[s]?.island === 'brands' && !(s in floorVh)) floorVh[s] = Math.round((b.from + b.to) / 2);
  const towerFloors = brands.floors.filter((f) => floorVh[f.slug] !== undefined).map((f) => ({ slug: f.slug, level: f.level, vh: floorVh[f.slug] }));

  // ---------------------------------------------------------------- timeline values
  const tod = curve([[0, 0], [1250, 0.06], [1700, 0.42], [1830, 0.6], [1900, 0.78], [1990, 0.9]]);
  const cloudDensity = curve([[0, 1], [1700, 1], [1835, 0.5], [1880, 0.0], [2000, 0.0]]);
  const fogNight = new THREE.Color(0x0a0f22), fogDawn = new THREE.Color(0x3a3048), fogC = new THREE.Color();

  // ---------------------------------------------------------------- scroll
  const vhPx = () => innerHeight;
  // touch is driven by Lenis too (syncTouch), so a release can be turned into exactly one step
  const coarse = matchMedia('(pointer: coarse)').matches;
  const lenis = new Lenis({ lerp: calm ? 1 : 0.08, wheelMultiplier: 0.75, touchMultiplier: 1.15, smoothWheel: !calm, syncTouch: coarse && !calm, syncTouchLerp: 0.09 });
  // vh is in story units; scroll covers more ground where there is more to see
  let vh = 0, vel = 0, speed = 0;
  lenis.on('scroll', (l: { scroll: number; velocity: number }) => { vh = storyFromScroll(l.scroll / vhPx() * 100); vel = l.velocity; });
  let flyTarget = -1;
  const fly = (target: number, dur = 2.2) => { flyTarget = target; lenis.scrollTo((scrollFromStory(target) / 100) * vhPx(), { duration: calm ? 0 : dur, easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) }); };
  let idle = 0, lastDir = 1, wasSailing = false, restFor = 0;
  // ---- stops: every work has a dwell; between them, scrolling never comes to rest
  /** Where to land in a dwell, entering it from below (dir 1) or above (dir -1). */
  const entry = (i: number, dir: number) => { const [a, b] = DWELLS[i]; return dir > 0 ? a + (b - a) * 0.15 : b - (b - a) * 0.15; };
  const step = (dir: number) => {
    const d = dwellAt(vh);
    let i = d.i;
    // from inside a dwell, go to the neighbour; from between two, go to the one ahead
    if (d.inside || (dir > 0 ? DWELLS[i][0] <= vh : DWELLS[i][1] >= vh)) i += dir;
    i = Math.max(0, Math.min(DWELLS.length - 1, i));
    fly(entry(i, dir), 1.3);
  };
  if (coarse && !calm) {
    let t0 = 0, v0 = 0;
    addEventListener('touchstart', () => { t0 = performance.now(); v0 = vh; }, { passive: true });
    addEventListener('touchend', (e) => {
      if ((e.target as HTMLElement).closest('[data-lenis-prevent], .panel, .menu, .list, .board, button, a') || openSlug) return;
      const dv = vh - v0, dt = (performance.now() - t0) / 1000;
      if (Math.abs(scrollFromStory(vh) - scrollFromStory(v0)) < 1.2) return;           // a tap
      const dir = Math.sign(dv), d0 = dwellAt(v0), d1 = dwellAt(vh);
      const flick = Math.abs(dv) / Math.max(0.05, dt) > 40;
      // a slow drag that ends inside a stop stays there; a flick, or a release in between, moves one stop
      if (d1.inside && !flick) return;
      let i = d0.inside ? d0.i + dir : (dir > 0 ? (DWELLS[d0.i][0] > v0 ? d0.i : d0.i + 1) : (DWELLS[d0.i][1] < v0 ? d0.i : d0.i - 1));
      i = Math.max(0, Math.min(DWELLS.length - 1, i));
      setTimeout(() => fly(entry(i, dir), 1.1), 0);   // after Lenis has set off its own inertia
    }, { passive: true });
  }
  addEventListener('keydown', (e) => {
    if (openSlug || (e.target as HTMLElement).closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.body.classList.contains('menu-open') || document.body.classList.contains('list-open')) return;
    const k = e.key;
    if (k === ' ' && (e.target as HTMLElement).closest('button, a, select')) return;
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); step(1); }
    else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); step(-1); }
  });
  document.getElementById('stepNext')?.addEventListener('click', () => step(1));
  document.getElementById('stepPrev')?.addEventListener('click', () => step(-1));

  // ---------------------------------------------------------------- interface
  const sound = new Sound();
  let openSlug: string | null = null;
  const inspect = { a: 0, target: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), art: null as Artefact | null, pending: '' };
  const ui = new UI({
    fly: (v) => { closePanel(); fly(v); },
    open: (slug) => openPanel(slug),
    close: () => closePanel(),
    sound: (on) => sound.enable(on),
    calm: (on) => { calm = on; lenis.options.lerp = on ? 1 : 0.085; ui.toast(on ? 'Calm mode: no camera flights' : 'Calm mode off'); },
    sfx: (n) => sound.play(n),
    map: () => { closePanel(); fly(1772); },
  });
  ui.buildAlt(towerFloors);

  function openPanel(slug: string) {
    const w = bySlug[slug]; if (!w) return;
    openSlug = slug;
    ui.openPanel(slug);
    sound.play('open');
    lenis.stop();
    G.uDim.value = 0;
    // the camera closes in on the work itself; if it lives elsewhere on the voyage, fly there first
    const beat = BEATS.find((b) => b.works?.includes(slug));
    inspect.art = null; inspect.target = 0;
    if (beat && (vh < beat.from || vh > beat.to)) { lenis.start(); fly((beat.from + beat.to) / 2, 1.8); inspect.pending = slug; }
    else beginInspect(slug);
    try { history.replaceState(null, '', `#${slug}`); } catch { /* ignore */ }
  }
  function beginInspect(slug: string) {
    inspect.pending = '';
    const art = artefacts().find((a) => a.slug === slug && live(a));
    if (!art) return;
    inspect.art = art; inspect.target = 1; lenis.stop();
    computeInspect(true);
  }
  const ib = new THREE.Box3(), ic = new THREE.Vector3(), isz = new THREE.Vector3(), idir = new THREE.Vector3(), iright = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let inspectDir = new THREE.Vector3();
  /** Frames the artefact to fill the left of the screen (the panel takes the right), and follows it if it moves. */
  function computeInspect(first = false) {
    const art = inspect.art; if (!art) return;
    // a tower room is framed from its own doorway (from outside, the walls would hide it)
    const room = brands.floors.find((f) => f.slug === art.slug && f.slug !== 'magma');
    if (room) {
      inspect.pos.copy(room.view); brands.root.localToWorld(inspect.pos);
      ic.copy(room.look); brands.root.localToWorld(ic);
      idir.copy(ic).sub(inspect.pos); const d = idir.length();
      iright.crossVectors(idir.normalize(), UP).normalize();
      inspect.look.copy(ic).addScaledVector(iright, innerWidth > 820 ? d * 0.2 : 0);
      return;
    }
    ib.setFromObject(art.hit); ib.getCenter(ic); ib.getSize(isz);
    const radius = Math.max(0.8, isz.length() * 0.5);
    const fovR = THREE.MathUtils.degToRad(app.camera.fov);
    const dist = radius / Math.sin(fovR / 2) * (innerWidth > 820 ? 0.95 : 1.25);
    if (first) { inspectDir.copy(app.camera.position).sub(ic).setY(0); if (inspectDir.lengthSq() < 1e-4) inspectDir.set(0, 0, 1); inspectDir.normalize(); }
    idir.copy(inspectDir).multiplyScalar(Math.cos(0.32)).add(UP.clone().multiplyScalar(Math.sin(0.32))).normalize();
    // S-3 only reads as an impossible triangle from one direction: inspect it from there
    const pen = art.slug === 's3' ? app.scene.getObjectByName('penrose') : undefined;
    if (pen) {
      // the line through the bars' first corner along their (1,1,1) diagonal: anywhere on it, the triangle closes
      idir.set(1, 1, 1).normalize().applyQuaternion(pen.getWorldQuaternion(new THREE.Quaternion()));
      pen.getWorldPosition(isz);
      const along = ic.clone().sub(isz).dot(idir);
      inspect.pos.copy(isz).addScaledVector(idir, along + dist);
      iright.crossVectors(idir.clone().negate(), UP).normalize();
      inspect.look.copy(ic).addScaledVector(iright, innerWidth > 820 ? dist * 0.24 : 0);
      return;
    }
    inspect.pos.copy(ic).addScaledVector(idir, dist);
    iright.crossVectors(idir.clone().negate(), UP).normalize();
    inspect.look.copy(ic).addScaledVector(iright, innerWidth > 820 ? dist * 0.24 : 0);
  }
  function closePanel() {
    inspect.pending = '';
    if (!openSlug) return;
    openSlug = null; ui.closePanel(); inspect.target = 0; inspect.art = null; lenis.start();
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
  }

  // ---------------------------------------------------------------- picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-9, -9);
  let pointerOnCanvas = false, hoverSlug: string | null = null, downAt = 0, pressing = false;
  const pointer = new THREE.Vector2();
  addEventListener('pointermove', (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    pointer.set(e.clientX, e.clientY);
    pointerOnCanvas = e.target === canvas || (e.target as HTMLElement).id === 'voyage' || (e.target as HTMLElement).closest('#voyage') !== null;
  }, { passive: true });
  const pick = () => {
    if (!pointerOnCanvas || openSlug) return null;
    ray.setFromCamera(ndc, app.camera);
    const hits = ray.intersectObjects(artefacts().filter(live).map((a) => a.hit), false);
    for (const h of hits) { if (h.distance < 320) return h.object.userData.slug as string; }
    return null;
  };
  canvas.style.pointerEvents = 'auto';
  document.getElementById('voyage')!.style.pointerEvents = 'none';
  addEventListener('pointerdown', (e) => { if (e.target !== canvas) return; downAt = performance.now(); pressing = true; dragging = false; dragStart.set(e.clientX, e.clientY); });
  addEventListener('pointerup', (e) => {
    pressing = false;
    if (e.target !== canvas || dragging) { dragging = false; return; }
    if (performance.now() - downAt > 400) return;
    const s = pick();
    if (s) { openPanel(s); return; }
    eggClick();
  });

  // map dragging (and the Machines track scrub)
  let dragging = false; const dragStart = new THREE.Vector2(); const mapPan = new THREE.Vector2(); const mapVel = new THREE.Vector2();
  addEventListener('pointermove', (e) => {
    if (!pressing || openSlug) return;
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.hypot(dx, dy) > 6) dragging = true;
    if (dragging && G.uChart.value > 0.5) { mapVel.set(-e.movementX * 2.2, -e.movementY * 2.2); mapPan.add(mapVel); }
  });

  // ---------------------------------------------------------------- easter eggs
  const konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let kbuf: string[] = [], typed = '';
  let wire = false, flagUp = false, reverseUntil = 0, clicks: number[] = [], lampEgg = false, goldKoi = false, fed = 0;
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    kbuf = [...kbuf, k].slice(-10);
    if (kbuf.join() === konami.join()) { wire = !wire; app.scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial; if (m && 'wireframe' in m && (m as any).isMeshStandardMaterial) m.wireframe = wire; }); ui.toast(wire ? 'Viewport shading: wireframe' : 'Viewport shading: material'); }
    if (k.length === 1) { typed = (typed + k).slice(-7); if (typed === 'sumanth') { flagUp = true; ui.toast('Flag hoisted on the crown'); sound.play('chime'); } }
  });
  function eggClick() {
    const now = performance.now();
    clicks = [...clicks.filter((t) => now - t < 900), now];
    // the 2,142nd lamp
    ray.setFromCamera(ndc, app.camera);
    const lh = ray.intersectObject(monuments.lamps, false)[0];
    if (lh && lh.instanceId === 1377 && !lampEgg) { lampEgg = true; ui.toast('2,142 — one for you'); sound.play('chime'); return; }
    // koi: a click on the pond drops a ripple
    const ph = ray.intersectObject(worlds.pond, false)[0];
    if (ph) { worldsState.ripple = arch.islands.worlds.group.worldToLocal(ph.point.clone()); sound.play('splash'); fed += 10; if (fed >= 100 && !goldKoi) { goldKoi = true; ui.toast('A golden koi rises'); sound.play('chime'); } return; }
    if (clicks.length >= 3) { reverseUntil = now + 10000; clicks = []; ui.toast('The falls run upward'); }
  }
  // real time: dawn hour and meteor nights (IST)
  const ist = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000);
  const istMin = ist.getHours() * 60 + ist.getMinutes();
  const dawnHour = istMin >= 330 && istMin < 390;
  const meteorNight = istMin >= 1380 || istMin < 60;
  let returning = false; try { returning = localStorage.getItem('arch-visited') === '1'; localStorage.setItem('arch-visited', '1'); } catch { /* ignore */ }
  let lapStart = 0, lapRecordT = 0, idleKerb = 0, welcomed = false, foghorned = false;

  // ---------------------------------------------------------------- state
  const mState = { uH: ENTRY_H, uF: ENTRY_F, park: 0, explode: 0, wire: 0.5, speed: 0, t: 0 };
  let drift = 0;
  const worldsState: { t: number; stir: number; feed: number; goldKoi: boolean; ripple?: THREE.Vector3 } = { t: 0, stir: 0, feed: 0, goldKoi: false };
  const sunDir = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const parallax = new THREE.Vector2();
  let lastBeat = '';

  const floorIslands = [...(Object.keys(LAYOUT) as IslandId[]).map((id) => ({ group: arch.islands[id].group, r: LAYOUT[id].radius })), { group: worlds.crag.group, r: 30 }];
  const floorV = new THREE.Vector3(), towerV = new THREE.Vector3(), wpTmp = new THREE.Vector3();
  const placed: [number, number][] = [];
  const project = (v: THREE.Vector3) => { tmp.copy(v).project(app.camera); return { x: (tmp.x * 0.5 + 0.5) * innerWidth, y: (-tmp.y * 0.5 + 0.5) * innerHeight, vis: tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15 }; };

  app.onFrame((dt, t) => {
    if (calm) { vel = 0; }
    speed += (Math.min(1, Math.abs(vel) / 60) - speed) * 0.08;
    const beat = beatAt(vh);
    ui.setBeat(beat);
    if (beat.id !== lastBeat) { lastBeat = beat.id; onBeat(beat.id); }

    // phones and tablets drop to 30 fps while resting on a stop: half the heat, so no throttling later
    if ((q.mobile || q.tablet) && !calm) { restFor = Math.abs(vel) < 0.05 && !pressing && !dragging ? restFor + dt : 0; app.fpsCap = restFor > 1.2 ? 30 : 0; }
    const sailing = vh > 40 && vh < 1985 && !openSlug;
    if (sailing !== wasSailing) { wasSailing = sailing; document.body.classList.toggle('sailing', sailing); }
    // when scrolling stops between two stops, settle into the one you were heading for
    if (Math.abs(vel) > 0.05) lastDir = Math.sign(vel);
    if (Math.abs(vel) < 0.2 && !openSlug && !calm && !pressing) { idle += dt; } else idle = 0;
    if (idle > 0.32 && Math.abs(vh - flyTarget) > 0.5) {
      const d = dwellAt(vh);
      if (!d.inside) {
        const [a, b] = DWELLS[d.i];
        const ahead = lastDir > 0 ? (a > vh ? d.i : d.i + 1) : (b < vh ? d.i : d.i - 1);
        const behind = lastDir > 0 ? ahead - 1 : ahead + 1;
        // most of the way through a travel, carry on; just set off, fall back
        const i0 = Math.max(0, Math.min(DWELLS.length - 1, behind)), i1 = Math.max(0, Math.min(DWELLS.length - 1, ahead));
        const s0 = scrollFromStory(lastDir > 0 ? DWELLS[i0][1] : DWELLS[i0][0]), s1 = scrollFromStory(lastDir > 0 ? DWELLS[i1][0] : DWELLS[i1][1]), sn = scrollFromStory(vh);
        const k = Math.abs(sn - s0) / Math.max(1, Math.abs(s1 - s0));
        const i = k > 0.25 ? i1 : i0;
        fly(entry(i, k > 0.25 ? lastDir : -lastDir), 1.0);
      }
      idle = -1;   // once per rest
    }

    // ---- island state
    mState.t = t;
    // the race is a function of scroll, so the cars always reach their pit entries at 690;
    // idling adds laps, and the fade into the pits only ever completes a lap, never rewinds one
    if (vh > 560 && vh < 690 && !openSlug) drift += dt * 0.03 * (1 - Math.min(1, Math.abs(vel) / 4));
    const toPit = span(vh, 664, 690);
    const lapFix = drift + (Math.ceil(drift) - drift) * toPit;
    const raceK = Math.min(0, vh - 690) / 110;
    mState.uH = ENTRY_H + raceK * 1.5 + (vh < 690 ? lapFix : 0);
    mState.uF = ENTRY_F + raceK * 1.7 + (vh < 690 ? lapFix * 1.1 - (Math.ceil(lapFix * 1.1) - lapFix * 1.1) * 0 : 0);
    if (vh >= 690) drift = 0;
    race.uH = mState.uH;
    mState.park = span(vh, 690, 716);
    mState.explode = span(vh, 742, 756);
    mState.wire = 1 - span(vh, 766, 782);
    mState.speed = speed;
    machines.update(mState);
    monuments.update({ t, lampsLit: lampEgg ? 1 : span(vh, 1126, 1198), headTurn: -0.5 + span(vh, 960, 1030) * 1.2, gold: span(vh, 1012, 1030) * 0.9 + 0.05, allLamps: lampEgg });
    worldsState.t = t; worldsState.goldKoi = goldKoi;
    worldsState.stir += ((pressing && vh > 255 && vh < 345 ? 1 : 0) - worldsState.stir) * 0.05;
    if (pressing && vh > 255 && vh < 345 && !dragging) { fed += dt * 18; if (fed >= 100 && !goldKoi) { goldKoi = true; ui.toast('A golden koi rises'); sound.play('chime'); } }
    worldsState.feed = worldsState.stir;
    worlds.update(worldsState);
    ray.setFromCamera(ndc, app.camera);
    brands.update({ t, crack: 0.2 + span(vh, 1625, 1665) * 0.6, cursor: vh > 1620 && vh < 1670 ? ray.ray.at(6, new THREE.Vector3()) : undefined, flagUnfurl: flagUp ? 1 : span(vh, 1672, 1694) });

    // ---- camera
    rig.sample(vh);
    camPos.copy(rig.pos); camLook.copy(rig.look);
    // the map: inertial pan
    if (G.uChart.value > 0.01) { mapVel.multiplyScalar(0.9); if (!pressing) mapPan.add(mapVel); mapPan.clampScalar(-500, 500); camPos.x += mapPan.x * G.uChart.value; camPos.z += mapPan.y * G.uChart.value; camLook.x += mapPan.x * G.uChart.value; camLook.z += mapPan.y * G.uChart.value; }
    else mapPan.multiplyScalar(0.92);
    // gentle cursor parallax
    parallax.lerp(ndc.x > -2 ? ndc : new THREE.Vector2(), 0.04);
    if (!calm) { const right = new THREE.Vector3().subVectors(camLook, camPos).cross(new THREE.Vector3(0, 1, 0)).normalize(); const k = camPos.distanceTo(camLook) * 0.012; camPos.addScaledVector(right, parallax.x * k); camPos.y += parallax.y * k * 0.6; }
    if (inspect.pending && Math.abs(vh - flyTarget) < 1.5 && Math.abs(vel) < 0.5) beginInspect(inspect.pending);
    if (inspect.art) computeInspect();
    inspect.a += (inspect.target - inspect.a) * (1 - Math.exp(-dt * 2.6));
    if (inspect.a > 0.001 && inspect.pos.lengthSq() > 0) { const k = inspect.a * inspect.a * (3 - 2 * inspect.a); camPos.lerp(inspect.pos, k); camLook.lerp(inspect.look, k); }
    // never below an island's surface
    // (not on the Altair road, which is cut into the cliff below the terrace)
    const onRoad = vh > 1122 && vh < 1235;
    for (const isl of floorIslands) {
      if (onRoad && isl.group === arch.islands.monuments.group) continue;
      floorV.copy(camPos); isl.group.worldToLocal(floorV);
      if (floorV.y < 0.9 && floorV.y > -30 && (floorV.x / (isl.r * 1.2)) ** 2 + (floorV.z / (isl.r * 1.0)) ** 2 < 1) { floorV.y = 0.9; camPos.copy(isl.group.localToWorld(floorV)); }
    }
    // portrait screens: keep the landscape framing's width with a wider lens and a small dolly back
    let fov = rig.fov;
    const aspect = app.camera.aspect;
    if (aspect < 1.2) {
      const hWant = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 1.6) * (aspect < 0.8 ? 0.82 : 0.92);
      const vNeed = 2 * Math.atan(Math.tan(hWant / 2) / aspect);
      const vGot = Math.min(vNeed, THREE.MathUtils.degToRad(G.uChart.value > 0.5 ? 40 : 62));
      const hGot = 2 * Math.atan(Math.tan(vGot / 2) * aspect);
      const k = Math.tan(hWant / 2) / Math.tan(hGot / 2);
      if (k > 1.001) camPos.sub(camLook).multiplyScalar(Math.min(k, 2.4)).add(camLook);
      fov = THREE.MathUtils.radToDeg(vGot);
    }
    app.camera.position.copy(camPos);
    app.camera.up.set(0, 1, 0);
    if (G.uChart.value > 0.5) app.camera.up.set(0, 0, -1);
    app.camera.lookAt(camLook);
    if (Math.abs(app.camera.fov - fov) > 0.01) { app.camera.fov = fov; app.camera.updateProjectionMatrix(); }
    G.uDim.value += ((openSlug ? 0.35 : 0) - G.uDim.value) * 0.06;

    // ---- sky, light and time of day
    let T = tod(vh); if (dawnHour) T = Math.max(T, 0.5);
    G.uTod.value = T;
    sunDir.set(0, -0.06 + T * 0.13, -1).normalize();
    sky.uniforms.uTime.value = t; sky.uniforms.uTod.value = T; sky.uniforms.uSunDir.value.copy(sunDir);
    sky.uniforms.uChart.value = G.uChart.value;
    if (meteorNight) sky.uniforms.uMeteor.value = (t % 40) / 1.2 < 1 ? (t % 40) / 1.2 : 0;
    clouds.uniforms.uTime.value = t; clouds.uniforms.uTod.value = T; clouds.uniforms.uCamPos.value.copy(camPos); clouds.uniforms.uSunDir.value.copy(sunDir);
    clouds.uniforms.uDensity.value = cloudDensity(vh); clouds.uniforms.uChart.value = G.uChart.value;
    clouds.uniforms.uWake.value = Math.max(0, 1 - Math.abs(camPos.y + 30) / 40);
    fogC.copy(fogNight).lerp(fogDawn, THREE.MathUtils.smoothstep(T, 0.5, 1));
    (app.scene.fog as THREE.FogExp2).color.copy(fogC); clouds.uniforms.uFogColor.value.copy(fogC);
    (app.scene.fog as THREE.FogExp2).density = 0.00085 * (1 - G.uChart.value) * (1 - span(vh, 1840, 1900) * 0.7);
    arch.moon.intensity = 1.6 * (1 - THREE.MathUtils.smoothstep(T, 0.6, 1)) + 0.2;
    arch.hemi.intensity = 0.55 + T * 0.5;
    app.bloom.intensity = 1.15 - span(vh, 1830, 1900) * 0.45;
    arch.hemi.color.setRGB(0.13 + T * 0.5, 0.19 + T * 0.3, 0.36 - T * 0.05);

    // ---- chart mode
    const chart = span(vh, 1712, 1742) * (1 - span(vh, 1800, 1830));
    G.uChart.value = chart;
    route.material.opacity = Math.max(chart, 1 - span(vh, 40, 160)) * 0.9;
    route.visible = route.material.opacity > 0.01;
    stations.visible = route.visible;
    ui.showChart(chart > 0.5);

    // ---- particles
    motes.uniforms.uTime.value = t; motes.uniforms.uCam.value.copy(camPos); motes.uniforms.uPx.value = app.renderer.getPixelRatio();
    motes.uniforms.uRayO.value.copy(ray.ray.origin); motes.uniforms.uRayD.value.copy(ray.ray.direction);
    motes.uniforms.uAlpha.value = 1 - chart; motes.uniforms.uSpeed.value = speed; motes.uniforms.uWarm.value = T; motes.uniforms.uFreeze.value = calm ? 1 : 0;
    for (const f of [arch.falls, arch.heroFall]) {
      f.uniforms.uTime.value = t; f.uniforms.uPx.value = app.renderer.getPixelRatio();
      f.uniforms.uRayO.value.copy(ray.ray.origin); f.uniforms.uRayD.value.copy(ray.ray.direction);
      f.uniforms.uReverse.value = performance.now() < reverseUntil ? 1 : 0; f.uniforms.uChart.value = chart; f.uniforms.uFreeze.value = calm ? 1 : 0;
    }

    // ---- finale
    const beamSweep = vh < 1930 ? t * 1.05 : THREE.MathUtils.lerp(t * 1.05, -Math.PI / 2 + 0.42, span(vh, 1930, 1950));
    const lock = span(vh, 1932, 1952);
    finale.update({ t, tod: T, cam: camPos, beamAngle: lock > 0.99 ? -Math.PI / 2 + 0.42 : beamSweep, beamI: 0.7 + lock * 0.6 });
    finale.group.visible = vh > 1700 || camPos.y < 0;
    if (lock > 0.99 && !foghorned) { foghorned = true; sound.play('foghorn'); }
    if (vh < 1900) foghorned = false;
    ui.showFooter(vh > 1938);

    // ---- island content culling
    for (const c of contents) {
      const d = LAYOUT[c.id].pos.distanceTo(camPos);
      c.root.visible = d < 560 || chart > 0.01 || vh < 140;
    }
    // inside the tower's footprint (the climb into the molten core), the walls step aside
    towerV.copy(camPos); brands.root.worldToLocal(towerV);
    const inCore = Math.hypot(towerV.x, towerV.z) < 11 && towerV.y > 1 && towerV.y < 127;
    for (const o of brands.exterior) o.visible = !inCore;
    pool.update(camPos, dt);
    culler.update(app.camera, innerHeight * Math.min(devicePixelRatio, 2), q.tier === 3 ? 0.8 : 1.2, readyAll ? 400 : 0);

    // ---- DOM: hero, labels, tags, pins, readouts
    ui.setHero(span(vh, 0, 90));
    ui.setRail(Math.min(1, vh / TOTAL), beat.island === 'transit' ? '' : beat.island === 'map' ? '' : beat.island ?? '');
    const showIslandLabels = (vh < 150 && innerWidth > 720) || chart > 0.5;
    for (const id of Object.keys(LAYOUT) as IslandId[]) {
      const p = project(tmp.copy(LAYOUT[id].pos).add(new THREE.Vector3(0, chart > 0.5 ? 0 : -LAYOUT[id].radius * 0.95, 0)));
      ui.placeIslandLabel(id, p.x, p.y + (chart > 0.5 ? 40 : 0), showIslandLabels && p.vis ? 1 - span(vh, 60, 140) * (1 - chart) : 0);
    }
    // the tower room the lens is in (nearest stop, by distance to each room's camera)
    let towerFloor: (typeof brands.floors)[number] | null = null;
    if (vh > 1240 && vh < 1720) {
      towerV.copy(camPos); brands.root.worldToLocal(towerV); let best = Infinity;
      for (const f of brands.floors) { if (f.slug === 'magma') continue; const d = f.view.distanceTo(towerV); if (d < best) { best = d; towerFloor = f; } }
    }
    // labels for this stop's works: kept clear of the HUD, the works column and each other
    const keep = new Set<string>();
    if (!openSlug && chart < 0.5 && innerWidth > 720) {
      placed.length = 0;
      const right = innerWidth - Math.min(420, innerWidth * 0.3);
      for (const a of artefacts()) {
        if (!(beat.works ?? []).includes(a.slug) || !live(a)) continue;
        a.label.getWorldPosition(wpTmp);
        if (wpTmp.distanceTo(camPos) > 220) continue;
        // in the tower, only the floor the lens is on (other floors are behind concrete)
        if (vh > 1240 && vh < 1625 && towerFloor) { floorV.copy(wpTmp); brands.root.worldToLocal(floorV); if (floorV.distanceTo(towerFloor.center) > 16) continue; }
        const p = project(wpTmp);
        if (!p.vis) continue;
        const x = Math.max(110, Math.min(right - 100, p.x)), y = Math.max(150, Math.min(innerHeight - 140, p.y));
        if (Math.abs(x - p.x) > 140 || Math.abs(y - p.y) > 160) continue;
        if (placed.some(([px, py]) => Math.abs(px - x) < 190 && Math.abs(py - y) < 70)) continue;
        placed.push([x, y]);
        keep.add(a.slug);
        ui.placeTag(a.slug, x, y, true, hoverSlug === a.slug);
      }
    }
    ui.hideTagsExcept(keep);
    // map pins: every artefact on the chart
    if (chart > 0.3) {
      for (const a of artefacts()) {
        const p = project(a.hit.getWorldPosition(wpTmp));
        const el = ui.pin(a.slug); el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`; el.style.display = p.vis ? '' : 'none';
      }
    }
    // hover picking (throttled to every other frame)
    if ((Math.round(t * 60) & 1) === 0) {
      const s = pick();
      if (s !== hoverSlug) { hoverSlug = s; ui.hover(s); if (s) sound.play('tick'); }
    }
    // readouts
    const lapOn = vh > 618 && vh < 692;
    ui.showReadout('lap', lapOn);
    if (lapOn) { if (lapStart === 0) lapStart = t; ui.setLap((t - lapStart) % 60, speed); if (speed > 0.92) { lapRecordT += dt; if (lapRecordT > 2) { lapRecordT = -999; ui.toast('New lap record'); try { localStorage.setItem('arch-lap', String(t - lapStart)); } catch { /* ignore */ } } } }
    const roadOn = vh > 1124 && vh < 1212;
    ui.showReadout('counter', roadOn);
    if (roadOn) { const k = span(vh, 1126, 1198); if (k < 0.999) ui.setCounter('Lamps', Math.round(k * 2141 + (lampEgg ? 1 : 0)), 2141); else ui.setCounter(vh < 1205 ? 'Trees' : 'Cameras', vh < 1205 ? 808 : 52); }
    const towerOn = vh > 1272 && vh < 1708;
    ui.showReadout('alt', towerOn);
    if (towerOn) {
      // the floor the lens is level with, not the first work of the beat
      const metres = (camPos.y - LAYOUT.brands.pos.y) * 2.2; const fl = towerFloor;
      const inCoreNow = vh > 1625 && vh < 1672;
      ui.setAlt(Math.max(0, metres), inCoreNow ? 'magma' : fl?.slug ?? '', inCoreNow ? 'Core shaft' : fl?.level ?? '');
    }
    if (beat.id === 'kerb' && Math.abs(vel) < 0.05) { idleKerb += dt; if (idleKerb > 20) { idleKerb = -999; ui.toast('Pit stop: a mechanic brings you a coffee'); } } else if (idleKerb > 0) idleKerb = 0;
    if (beat.id === 'gate' && returning && !welcomed) { welcomed = true; ui.toast('Welcome back. She remembers you.'); }
    // the wall into the molten core: a flash as the crack opens
    ui.flash(Math.max(0, 1 - Math.abs(vh - 1627) / 4) * 0.9);

    // ---- sound
    const isl = beat.island ?? '';
    sound.mix({
      bed: 0.5, worlds: isl === 'worlds' ? 0.7 : 0, machines: isl === 'machines' ? 0.7 : 0, monuments: isl === 'monuments' ? 0.6 : 0,
      brands: isl === 'brands' && beat.id !== 'magma' ? 0.6 : 0, magma: beat.id === 'magma' ? 0.6 + span(vh, 1625, 1665) * 0.4 : 0, sea: vh > 1830 ? 0.7 : 0,
    }, speed, vh > 600 && vh < 692 ? 0.4 + speed : 0);
    ui.tickCursor();
  });

  function onBeat(id: string) {
    if (id === 'shrine') sound.play('bell');
    if (id === 'map') { sound.play('whoosh'); }
  }

  // ---------------------------------------------------------------- loading and entry
  const needed = ['hyperion', 'f1', 'agera', 'helmet', 'head', 'camera', 'gate', 'castle', 'altair'];
  let shown = 0, readyAll = false;
  const slowT = setTimeout(() => document.getElementById('ldSlow')?.classList.add('on'), 6000);
  const tickLoad = () => {
    const p = modelProgress(needed);
    shown += (Math.max(p, shown) - shown) * 0.2;
    ui.setLoad(Math.min(readyAll ? 1 : 0.97, shown));
    if (!readyAll) requestAnimationFrame(tickLoad);
  };
  onLoadProgress(() => {});
  tickLoad();
  Promise.all([machines.ready, monuments.ready, worlds.ready, document.fonts.ready]).then(() => {
    readyAll = true; clearTimeout(slowT); ui.setLoad(1);
    pool.scan(app.scene);
    culler.scan(app.scene);
    // compile everything up front so the first flight never hitches
    app.renderer.compile(app.scene, app.camera);
    if (params.has('skipintro') || params.has('still')) { document.getElementById('loader')?.remove(); enter(false); return; }
    let remembered = false; try { remembered = localStorage.getItem('arch-sound') === '1'; } catch { /* ignore */ }
    ui.ready((s) => enter(s || remembered));
  });
  function enter(withSound: boolean) {
    ui.heroIn();
    if (withSound) { sound.enable(true); ui.setSound(true); }
    const hash = location.hash.slice(1);
    if (hash && bySlug[hash]) setTimeout(() => openPanel(hash), 600);
    // ?to=<slug>: fly to the work on the voyage (from a case-study page)
    const to = params.get('to');
    const b = to ? BEATS.find((x) => x.works?.includes(to)) : null;
    if (b) setTimeout(() => fly((b.from + b.to) / 2, 3.2), 400);
    const v = Number(params.get('vh'));
    if (v) { window.scrollTo(0, (scrollFromStory(v) / 100) * innerHeight); vh = v; }
    (window as any).__ready = true;
  }

  // context loss: a fog card, then resume where we were
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); document.getElementById('fog')?.classList.add('on'); });
  canvas.addEventListener('webglcontextrestored', () => { document.getElementById('fog')?.classList.remove('on'); });

  // the frame loop drives Lenis too
  app.onFrame(() => lenis.raf(performance.now()));
  // in still mode, a test harness sets vh and renders once
  (window as any).__go = (v: number, t = 20) => { vh = v; window.scrollTo(0, (scrollFromStory(v) / 100) * innerHeight); for (let i = 0; i < 3; i++) app.renderOnce(t + i / 60); };
  (window as any).__open = openPanel;
  (window as any).__state = () => ({ vh, vel });
  void works; void RAIL; void SEA_Y;
}
