import * as THREE from 'three';
import { projects, featured } from '../../data/projects';
import { accentAt, reducedMotion, scrollState } from '../../lib/motion';
import { anchors, emitShowing, type PortalApi } from './bus';

// The door: an obsidian arch with a world inside it. One canvas for the whole page,
// fixed behind the DOM; it sits inside whichever [data-portal-anchor] is most on screen.
// Turning it uses plain pointer maths, no controls plugin.

const FRAME_W = 3;
const FRAME_H = 4.4;
const OPEN_W = 2.04;
const OPEN_H = 3.4;
const OPEN_Y = 0.44;
const DEPTH = 0.62;
const CAM_Z = 11;
const FOV = 32;

const featuredIndexes = featured.map((f) => projects.indexOf(f));

function arch(path: THREE.Path, w: number, h: number, y0: number) {
  const r = w / 2;
  path.moveTo(-r, y0);
  path.lineTo(r, y0);
  path.lineTo(r, y0 + h - r);
  path.absarc(0, y0 + h - r, r, 0, Math.PI, false);
  path.lineTo(-r, y0);
  return path;
}

function normaliseUVs(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox!;
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - min.x) / (max.x - min.x);
    uv[i * 2 + 1] = (pos.getY(i) - min.y) / (max.y - min.y);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function radialTexture(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  return t;
}

const screenVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const screenFrag = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uAspA;
  uniform float uAspB;
  uniform float uPlane;
  uniform float uMix;
  uniform vec2 uPar;
  uniform vec3 uTint;
  uniform float uGlow;
  varying vec2 vUv;

  vec2 cover(vec2 uv, float img) {
    vec2 s = uPlane < img ? vec2(uPlane / img, 1.0) : vec2(1.0, img / uPlane);
    return (uv - 0.5) * s + 0.5;
  }

  void main() {
    // Zoomed in slightly so the parallax has room: the world sits behind the opening.
    vec2 uv = (vUv - 0.5) * 0.84 + 0.5 + uPar;
    vec3 a = texture2D(uA, cover(uv, uAspA)).rgb;
    vec3 b = texture2D(uB, cover(uv, uAspB)).rgb;
    // A slow wipe that rises from the threshold, not a flat crossfade.
    float m = smoothstep(0.0, 1.0, clamp(uMix * 1.5 - (1.0 - vUv.y) * 0.5, 0.0, 1.0));
    vec3 col = mix(a, b, m);

    float d = distance(vUv, vec2(0.5, 0.42));
    col *= mix(1.0, 0.45, smoothstep(0.25, 0.75, d));
    col += uTint * uGlow * 0.16 * pow(1.0 - vUv.y, 2.0);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const haloFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.4) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const dustVert = /* glsl */ `
  uniform float uTime;
  uniform float uPixel;
  uniform float uWarp;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.08 + aSeed * 0.12) + 2.4, 6.0) - 2.4;
    // Fast scrolling pulls the dust out through the door, toward the viewer.
    p.z = mod(p.z + uWarp * (0.6 + aSeed) + 3.0, 6.0) - 3.0;
    p.x += sin(uTime * 0.3 + aSeed * 12.0) * 0.18;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.6 + aSeed * 2.6) * uPixel * (8.0 / -mv.z);
    vA = (0.25 + 0.75 * fract(aSeed * 7.13)) * smoothstep(-2.4, -1.6, p.y) * (1.0 - smoothstep(2.6, 3.6, p.y));
  }
`;

const dustFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export class PortalScene implements PortalApi {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  private rig = new THREE.Group();
  private door = new THREE.Group();
  private light: THREE.PointLight;
  private neon: THREE.MeshBasicMaterial;
  private ring: THREE.MeshBasicMaterial;
  private screens: THREE.ShaderMaterial[] = [];
  private halos: THREE.ShaderMaterial[] = [];
  private dust: THREE.ShaderMaterial;
  private textures = new Map<number, THREE.Texture>();
  private loader = new THREE.TextureLoader();
  private timer = new THREE.Timer();
  private raf = 0;
  private time = 0;
  private warp = 0;
  private alive = true;

  private opacity = 0;
  private target = new THREE.Vector3();
  private targetScale = 1;
  private placed = false;

  private rot = { x: 0, y: -0.5, tx: 0, ty: -0.5, vy: 0 };
  private dragging = false;
  private last = { x: 0, y: 0, t: 0 };
  private hover = { x: 0, y: 0, tx: 0, ty: 0 };

  private showing = -1;
  private pending = -1;
  private incoming = -1;
  private mix = 0;
  private cycleAt = 0;
  private cycleStep = 0;

  private color = new THREE.Color();
  private tone = new THREE.Color();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera.position.set(0, 0.2, CAM_Z);
    this.scene.add(this.rig);
    this.rig.add(this.door);
    this.scene.environment = this.makeEnvironment();

    this.buildDoor();
    this.neon = this.buildNeon();
    this.ring = this.buildFloor();
    this.dust = this.buildDust();

    this.light = new THREE.PointLight(0x8b6bff, 30, 14, 1.6);
    this.light.position.set(0, -0.8, 1.2);
    this.rig.add(this.light);

    const key = new THREE.DirectionalLight(0xffe2c8, 0.7);
    key.position.set(-5, 7, 6);
    const rim = new THREE.DirectionalLight(0x6d4dff, 1.4);
    rim.position.set(4, 3, -6);
    this.scene.add(key, rim, new THREE.AmbientLight(0x241f33, 0.5));

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onHover, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);

    const first = featuredIndexes[0] ?? 0;
    this.load(first).then((tex) => {
      if (!this.alive) return;
      this.screens.forEach((s) => this.assign(s, 'A', tex));
      this.showing = first;
      emitShowing(first);
    });
    // Warm the rest a little later so the first paint has the bandwidth.
    window.setTimeout(() => featuredIndexes.forEach((i) => this.load(i)), 1800);

    this.loop();
  }

  // ————————————————————————————————————— build

  private makeEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = new THREE.Scene();
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x0b0a12, side: THREE.BackSide }),
    );
    env.add(sky);
    const box = (color: number, strength: number, w: number, h: number, pos: [number, number, number]) => {
      const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      m.color.multiplyScalar(strength);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.set(...pos);
      p.lookAt(0, 0, 0);
      env.add(p);
    };
    box(0xfff0e0, 3.2, 8, 3, [-8, 10, 8]);
    box(0x7a5cff, 2.4, 3, 12, [12, 2, -6]);
    box(0xffb070, 1.2, 14, 1.2, [0, -6, 10]);
    const tex = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
    return tex;
  }

  private buildDoor() {
    const outer = arch(new THREE.Shape(), FRAME_W, FRAME_H, 0) as THREE.Shape;
    outer.holes.push(arch(new THREE.Path(), OPEN_W, OPEN_H, OPEN_Y));
    const frameGeo = new THREE.ExtrudeGeometry(outer, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      bevelSegments: 4,
      curveSegments: 64,
    });
    frameGeo.translate(0, -FRAME_H / 2, -DEPTH / 2);
    const stone = new THREE.MeshPhysicalMaterial({
      color: 0x121016,
      roughness: 0.34,
      metalness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1,
    });
    this.door.add(new THREE.Mesh(frameGeo, stone));

    const plane = OPEN_W / OPEN_H;
    const screenGeo = new THREE.ShapeGeometry(arch(new THREE.Shape(), OPEN_W, OPEN_H, OPEN_Y) as THREE.Shape, 64);
    screenGeo.translate(0, -FRAME_H / 2, 0);
    normaliseUVs(screenGeo);

    const blank = new THREE.DataTexture(new Uint8Array([12, 10, 18, 255]), 1, 1);
    blank.needsUpdate = true;
    for (const side of [1, -1]) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: screenVert,
        fragmentShader: screenFrag,
        uniforms: {
          uA: { value: blank },
          uB: { value: blank },
          uAspA: { value: 1 },
          uAspB: { value: 1 },
          uPlane: { value: plane },
          uMix: { value: 0 },
          uPar: { value: new THREE.Vector2() },
          uTint: { value: new THREE.Color() },
          uGlow: { value: 1 },
        },
      });
      const mesh = new THREE.Mesh(screenGeo, mat);
      // Set back from the face so the frame's inner wall shows: a door, not a picture.
      mesh.position.z = side * -0.12;
      if (side < 0) mesh.rotation.y = Math.PI;
      this.door.add(mesh);
      this.screens.push(mat);
    }

    // Two glows: one held behind the door, one spilling through the opening.
    for (const [z, s, y] of [
      [-1.4, 11, 0.2],
      [0.5, 4.5, -0.9],
    ] as const) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: screenVert,
        fragmentShader: haloFrag,
        uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat);
      halo.position.set(0, y, z);
      this.rig.add(halo);
      this.halos.push(mat);
    }
  }

  private buildNeon() {
    // The opening's outline, minus the threshold, as a thin lit tube on the front face.
    const r = OPEN_W / 2 + 0.03;
    const y0 = OPEN_Y - FRAME_H / 2;
    const top = y0 + OPEN_H - OPEN_W / 2;
    const pts: THREE.Vector3[] = [];
    const z = DEPTH / 2 + 0.04;
    for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(-r, y0 + ((top - y0) * i) / 20, z));
    for (let i = 1; i <= 60; i++) {
      const a = Math.PI - (Math.PI * i) / 60;
      pts.push(new THREE.Vector3(Math.cos(a) * r, top + Math.sin(a) * r, z));
    }
    for (let i = 1; i <= 20; i++) pts.push(new THREE.Vector3(r, top - ((top - y0) * i) / 20, z));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.016, 8, false);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8b6bff, toneMapped: false });
    this.door.add(new THREE.Mesh(geo, mat));
    return mat;
  }

  private buildFloor() {
    const y = -FRAME_H / 2 - 0.04;
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d0c11,
      roughness: 0.55,
      metalness: 0.1,
      transparent: true,
      alphaMap: radialTexture('#ffffff', '#000000'),
      depthWrite: false,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = y;
    this.rig.add(floor);

    // A thin ring on the ground, the Ring Gate's circle laid flat.
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8b6bff, transparent: true, opacity: 0.35, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.006, 6, 200), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + 0.01;
    this.rig.add(ring);
    return ringMat;
  }

  private buildDust() {
    const n = 420;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 9;
      pos[i * 3 + 1] = Math.random() * 6 - 2.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      uniforms: {
        uTime: { value: 0 },
        uPixel: { value: 1 },
        uWarp: { value: 0 },
        uColor: { value: new THREE.Color() },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.rig.add(new THREE.Points(geo, mat));
    return mat;
  }

  // ————————————————————————————————————— textures

  private load(index: number): Promise<THREE.Texture> {
    const have = this.textures.get(index);
    if (have) return Promise.resolve(have);
    return new Promise((resolve) => {
      this.loader.load(projects[index].cover.src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        tex.generateMipmaps = true;
        this.textures.set(index, tex);
        resolve(tex);
      });
    });
  }

  private assign(mat: THREE.ShaderMaterial, slot: 'A' | 'B', tex: THREE.Texture) {
    const img = tex.image as { width: number; height: number };
    mat.uniforms[`u${slot}`].value = tex;
    mat.uniforms[`uAsp${slot}`].value = img.width / img.height;
  }

  private show(index: number) {
    if (index < 0 || index === this.pending) return;
    if (index === this.showing && this.pending === -1) return;
    this.pending = index;
    this.load(index).then((tex) => {
      if (!this.alive || this.pending !== index) return;
      if (index === this.showing && this.mix === 0) {
        this.pending = -1;
        return;
      }
      this.screens.forEach((s) => this.assign(s, 'B', tex));
      this.incoming = index;
      this.mix = 0.0001;
      emitShowing(index);
    });
  }

  // ————————————————————————————————————— input

  grab(x: number, y: number) {
    this.dragging = true;
    this.last = { x, y, t: performance.now() };
    this.rot.vy = 0;
  }

  drag(x: number, y: number) {
    if (!this.dragging) return;
    const now = performance.now();
    const dx = x - this.last.x;
    const dy = y - this.last.y;
    const dt = Math.max(1, now - this.last.t) / 1000;
    this.rot.ty += dx * 0.009;
    this.rot.tx = THREE.MathUtils.clamp(this.rot.tx + dy * 0.004, -0.45, 0.45);
    this.rot.vy = THREE.MathUtils.lerp(this.rot.vy, (dx * 0.009) / dt, 0.4);
    this.last = { x, y, t: now };
  }

  release() {
    this.dragging = false;
  }

  nudge(dx: number, dy: number) {
    this.rot.ty += dx;
    this.rot.tx = THREE.MathUtils.clamp(this.rot.tx + dy, -0.45, 0.45);
  }

  private onHover = (e: PointerEvent) => {
    this.hover.tx = e.clientX / window.innerWidth - 0.5;
    this.hover.ty = e.clientY / window.innerHeight - 0.5;
  };

  private onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(this.raf);
    else {
      this.timer.reset();
      this.loop();
    }
  };

  // ————————————————————————————————————— frame

  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dust.uniforms.uPixel.value = dpr;
  };

  /** Finds the anchor most on screen and returns where, in world units, the door should stand. */
  private measure() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    let best: DOMRect | null = null;
    let bestVis = 0;
    anchors.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height < 2) return;
      const vis = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0)) / Math.min(r.height, H);
      if (vis > bestVis) {
        bestVis = vis;
        best = r;
      }
    });
    if (!best) return 0;
    const r = best as DOMRect;
    const viewH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const viewW = viewH * (W / H);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    this.target.set((cx / W - 0.5) * viewW, -(cy / H - 0.5) * viewH + 0.15, 0);
    const byH = ((r.height / H) * viewH * 0.78) / (FRAME_H + 0.6);
    const byW = ((r.width / W) * viewW * 0.86) / FRAME_W;
    this.targetScale = Math.min(byH, byW);
    return THREE.MathUtils.smoothstep(bestVis, 0.08, 0.55);
  }

  private loop = () => {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.loop);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const want = this.measure();
    const k = (rate: number) => 1 - Math.exp(-dt * rate);

    this.opacity += (want - this.opacity) * k(want > this.opacity ? 3 : 6);
    this.canvas.style.opacity = this.opacity.toFixed(3);
    if (this.opacity < 0.004 && want === 0) {
      this.placed = false;
      return;
    }
    this.time += dt;

    // Travel to the anchor, or jump there if the door was out of sight.
    if (!this.placed) {
      this.rig.position.copy(this.target);
      this.rig.scale.setScalar(this.targetScale);
      this.placed = true;
    } else {
      this.rig.position.lerp(this.target, k(7));
      this.rig.scale.setScalar(THREE.MathUtils.lerp(this.rig.scale.x, this.targetScale, k(7)));
    }

    // Turning: drag sets the target, release throws it, rest drifts slowly.
    if (!this.dragging) {
      this.rot.ty += this.rot.vy * dt;
      this.rot.vy *= Math.exp(-dt * 1.6);
      if (!reducedMotion) this.rot.ty += dt * 0.1;
      this.rot.tx *= Math.exp(-dt * 1.2);
    }
    this.rot.y += (this.rot.ty - this.rot.y) * k(6);
    this.rot.x += (this.rot.tx - this.rot.x) * k(6);
    this.hover.x += (this.hover.tx - this.hover.x) * k(2.5);
    this.hover.y += (this.hover.ty - this.hover.y) * k(2.5);
    const scrollTurn = reducedMotion ? 0 : scrollState.progress * Math.PI * 1.2;
    this.door.rotation.set(this.rot.x + this.hover.y * 0.12, this.rot.y + scrollTurn + this.hover.x * 0.25, 0);
    this.camera.position.x = this.hover.x * 0.5;
    this.camera.position.y = 0.2 - this.hover.y * 0.3;
    this.camera.lookAt(this.rig.position.x * 0.04, this.rig.position.y * 0.04, 0);

    // Looking into the opening from an angle shifts the world behind it.
    const facing = Math.sin(this.door.rotation.y);
    this.screens.forEach((s, i) => {
      const sign = i === 0 ? 1 : -1;
      s.uniforms.uPar.value.set(-facing * 0.06 * sign, this.door.rotation.x * 0.05);
    });

    // What the door shows: the pinned chapter decides, otherwise it cycles the four worlds.
    if (scrollState.showing >= 0) this.show(scrollState.showing);
    else if (this.time > this.cycleAt) {
      this.cycleAt = this.time + 5.5;
      this.cycleStep = (this.cycleStep + 1) % featuredIndexes.length;
      if (this.showing >= 0) this.show(featuredIndexes[this.cycleStep]);
    }
    if (this.mix > 0) {
      this.mix = Math.min(1, this.mix + dt / 1.6);
      this.screens.forEach((s) => (s.uniforms.uMix.value = this.mix));
      if (this.mix >= 1) {
        this.screens.forEach((s) => {
          s.uniforms.uA.value = s.uniforms.uB.value;
          s.uniforms.uAspA.value = s.uniforms.uAspB.value;
          s.uniforms.uMix.value = 0;
        });
        this.mix = 0;
        this.showing = this.incoming;
        if (this.pending === this.incoming) this.pending = -1;
      }
    }

    // The UV light: its colour follows the page from violet to dawn, leans toward the
    // pinned project's tone, and brightens with scroll speed.
    const p = scrollState.progress;
    const [r, g, b] = accentAt(p);
    this.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
    if (scrollState.tone) this.color.lerp(this.tone.set(scrollState.tone), 0.6);
    const speed = Math.min(1, Math.abs(scrollState.velocity) / 30);
    const breathe = reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(this.time * 1.1);
    const intensity = (22 + 26 * THREE.MathUtils.smoothstep(p, 0, 0.12) + 40 * speed) * breathe;
    this.light.color.lerp(this.color, k(3));
    this.light.intensity = THREE.MathUtils.lerp(this.light.intensity, intensity, k(4));
    // At the very top the light waits behind the door; the first scroll brings it through.
    const through = THREE.MathUtils.smoothstep(p, 0, 0.06);
    this.light.position.set(Math.sin(this.time * 0.35) * 0.7, -0.9 + Math.sin(this.time * 0.5) * 0.15, -1.4 + 3 * through);

    const glow = this.light.intensity / 48;
    this.neon.color.copy(this.light.color).multiplyScalar(1.4 + glow);
    this.ring.color.copy(this.light.color);
    this.halos[0].uniforms.uColor.value.copy(this.light.color);
    this.halos[0].uniforms.uOpacity.value = 0.32 + 0.25 * glow * (1 - through * 0.5);
    this.halos[1].uniforms.uColor.value.copy(this.light.color);
    this.halos[1].uniforms.uOpacity.value = 0.18 + 0.3 * glow * through;
    this.screens.forEach((s) => {
      s.uniforms.uTint.value.copy(this.light.color);
      s.uniforms.uGlow.value = glow;
    });
    this.dust.uniforms.uColor.value.copy(this.light.color);
    this.dust.uniforms.uTime.value = reducedMotion ? 0 : this.time;
    if (!reducedMotion) this.warp += speed * speed * dt * 2.2;
    this.dust.uniforms.uWarp.value = this.warp;

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onHover);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    this.textures.forEach((t) => t.dispose());
    this.timer.dispose();
    this.renderer.dispose();
  }
}
