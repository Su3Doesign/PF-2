import './styles/main.css';
import * as THREE from 'three';
import Lenis from 'lenis';
import { App } from './core/app';
import { Rig, curve, span } from './core/voyage';
import { BEATS, TOTAL, beatAt, buildKeys, RAIL } from './core/story';
import { createSky } from './world/sky';
import { createClouds } from './world/clouds';
import { createMotes } from './world/motes';
import { createArchipelago, LAYOUT, type IslandId } from './world/archipelago';
import { createMachines } from './world/machines';
import { createMonuments } from './world/monuments';
import { createWorlds } from './world/worlds';
import { createBrands } from './world/brands';
import { createFinale, LIGHTHOUSE, SEA_Y } from './world/finale';
import { G } from './world/shared';
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

  // the voyage route: a dotted gold line through the islands, shown from above
  const routePts = [new THREE.Vector3(30, 120, 700), LAYOUT.worlds.pos, LAYOUT.machines.pos, LAYOUT.monuments.pos, LAYOUT.brands.pos, new THREE.Vector3(LIGHTHOUSE.x, 60, LIGHTHOUSE.z)].map((p, i) => p.clone().add(new THREE.Vector3(0, i === 0 || i === 5 ? 0 : 6, 0)));
  const routeCurve = new THREE.CatmullRomCurve3(routePts, false, 'centripetal');
  const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(routeCurve.getPoints(400)), new THREE.LineDashedMaterial({ color: new THREE.Color(0xe3cc97).multiplyScalar(1.6), dashSize: 5, gapSize: 9, transparent: true, opacity: 0.9, toneMapped: false }));
  route.computeLineDistances(); app.scene.add(route);
  const stations = new THREE.InstancedMesh(new THREE.OctahedronGeometry(2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe3cc97).multiplyScalar(2.2), toneMapped: false }), 4);
  [LAYOUT.worlds.pos, LAYOUT.machines.pos, LAYOUT.monuments.pos, LAYOUT.brands.pos].forEach((p, i) => stations.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y + 6, p.z)));
  app.scene.add(stations);

  const artefacts = (): Artefact[] => [...machines.artefacts, ...monuments.artefacts, ...worlds.artefacts, ...brands.artefacts];
  const contents: { id: IslandId; root: THREE.Object3D }[] = [
    { id: 'machines', root: machines.root }, { id: 'monuments', root: monuments.root }, { id: 'worlds', root: worlds.root }, { id: 'brands', root: brands.root },
  ];

  // ---------------------------------------------------------------- the camera path
  // the chase camera rides behind and above the Hyperion, looking past it down the track
  const carPos = () => { const a = machines.trackAt(mState.race - 0.05).p.clone(); const b = machines.trackAt(mState.race).p; a.lerp(b, 0.1).add(new THREE.Vector3(0, 2.6, 0)); const side = machines.trackAt(mState.race - 0.05).t; a.add(new THREE.Vector3(side.z, 0, -side.x).multiplyScalar(2.2)); return arch.islands.machines.group.localToWorld(a); };
  const carAhead = () => arch.islands.machines.group.localToWorld(machines.trackAt(mState.race + 0.03).p.clone().add(new THREE.Vector3(0, 0.6, 0)));
  const rig = new Rig(buildKeys(arch.islands, { carPos, carAhead, road: monuments.road, roadParent: monuments.root, floors: brands.floors, towerRoot: brands.root }));

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
  const lenis = new Lenis({ lerp: calm ? 1 : 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4, smoothWheel: !calm });
  let vh = 0, vel = 0, speed = 0;
  lenis.on('scroll', (l: { scroll: number; velocity: number }) => { vh = l.scroll / vhPx() * 100; vel = l.velocity; });
  const fly = (target: number, dur = 2.2) => lenis.scrollTo((target / 100) * vhPx(), { duration: calm ? 0 : dur, easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  let snapped = -1, idle = 0;

  // ---------------------------------------------------------------- interface
  const sound = new Sound();
  let openSlug: string | null = null;
  const inspect = { a: 0, target: 0, pos: new THREE.Vector3(), look: new THREE.Vector3() };
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
    // inspect pose: frame the artefact on the left of the screen
    const art = artefacts().find((a) => a.slug === slug);
    const cam = app.camera;
    if (art && art.hit.getWorldPosition(new THREE.Vector3()).distanceTo(cam.position) < 260) {
      const c = art.hit.getWorldPosition(new THREE.Vector3());
      const box = new THREE.Box3().setFromObject(art.hit); const r = box.getSize(new THREE.Vector3()).length() * 0.62;
      const dir = cam.position.clone().sub(c).setY(0).normalize();
      const d = Math.max(r * 1.6, 6);
      inspect.pos.copy(c).addScaledVector(dir, d).add(new THREE.Vector3(0, r * 0.35, 0));
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      inspect.look.copy(c).addScaledVector(right, innerWidth > 820 ? d * 0.32 : 0);
      inspect.target = 1;
    } else inspect.target = 0.0001;
    try { history.replaceState(null, '', `#${slug}`); } catch { /* ignore */ }
  }
  function closePanel() {
    if (!openSlug) return;
    openSlug = null; ui.closePanel(); inspect.target = 0; lenis.start();
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
    const hits = ray.intersectObjects(artefacts().filter((a) => a.hit.parent?.visible !== false).map((a) => a.hit), false);
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
  const mState = { p: 0, race: 0, park: 0, explode: 0, wire: 0.5, speed: 0, t: 0 };
  const worldsState: { t: number; stir: number; feed: number; goldKoi: boolean; ripple?: THREE.Vector3 } = { t: 0, stir: 0, feed: 0, goldKoi: false };
  const sunDir = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const parallax = new THREE.Vector2();
  let lastBeat = '';

  const project = (v: THREE.Vector3) => { tmp.copy(v).project(app.camera); return { x: (tmp.x * 0.5 + 0.5) * innerWidth, y: (-tmp.y * 0.5 + 0.5) * innerHeight, vis: tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15 }; };

  app.onFrame((dt, t) => {
    if (calm) { vel = 0; }
    speed += (Math.min(1, Math.abs(vel) / 60) - speed) * 0.08;
    const beat = beatAt(vh);
    ui.setBeat(beat);
    if (beat.id !== lastBeat) { lastBeat = beat.id; onBeat(beat.id); }

    // soft snap at island arrivals
    if (Math.abs(vel) < 0.2 && !openSlug && !calm) { idle += dt; } else idle = 0;
    if (idle > 0.35) for (const b of BEATS) if (b.snap && Math.abs(vh - b.snap) < 6 && Math.abs(vh - b.snap) > 0.4 && snapped !== b.snap) { snapped = b.snap; fly(b.snap, 0.9); }
    if (!BEATS.some((b) => b.snap && Math.abs(vh - b.snap) < 6)) snapped = -1;

    // ---- island state
    mState.t = t;
    const racing = vh > 600 && vh < 715;
    mState.race = (mState.race + dt * (racing ? 0.045 + speed * 0.22 : 0.02)) % 1;
    mState.park = span(vh, 690, 712);
    mState.explode = span(vh, 722, 748);
    mState.wire = 1 - span(vh, 752, 776);
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
    inspect.a += (inspect.target - inspect.a) * (1 - Math.exp(-dt * 2.8));
    if (inspect.a > 0.001 && inspect.pos.lengthSq() > 0) { camPos.lerp(inspect.pos, inspect.a); camLook.lerp(inspect.look, inspect.a); }
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
      c.root.visible = d < 700 || chart > 0.01 || vh < 140;
    }

    // ---- DOM: hero, labels, tags, pins, readouts
    ui.setHero(span(vh, 0, 90));
    ui.setRail(Math.min(1, vh / TOTAL), beat.island === 'transit' ? '' : beat.island === 'map' ? '' : beat.island ?? '');
    const showIslandLabels = (vh < 150 && innerWidth > 720) || chart > 0.5;
    for (const id of Object.keys(LAYOUT) as IslandId[]) {
      const p = project(tmp.copy(LAYOUT[id].pos).add(new THREE.Vector3(0, chart > 0.5 ? 0 : -LAYOUT[id].radius * 0.95, 0)));
      ui.placeIslandLabel(id, p.x, p.y + (chart > 0.5 ? 40 : 0), showIslandLabels && p.vis ? 1 - span(vh, 60, 140) * (1 - chart) : 0);
    }
    const keep = new Set<string>();
    if (!openSlug && chart < 0.5) {
      for (const a of artefacts()) {
        if (!(beat.works ?? []).includes(a.slug)) continue;
        const wp = a.label.getWorldPosition(new THREE.Vector3());
        const p = project(wp);
        if (!p.vis || wp.distanceTo(camPos) > 220) continue;
        keep.add(a.slug);
        ui.placeTag(a.slug, p.x, p.y, true, hoverSlug === a.slug);
      }
    }
    ui.hideTagsExcept(keep);
    // map pins: every artefact on the chart
    if (chart > 0.3) {
      for (const a of artefacts()) {
        const p = project(a.hit.getWorldPosition(new THREE.Vector3()));
        const el = ui.pin(a.slug); el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`; el.style.display = p.vis ? '' : 'none';
      }
    }
    // hover picking (throttled to every other frame)
    if ((Math.round(t * 60) & 1) === 0) {
      const s = pick();
      if (s !== hoverSlug) { hoverSlug = s; ui.hover(s); if (s) sound.play('tick'); }
    }
    // readouts
    const lapOn = vh > 618 && vh < 702;
    ui.showReadout('lap', lapOn);
    if (lapOn) { if (lapStart === 0 || mState.race < 0.01) lapStart = t; ui.setLap((t - lapStart) % 60, speed); if (speed > 0.92) { lapRecordT += dt; if (lapRecordT > 2) { lapRecordT = -999; ui.toast('New lap record'); try { localStorage.setItem('arch-lap', String(t - lapStart)); } catch { /* ignore */ } } } }
    const roadOn = vh > 1124 && vh < 1212;
    ui.showReadout('counter', roadOn);
    if (roadOn) { const k = span(vh, 1126, 1198); if (k < 0.999) ui.setCounter('Lamps', Math.round(k * 2141 + (lampEgg ? 1 : 0)), 2141); else ui.setCounter(vh < 1205 ? 'Trees' : 'Cameras', vh < 1205 ? 808 : 52); }
    const towerOn = vh > 1272 && vh < 1708;
    ui.showReadout('alt', towerOn);
    if (towerOn) { const metres = (camPos.y - LAYOUT.brands.pos.y) * 2.2; const s = beat.works?.[0] ?? ''; ui.setAlt(Math.max(0, metres), s, brands.floors.find((f) => f.slug === s)?.level ?? ''); }
    if (beat.id === 'kerb' && Math.abs(vel) < 0.05) { idleKerb += dt; if (idleKerb > 20) { idleKerb = -999; ui.toast('Pit stop: a mechanic brings you a coffee'); } } else if (idleKerb > 0) idleKerb = 0;
    if (beat.id === 'gate' && returning && !welcomed) { welcomed = true; ui.toast('Welcome back. She remembers you.'); }
    // the wall into the molten core: a flash as the crack opens
    ui.flash(Math.max(0, 1 - Math.abs(vh - 1627) / 5) * 0.85);

    // ---- sound
    const isl = beat.island ?? '';
    sound.mix({
      bed: 0.5, worlds: isl === 'worlds' ? 0.7 : 0, machines: isl === 'machines' ? 0.7 : 0, monuments: isl === 'monuments' ? 0.6 : 0,
      brands: isl === 'brands' && beat.id !== 'magma' ? 0.6 : 0, magma: beat.id === 'magma' ? 0.6 + span(vh, 1625, 1665) * 0.4 : 0, sea: vh > 1830 ? 0.7 : 0,
    }, speed, racing ? 0.4 + speed : 0);
    ui.tickCursor();
  });

  function onBeat(id: string) {
    if (id === 'shrine') sound.play('bell');
    if (id === 'map') { sound.play('whoosh'); }
  }

  // ---------------------------------------------------------------- loading and entry
  const needed = ['hyperion', 'f1', 'agera', 'helmet', 'head', 'camera', 'gate'];
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
    if (v) { window.scrollTo(0, (v / 100) * innerHeight); vh = v; }
    (window as any).__ready = true;
  }

  // context loss: a fog card, then resume where we were
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); document.getElementById('fog')?.classList.add('on'); });
  canvas.addEventListener('webglcontextrestored', () => { document.getElementById('fog')?.classList.remove('on'); });

  // the frame loop drives Lenis too
  app.onFrame(() => lenis.raf(performance.now()));
  // in still mode, a test harness sets vh and renders once
  (window as any).__go = (v: number, t = 20) => { vh = v; window.scrollTo(0, (v / 100) * innerHeight); for (let i = 0; i < 3; i++) app.renderOnce(t + i / 60); };
  (window as any).__open = openPanel;
  void works; void RAIL; void SEA_Y;
}
