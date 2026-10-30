/* ══════════════════════════════════════════════════════════════
   gl.js — the engine.

   One canvas, never torn down. It survives page changes, so moving
   from one world to the next is a dissolve between two textures
   rather than a reload.

   Contains:
     · DOM-synced deformable planes      [data-gl]
     · a refracting glass artifact        (hero)
     · an infinite draggable mosaic       (the archive)
     · a full-screen dissolve             (page transitions)
     · a draggable key light              (drives shading + accent)
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('gl');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || typeof window.THREE === 'undefined') { window.GL = null; return; }

  var PERSPECTIVE = 1400;

  /* ═══════════════ SHADERS ═══════════════ */

  var NOISE = [
    'vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }',
    'vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }',
    'vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }',
    'vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }',
    'float snoise(vec3 v){',
    '  const vec2 C = vec2(1.0/6.0, 1.0/3.0);',
    '  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
    '  vec3 i  = floor(v + dot(v, C.yyy));',
    '  vec3 x0 = v - i + dot(i, C.xxx);',
    '  vec3 g = step(x0.yzx, x0.xyz);',
    '  vec3 l = 1.0 - g;',
    '  vec3 i1 = min(g.xyz, l.zxy);',
    '  vec3 i2 = max(g.xyz, l.zxy);',
    '  vec3 x1 = x0 - i1 + C.xxx;',
    '  vec3 x2 = x0 - i2 + C.yyy;',
    '  vec3 x3 = x0 - D.yyy;',
    '  i = mod289(i);',
    '  vec4 p = permute(permute(permute(',
    '             i.z + vec4(0.0, i1.z, i2.z, 1.0))',
    '           + i.y + vec4(0.0, i1.y, i2.y, 1.0))',
    '           + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
    '  float n_ = 0.142857142857;',
    '  vec3 ns = n_ * D.wyz - D.xzx;',
    '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);',
    '  vec4 x_ = floor(j * ns.z);',
    '  vec4 y_ = floor(j - 7.0 * x_);',
    '  vec4 x = x_ * ns.x + ns.yyyy;',
    '  vec4 y = y_ * ns.x + ns.yyyy;',
    '  vec4 h = 1.0 - abs(x) - abs(y);',
    '  vec4 b0 = vec4(x.xy, y.xy);',
    '  vec4 b1 = vec4(x.zw, y.zw);',
    '  vec4 s0 = floor(b0) * 2.0 + 1.0;',
    '  vec4 s1 = floor(b1) * 2.0 + 1.0;',
    '  vec4 sh = -step(h, vec4(0.0));',
    '  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;',
    '  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;',
    '  vec3 p0 = vec3(a0.xy, h.x);',
    '  vec3 p1 = vec3(a0.zw, h.y);',
    '  vec3 p2 = vec3(a1.xy, h.z);',
    '  vec3 p3 = vec3(a1.zw, h.w);',
    '  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));',
    '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
    '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
    '  m = m * m;',
    '  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));',
    '}'
  ].join('\n');

  var COVER = [
    'vec2 cover(vec2 uv, vec2 box, vec2 img){',
    '  float boxA = box.x / box.y;',
    '  float imgA = img.x / img.y;',
    '  vec2 s = boxA > imgA ? vec2(1.0, imgA / boxA) : vec2(boxA / imgA, 1.0);',
    '  return (uv - 0.5) * s + 0.5;',
    '}'
  ].join('\n');

  /* ── deformable DOM-synced plane ─────────────────────────── */

  var PLANE_VERT = [
    'uniform float uVelocity, uHover, uEnter;',
    'uniform vec2 uMouse;',
    'varying vec2 vUv;',
    'varying float vBend;',
    'void main(){',
    '  vUv = uv;',
    '  vec3 pos = position;',
    '  float arc = sin(uv.x * 3.14159265);',
    '  float col = sin(uv.y * 3.14159265);',
    '  float bend = arc * col * uVelocity * 0.9;',
    '  pos.z += bend;',
    '  pos.y += arc * uVelocity * 0.24;',
    '  float d = distance(uv, uMouse * 0.5 + 0.5);',
    '  float dent = exp(-d * 5.5) * uHover * 0.18;',
    '  pos.z += dent;',
    '  pos.z += arc * (1.0 - uEnter) * 0.4;',
    '  pos.y -= (1.0 - uEnter) * 0.06;',
    '  vBend = bend + dent;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
    '}'
  ].join('\n');

  var PLANE_FRAG = [
    'precision highp float;',
    'uniform sampler2D uTex;',
    'uniform vec2 uSize, uImg, uLight;',
    'uniform float uProgress, uVelocity, uHover, uTime, uWire, uAlpha;',
    'varying vec2 vUv;',
    'varying float vBend;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    COVER,
    'void main(){',
    '  vec2 uv = cover(vUv, uSize, uImg);',
    '  uv += (vUv - 0.5) * -0.05 * (1.0 + uHover);',
    '  float split = (abs(uVelocity) * 0.95 + uHover * 0.4) * 0.013;',
    '  float r = texture2D(uTex, clamp(uv + vec2(split, 0.0), 0.001, 0.999)).r;',
    '  float g = texture2D(uTex, clamp(uv, 0.001, 0.999)).g;',
    '  float b = texture2D(uTex, clamp(uv - vec2(split, 0.0), 0.001, 0.999)).b;',
    '  vec3 col = vec3(r, g, b);',

    // the key light rakes across the plate
    '  vec2 lp = uLight * 0.5 + 0.5;',
    '  float lit = 1.0 - clamp(distance(vUv, lp) * 0.85, 0.0, 1.0);',
    '  col *= 0.86 + lit * 0.34;',

    // render buckets
    '  vec2 grid = vec2(16.0, 10.0);',
    '  vec2 cell = floor(vUv * grid);',
    '  float order = (cell.y * grid.x + cell.x) / (grid.x * grid.y);',
    '  order = mix(order, hash(cell), 0.3);',
    '  float reveal = smoothstep(order, order + 0.18, uProgress);',
    '  float n = hash(cell + floor(uTime * 20.0));',
    '  float busy = smoothstep(0.0, 0.4, reveal) * (1.0 - smoothstep(0.5, 1.0, reveal));',
    '  col = mix(col, mix(col, vec3(n), 0.5) * (0.8 + n * 0.4), busy);',
    '  col = mix(vec3(0.42), col, reveal);',
    '  float edge = step(0.98, max(fract(vUv.x * grid.x), fract(vUv.y * grid.y)));',
    '  col += edge * busy * 0.2;',
    '  col += clamp(vBend * 0.6, -0.28, 0.28);',

    // hidden wireframe view
    '  if (uWire > 0.5){',
    '    vec2 w = fract(vUv * vec2(34.0, 20.0));',
    '    float line = step(0.94, max(w.x, w.y));',
    '    col = mix(col * 0.09, vec3(0.18, 0.83, 0.75), line * 0.65);',
    '  }',
    '  gl_FragColor = vec4(col, uAlpha * reveal);',
    '}'
  ].join('\n');

  /* ── glass artifact ─────────────────────────────────────── */

  var GLASS_VERT = [
    'uniform float uTime, uAmp;',
    'varying vec3 vNormalW;',
    'varying vec3 vViewDir;',
    'varying vec4 vScreen;',
    'varying float vRidge;',
    NOISE,
    'float field(vec3 p){',
    '  float n = snoise(p * 1.15 + vec3(0.0, uTime * 0.16, 0.0));',
    '  n += 0.45 * snoise(p * 2.6 - vec3(uTime * 0.1, 0.0, 0.0));',
    '  return n;',
    '}',
    'void main(){',
    '  vec3 n = normalize(normal);',
    '  float f = field(position);',
    '  vec3 pos = position + n * f * uAmp;',
    '  vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.0) + 0.001));',
    '  vec3 t2 = normalize(cross(n, t1));',
    '  float e = 0.045;',
    '  vec3 pa = position + t1 * e; pa += normalize(pa) * field(pa) * uAmp;',
    '  vec3 pb = position + t2 * e; pb += normalize(pb) * field(pb) * uAmp;',
    '  vec3 nn = normalize(cross(pa - pos, pb - pos));',
    '  if (dot(nn, n) < 0.0) nn = -nn;',
    '  vRidge = f;',
    '  vNormalW = normalize(mat3(modelMatrix) * nn);',
    '  vec4 world = modelMatrix * vec4(pos, 1.0);',
    '  vViewDir = normalize(cameraPosition - world.xyz);',
    '  vec4 clip = projectionMatrix * viewMatrix * world;',
    '  vScreen = clip;',
    '  gl_Position = clip;',
    '}'
  ].join('\n');

  var GLASS_FRAG = [
    'precision highp float;',
    'uniform sampler2D uScene;',
    'uniform vec3 uTint;',
    'uniform vec2 uLight;',
    'uniform float uFade, uWire;',
    'varying vec3 vNormalW;',
    'varying vec3 vViewDir;',
    'varying vec4 vScreen;',
    'varying float vRidge;',
    'void main(){',
    '  vec2 suv = (vScreen.xy / vScreen.w) * 0.5 + 0.5;',
    '  vec3 n = normalize(vNormalW);',
    '  vec3 v = normalize(vViewDir);',
    '  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.6);',
    '  vec2 off = n.xy * 0.135;',
    '  float r = texture2D(uScene, clamp(suv - off * 1.16, 0.002, 0.998)).r;',
    '  float g = texture2D(uScene, clamp(suv - off * 1.00, 0.002, 0.998)).g;',
    '  float b = texture2D(uScene, clamp(suv - off * 0.84, 0.002, 0.998)).b;',
    '  vec3 col = mix(vec3(r, g, b) * uTint, vec3(1.0), fres * 0.55);',
    '  vec3 L = normalize(vec3(uLight.x, uLight.y, 0.75));',
    '  float spec = pow(max(dot(reflect(-L, n), v), 0.0), 44.0);',
    '  col += spec * 0.95;',
    '  col += smoothstep(0.35, 0.95, vRidge) * 0.10;',
    '  if (uWire > 0.5) col = mix(vec3(0.03), vec3(0.18, 0.83, 0.75), step(0.84, fres));',
    '  gl_FragColor = vec4(col, uFade * (0.55 + fres * 0.45));',
    '}'
  ].join('\n');

  /* ── mosaic tile ────────────────────────────────────────── */

  var TILE_VERT = [
    'uniform float uHover, uDrag;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = uv;',
    '  vec3 pos = position;',
    '  float arc = sin(uv.x * 3.14159265) * sin(uv.y * 3.14159265);',
    '  pos.z += arc * uDrag * 0.5;',
    '  pos.xy *= 1.0 + uHover * 0.06;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
    '}'
  ].join('\n');

  var TILE_FRAG = [
    'precision highp float;',
    'uniform sampler2D uTex;',
    'uniform vec2 uSize, uImg;',
    'uniform float uHover, uDrag, uFade, uDim, uReady;',
    'varying vec2 vUv;',
    COVER,
    'void main(){',
    '  vec2 uv = cover(vUv, uSize, uImg);',
    '  float split = (abs(uDrag) * 0.5 + uHover * 0.3) * 0.02;',
    '  float r = texture2D(uTex, clamp(uv + vec2(split, 0.0), 0.001, 0.999)).r;',
    '  float g = texture2D(uTex, clamp(uv, 0.001, 0.999)).g;',
    '  float b = texture2D(uTex, clamp(uv - vec2(split, 0.0), 0.001, 0.999)).b;',
    '  vec3 col = vec3(r, g, b);',
    '  col = mix(vec3(0.42), col, uReady);',
    '  col = mix(col, vec3(dot(col, vec3(0.33))) * 0.45, uDim);',
    '  col *= 0.82 + uHover * 0.28;',
    // soft corners
    '  vec2 q = abs(vUv - 0.5) * 2.0;',
    '  float box = max(q.x, q.y);',
    '  float a = 1.0 - smoothstep(0.985, 1.0, box);',
    '  gl_FragColor = vec4(col, a * uFade);',
    '}'
  ].join('\n');

  /* ── full-screen dissolve between two plates ────────────── */

  var DISSOLVE_FRAG = [
    'precision highp float;',
    'uniform sampler2D uFrom, uTo;',
    'uniform vec2 uRes, uFromImg, uToImg;',
    'uniform float uProgress, uTime;',
    'varying vec2 vUv;',
    COVER,
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'void main(){',
    '  vec2 uv = vUv;',
    // liquid displacement, strongest mid-transition
    '  float wave = sin(uv.y * 9.0 + uTime * 2.0) * 0.5 + 0.5;',
    '  float push = sin(uProgress * 3.14159265);',
    '  vec2 duv = uv + vec2(wave * 0.09 * push, 0.0);',
    '  vec3 a = texture2D(uFrom, clamp(cover(duv, uRes, uFromImg), 0.001, 0.999)).rgb;',
    '  vec3 b = texture2D(uTo, clamp(cover(duv, uRes, uToImg), 0.001, 0.999)).rgb;',
    // slice wipe: 22 horizontal bands, each with its own start time
    '  float band = floor(uv.y * 22.0);',
    '  float off = hash(vec2(band, 3.0)) * 0.35;',
    '  float m = smoothstep(off, off + 0.55, uProgress);',
    '  vec3 col = mix(a, b, m);',
    // bright seam on the moving edge
    '  float seam = smoothstep(0.0, 0.06, abs(m - 0.5));',
    '  col += (1.0 - seam) * 0.5 * push;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  /* ── post ───────────────────────────────────────────────── */

  var POST = {
    uniforms: {
      tDiffuse: { value: null }, uTime: { value: 0 }, uVelocity: { value: 0 },
      uRipple: { value: null }, uAspect: { value: 1 }, uFlash: { value: 0 }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'precision highp float;',
      'uniform sampler2D tDiffuse;',
      'uniform float uTime, uVelocity, uAspect, uFlash;',
      'uniform vec4 uRipple;',
      'varying vec2 vUv;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'void main(){',
      '  vec2 uv = vUv;',
      '  vec2 c = uv - 0.5;',
      '  uv = uv + c * dot(c, c) * 0.035;',
      '  vec2 pd = (uv - uRipple.xy) * vec2(uAspect, 1.0);',
      '  float pr = length(pd);',
      '  float ring = sin(pr * 34.0 - uTime * 3.4) * exp(-pr * 9.0) * uRipple.z;',
      '  uv += normalize(pd + 0.0001) * ring * 0.007;',
      '  float amt = 0.0016 + abs(uVelocity) * 0.022 + uFlash * 0.02;',
      '  vec2 dir = normalize(c + 0.0001);',
      '  float r = texture2D(tDiffuse, uv + dir * amt).r;',
      '  vec4 g = texture2D(tDiffuse, uv);',
      '  float b = texture2D(tDiffuse, uv - dir * amt).b;',
      '  vec3 col = vec3(r, g.g, b);',
      '  float n = hash(uv * 900.0 + fract(uTime) * 100.0);',
      '  col += (n - 0.5) * 0.035;',
      '  col *= 1.0 - dot(c, c) * 0.28;',
      '  gl_FragColor = vec4(col, g.a);',
      '}'
    ].join('\n')
  };

  /* ═══════════════ RENDERER ═══════════════ */

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  } catch (e) { window.GL = null; return; }
  if (!renderer.getContext()) { window.GL = null; return; }

  var DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

  var W = window.innerWidth, H = window.innerHeight;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, W / H, 10, 4000);
  camera.position.z = PERSPECTIVE;
  function setFov() {
    camera.fov = 2 * Math.atan(H / 2 / PERSPECTIVE) * 180 / Math.PI;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  setFov();

  var rtBG = new THREE.WebGLRenderTarget(Math.round(W * DPR * 0.6), Math.round(H * DPR * 0.6));
  var clock = new THREE.Clock();
  var loader = new THREE.TextureLoader();

  /* texture cache with a ceiling, so the mosaic can't eat all of VRAM */
  var cache = Object.create(null), cacheOrder = [], CACHE_MAX = 70;
  function getTexture(src, cb) {
    var hit = cache[src];
    if (hit) { if (hit.ready) cb(hit.tex); else hit.waiting.push(cb); return; }
    var entry = { tex: null, ready: false, waiting: [cb] };
    cache[src] = entry;
    cacheOrder.push(src);
    if (cacheOrder.length > CACHE_MAX) {
      var old = cacheOrder.shift();
      if (cache[old] && cache[old].tex && !cache[old].pinned) { cache[old].tex.dispose(); delete cache[old]; }
    }
    loader.load(src, function (t) {
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      entry.tex = t; entry.ready = true;
      entry.waiting.forEach(function (f) { f(t); });
      entry.waiting = [];
    }, undefined, function () {
      entry.ready = true; entry.tex = null;
      entry.waiting.forEach(function (f) { f(null); });
      entry.waiting = [];
    });
  }

  /* ═══════════════ COMPOSER ═══════════════ */

  var composer = null, postPass = null, bloom = null;
  try {
    if (THREE.EffectComposer && THREE.RenderPass && THREE.ShaderPass) {
      composer = new THREE.EffectComposer(renderer);
      composer.setPixelRatio(DPR);
      composer.setSize(W, H);
      composer.addPass(new THREE.RenderPass(scene, camera));
      if (THREE.UnrealBloomPass) {
        bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.32, 0.85, 0.82);
        composer.addPass(bloom);
      }
      postPass = new THREE.ShaderPass(POST);
      postPass.renderToScreen = true;
      composer.addPass(postPass);
    }
  } catch (e) { composer = null; }

  /* ═══════════════ STATE ═══════════════ */

  var planeGeo = new THREE.PlaneGeometry(1, 1, 28, 20);
  var tileGeo = new THREE.PlaneGeometry(1, 1, 12, 12);
  var planes = [], started = false, wire = 0;
  var velocity = 0, lastScroll = window.scrollY;
  var pointer = new THREE.Vector2(0.5, 0.5);
  var ripple = new THREE.Vector4(0.5, 0.5, 0, 0);
  var light = new THREE.Vector2(-0.45, 0.55);

  window.addEventListener('pointermove', function (e) {
    pointer.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    ripple.x = pointer.x; ripple.y = pointer.y;
    ripple.z = Math.min(1, ripple.z + 0.32);
  }, { passive: true });

  /* ═══════════════ PLANES ═══════════════ */

  function addPlane(node) {
    var src = node.getAttribute('data-gl');
    if (!src) return;
    var mat = new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT, fragmentShader: PLANE_FRAG, transparent: true,
      uniforms: {
        uTex: { value: null },
        uSize: { value: new THREE.Vector2(1, 1) },
        uImg: { value: new THREE.Vector2(16, 9) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uLight: { value: light },
        uProgress: { value: reduced ? 1 : 0 },
        uVelocity: { value: 0 }, uHover: { value: 0 },
        uEnter: { value: reduced ? 1 : 0 }, uAlpha: { value: 1 },
        uTime: { value: 0 }, uWire: { value: wire }
      }
    });
    var mesh = new THREE.Mesh(planeGeo, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);

    var item = { node: node, mesh: mesh, mat: mat, loaded: false, hover: 0, hoverT: 0, enter: 0 };
    planes.push(item);

    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      getTexture(src, function (tex) {
        if (!tex) { node.classList.add('is-gl-failed'); return; }
        cache[src].pinned = true;
        mat.uniforms.uTex.value = tex;
        mat.uniforms.uImg.value.set(tex.image.width, tex.image.height);
        item.loaded = true;
        node.classList.add('is-gl');
      });
    }, { rootMargin: '500px 0px' });
    io.observe(node);
    item.io = io;

    node.addEventListener('pointerenter', function () { item.hoverT = 1; });
    node.addEventListener('pointerleave', function () { item.hoverT = 0; });
    node.addEventListener('pointermove', function (e) {
      var r = node.getBoundingClientRect();
      mat.uniforms.uMouse.value.set(
        ((e.clientX - r.left) / r.width - 0.5) * 2,
        -((e.clientY - r.top) / r.height - 0.5) * 2
      );
    });
  }

  function clearPlanes() {
    planes.forEach(function (p) {
      if (p.io) p.io.disconnect();
      scene.remove(p.mesh);
      p.mat.dispose();
    });
    planes = [];
  }

  function syncPlane(item, t) {
    var r = item.node.getBoundingClientRect();
    var near = r.bottom > -400 && r.top < H + 400;
    item.mesh.visible = near && item.loaded;
    if (!item.mesh.visible) return;
    item.mesh.position.set(r.left + r.width / 2 - W / 2, -(r.top + r.height / 2) + H / 2, 0);
    item.mesh.scale.set(r.width, r.height, 1);
    var u = item.mat.uniforms;
    u.uSize.value.set(r.width, r.height);
    u.uTime.value = t;
    u.uWire.value = wire;
    u.uVelocity.value += (velocity - u.uVelocity.value) * 0.12;
    item.hover += (item.hoverT - item.hover) * 0.09;
    u.uHover.value = item.hover;
    if (r.top < H * 0.94) {
      u.uProgress.value = Math.min(1, u.uProgress.value + 0.022);
      item.enter += (1 - item.enter) * 0.05;
      u.uEnter.value = item.enter;
    }
  }

  /* ═══════════════ GLASS ═══════════════ */

  var glass = null, glassMat = null, glassHost = null;
  (function buildGlass() {
    var detail = window.innerWidth < 760 ? 3 : 5;
    glassMat = new THREE.ShaderMaterial({
      vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, transparent: true,
      uniforms: {
        uScene: { value: rtBG.texture },
        uTint: { value: new THREE.Color(0.98, 0.87, 0.74) },
        uLight: { value: light },
        uTime: { value: 0 }, uAmp: { value: 0.15 },
        uFade: { value: 1 }, uWire: { value: 0 }
      }
    });
    glass = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), glassMat);
    glass.frustumCulled = false;
    scene.add(glass);
  })();

  /* ═══════════════ MOSAIC ═══════════════ */

  var mos = null;

  function mountMosaic(host, items) {
    unmountMosaic();
    var small = window.innerWidth < 760;
    var cols = small ? 3 : 6, rows = small ? 4 : 4;
    var cw = small ? 190 : 330, ch = small ? 140 : 235, gap = small ? 14 : 26;
    var LW = cols * (cw + gap), LH = rows * (ch + gap);

    mos = {
      host: host, items: items, cols: cols, rows: rows, cw: cw, ch: ch, gap: gap,
      LW: LW, LH: LH, ox: 0, oy: 0, vx: 0, vy: 0,
      dragging: false, px: 0, py: 0, moved: 0, fade: 0, alive: true,
      hoverIndex: -1, filter: null, tiles: [], onPick: null, onHover: null
    };

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var mat = new THREE.ShaderMaterial({
          vertexShader: TILE_VERT, fragmentShader: TILE_FRAG, transparent: true,
          uniforms: {
            uTex: { value: null },
            uSize: { value: new THREE.Vector2(cw, ch) },
            uImg: { value: new THREE.Vector2(16, 9) },
            uHover: { value: 0 }, uDrag: { value: 0 },
            uFade: { value: 0 }, uDim: { value: 0 }, uReady: { value: 0 }
          }
        });
        var mesh = new THREE.Mesh(tileGeo, mat);
        mesh.frustumCulled = false;
        mesh.scale.set(cw, ch, 1);
        scene.add(mesh);
        mos.tiles.push({
          mesh: mesh, mat: mat, bx: c * (cw + gap), by: r * (ch + gap),
          key: null, src: null, idx: -1, hover: 0, dim: 0, ready: 0, x: 0, y: 0
        });
      }
    }

    var el = host;
    el.style.touchAction = 'none';
    mos.down = function (e) {
      mos.dragging = true; mos.moved = 0;
      mos.px = e.clientX; mos.py = e.clientY;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      el.classList.add('is-grabbing');
    };
    mos.move = function (e) {
      var rect = el.getBoundingClientRect();
      mos.mx = e.clientX - rect.left - rect.width / 2;
      mos.my = e.clientY - rect.top - rect.height / 2;
      if (!mos.dragging) return;
      var dx = e.clientX - mos.px, dy = e.clientY - mos.py;
      mos.px = e.clientX; mos.py = e.clientY;
      mos.ox += dx; mos.oy += dy;
      mos.vx = dx; mos.vy = dy;
      mos.moved += Math.abs(dx) + Math.abs(dy);
    };
    mos.up = function (e) {
      if (!mos.dragging) return;
      mos.dragging = false;
      el.classList.remove('is-grabbing');
      if (mos.moved < 6 && mos.hoverIndex >= 0 && mos.onPick) mos.onPick(mos.items[mos.hoverIndex]);
    };
    mos.wheel = function (e) {
      e.preventDefault();
      mos.ox -= e.deltaX * 0.9;
      mos.oy -= e.deltaY * 0.9;
      mos.vx = -e.deltaX * 0.25; mos.vy = -e.deltaY * 0.25;
    };
    el.addEventListener('pointerdown', mos.down);
    el.addEventListener('pointermove', mos.move);
    window.addEventListener('pointerup', mos.up);
    el.addEventListener('wheel', mos.wheel, { passive: false });
    return mos;
  }

  function unmountMosaic() {
    if (!mos) return;
    mos.host.removeEventListener('pointerdown', mos.down);
    mos.host.removeEventListener('pointermove', mos.move);
    window.removeEventListener('pointerup', mos.up);
    mos.host.removeEventListener('wheel', mos.wheel);
    mos.tiles.forEach(function (t) { scene.remove(t.mesh); t.mat.dispose(); });
    mos = null;
  }

  function wrap(v, m) { return ((v % m) + m) % m; }

  function syncMosaic() {
    if (!mos) return;
    var rect = mos.host.getBoundingClientRect();
    var live = mos.alive && rect.bottom > 0 && rect.top < H;
    mos.fade += ((live ? 1 : 0) - mos.fade) * 0.08;
    if (mos.fade < 0.01) { mos.tiles.forEach(function (t) { t.mesh.visible = false; }); return; }

    if (!mos.dragging) {
      mos.ox += mos.vx; mos.oy += mos.vy;
      mos.vx *= 0.94; mos.vy *= 0.94;
      if (Math.abs(mos.vx) < 0.01) mos.vx = 0;
      if (Math.abs(mos.vy) < 0.01) mos.vy = 0;
    }
    var drag = Math.min(1, (Math.abs(mos.vx) + Math.abs(mos.vy)) / 40);
    var cx = rect.left + rect.width / 2 - W / 2;
    var cy = -(rect.top + rect.height / 2) + H / 2;
    var best = -1, bestD = 1e9;

    mos.tiles.forEach(function (t) {
      var x = wrap(t.bx + mos.ox + mos.LW / 2, mos.LW) - mos.LW / 2;
      var y = wrap(t.by + mos.oy + mos.LH / 2, mos.LH) - mos.LH / 2;
      // which repetition of the lattice is this? hash it to a stable item
      var latX = Math.round((t.bx + mos.ox - x) / mos.LW);
      var latY = Math.round((t.by + mos.oy - y) / mos.LH);
      var slot = mos.tiles.indexOf(t);
      var key = latX + ':' + latY + ':' + slot;
      if (key !== t.key) {
        t.key = key;
        if (t.src && cache[t.src]) cache[t.src].pinned = false;
        var h = Math.abs((latX * 73856093) ^ (latY * 19349663) ^ (slot * 83492791));
        t.idx = h % mos.items.length;
        t.ready = 0;
        t.mat.uniforms.uReady.value = 0;
        (function (tile, item) {
          // videos show their poster frame in the mosaic
          var key2 = /^assets\/videos\//.test(item.src)
            ? item.src.replace('assets/videos/', 'assets/posters/').replace(/\.mp4$/i, '.jpg')
            : item.src;
          getTexture(key2, function (tex) {
            if (!tex) return;
            tile.src = key2;
            if (cache[key2]) cache[key2].pinned = true;
            tile.mat.uniforms.uTex.value = tex;
            tile.mat.uniforms.uImg.value.set(tex.image.width, tex.image.height);
          });
        })(t, mos.items[t.idx]);
      }
      t.x = x; t.y = y;
      t.mesh.visible = true;
      t.mesh.position.set(cx + x, cy - y, 0);
      if (t.mat.uniforms.uTex.value) t.ready += (1 - t.ready) * 0.12;
      t.mat.uniforms.uReady.value = t.ready;
      t.mat.uniforms.uDrag.value = drag;
      t.mat.uniforms.uFade.value = mos.fade;

      var dim = mos.filter && mos.items[t.idx].label !== mos.filter ? 1 : 0;
      t.dim += (dim - t.dim) * 0.12;
      t.mat.uniforms.uDim.value = t.dim;

      if (mos.mx != null) {
        var dx = Math.abs(mos.mx - x), dy = Math.abs(mos.my - y);
        if (dx < mos.cw / 2 && dy < mos.ch / 2) {
          var d = dx + dy;
          if (d < bestD) { bestD = d; best = t.idx; }
        }
      }
    });

    if (best !== mos.hoverIndex) {
      mos.hoverIndex = best;
      if (mos.onHover) mos.onHover(best >= 0 ? mos.items[best] : null);
    }
    mos.tiles.forEach(function (t) {
      var h = (t.idx === mos.hoverIndex && !mos.dragging) ? 1 : 0;
      t.hover += (h - t.hover) * 0.12;
      t.mat.uniforms.uHover.value = t.hover;
      t.mesh.position.z = t.hover * 60;
    });
  }

  /* ═══════════════ DISSOLVE ═══════════════ */

  var dissolve = null, dissolveMat = null, dissolveT = 0, dissolveOn = false;
  (function buildDissolve() {
    dissolveMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERT, fragmentShader: DISSOLVE_FRAG, transparent: false, depthTest: false,
      uniforms: {
        uFrom: { value: null }, uTo: { value: null },
        uFromImg: { value: new THREE.Vector2(16, 9) }, uToImg: { value: new THREE.Vector2(16, 9) },
        uRes: { value: new THREE.Vector2(W, H) },
        uProgress: { value: 0 }, uTime: { value: 0 }
      }
    });
    dissolve = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dissolveMat);
    dissolve.frustumCulled = false;
    dissolve.renderOrder = 999;
    dissolve.visible = false;
    scene.add(dissolve);
  })();

  /* ═══════════════ PROP ═══════════════ */

  var prop = null, hat = null, propHost = null, propWatch = null;

  function watchProp() {
    propHost = document.querySelector('[data-gl-prop]');
    if (!propHost || !THREE.GLTFLoader || prop) return;
    propWatch = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      propWatch.disconnect();
      loadProp();
    }, { rootMargin: '900px 0px' });
    propWatch.observe(propHost);
  }

  function loadProp() {
    var g = new THREE.GLTFLoader();
    var group = new THREE.Group();
    group.visible = false;
    scene.add(group);
    prop = group;
    var key = new THREE.DirectionalLight(0xfff0d8, 2.6); key.position.set(-1.2, 1.6, 1.4);
    var rim = new THREE.DirectionalLight(0x9fe8ff, 1.5); rim.position.set(1.4, 0.4, -1.2);
    group.add(key, rim, new THREE.AmbientLight(0xffffff, 0.55));
    g.load('assets/models/treasure-chest.glb', function (res) {
      var m = res.scene, box = new THREE.Box3().setFromObject(m);
      var size = box.getSize(new THREE.Vector3());
      m.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
      box.setFromObject(m);
      m.position.sub(box.getCenter(new THREE.Vector3()));
      group.add(m); group.visible = true;
    }, undefined, function () {});
    g.load('assets/models/strawhat.glb', function (res) {
      var m = res.scene, box = new THREE.Box3().setFromObject(m);
      var size = box.getSize(new THREE.Vector3());
      m.scale.setScalar(0.62 / Math.max(size.x, size.z));
      m.position.y = 0.38;
      hat = m; group.add(m);
    }, undefined, function () {});
  }

  /* ═══════════════ RESIZE ═══════════════ */

  function onResize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(DPR);
    renderer.setSize(W, H, false);
    setFov();
    rtBG.setSize(Math.round(W * DPR * 0.6), Math.round(H * DPR * 0.6));
    if (composer) { composer.setSize(W, H); composer.setPixelRatio(DPR); }
    if (bloom) bloom.setSize(W, H);
    if (postPass) postPass.uniforms.uAspect.value = W / H;
    dissolveMat.uniforms.uRes.value.set(W, H);
  }
  window.addEventListener('resize', onResize);
  renderer.setSize(W, H, false);
  if (postPass) postPass.uniforms.uAspect.value = W / H;

  /* ═══════════════ LOOP ═══════════════ */

  function tick() {
    requestAnimationFrame(tick);
    var t = clock.getElapsedTime();

    var y = window.scrollY;
    velocity += ((y - lastScroll) / Math.max(1, H) - velocity) * 0.1;
    velocity *= 0.94;
    lastScroll = y;

    for (var i = 0; i < planes.length; i++) syncPlane(planes[i], t);
    syncMosaic();

    if (glass) {
      glassHost = glassHost && glassHost.isConnected ? glassHost : document.querySelector('[data-gl-glass]');
      var hr = glassHost ? glassHost.getBoundingClientRect() : null;
      var p = hr ? Math.min(1, Math.max(0, -hr.top / Math.max(1, hr.height))) : 1;
      var fade = hr ? 1 - p : 0;
      glass.visible = fade > 0.02 && !dissolveOn;
      if (glass.visible) {
        var base = Math.min(W, H) * (window.innerWidth < 760 ? 0.3 : 0.26);
        glass.scale.setScalar(base * (0.82 + fade * 0.18));
        glass.position.set(W * 0.25, -H * 0.04 - p * H * 0.35, 240);
        glass.rotation.y = t * 0.22 + pointer.x * 0.6;
        glass.rotation.x = Math.sin(t * 0.18) * 0.25 + (pointer.y - 0.5) * -0.45;
        glassMat.uniforms.uTime.value = t;
        glassMat.uniforms.uAmp.value = 0.14 + Math.abs(velocity) * 0.5;
        glassMat.uniforms.uFade.value = fade;
        glassMat.uniforms.uWire.value = wire;
      }
    }

    if (prop && propHost && propHost.isConnected) {
      var pr = propHost.getBoundingClientRect();
      prop.visible = pr.bottom > -200 && pr.top < H + 200 && prop.children.length > 3;
      if (prop.visible) {
        prop.scale.setScalar(Math.min(pr.width, pr.height) * 0.62);
        prop.position.set(pr.left + pr.width / 2 - W / 2, -(pr.top + pr.height / 2) + H / 2, 120);
        prop.rotation.y = t * 0.35 + pointer.x * 0.7;
        prop.rotation.x = -0.15 + Math.sin(t * 0.5) * 0.06;
        if (hat) hat.position.y = 0.38 + Math.sin(t * 1.2) * 0.02;
      }
    } else if (prop) prop.visible = false;

    if (dissolveOn) {
      dissolveMat.uniforms.uTime.value = t;
      dissolveMat.uniforms.uProgress.value = dissolveT;
    }

    ripple.z *= 0.94;
    if (postPass) {
      postPass.uniforms.uTime.value = t;
      postPass.uniforms.uVelocity.value = velocity;
      postPass.uniforms.uRipple.value = ripple;
      postPass.uniforms.uFlash.value = dissolveOn ? Math.sin(dissolveT * Math.PI) : 0;
    }

    if (glass && glass.visible) {
      glass.visible = false;
      renderer.setRenderTarget(rtBG);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      glass.visible = true;
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  /* ═══════════════ API ═══════════════ */

  window.GL = {
    ready: true,
    mount: function (root) {
      root = root || document;
      Array.prototype.forEach.call(root.querySelectorAll('[data-gl]'), addPlane);
      glassHost = document.querySelector('[data-gl-glass]');
      watchProp();
      document.documentElement.classList.add('has-gl');
    },
    unmount: function () { clearPlanes(); unmountMosaic(); },
    start: function () { if (!started) { started = true; tick(); } },

    mountMosaic: mountMosaic,
    unmountMosaic: unmountMosaic,
    filterMosaic: function (label) { if (mos) mos.filter = label; },
    nudgeMosaic: function (dx, dy) { if (mos) { mos.vx += dx; mos.vy += dy; } },

    /* dissolve from the current plate into the next one, then back */
    transition: function (fromSrc, toSrc, midway, done) {
      if (reduced || !started) { midway && midway(); done && done(); return; }
      var run = function (a, b) {
        dissolveMat.uniforms.uFrom.value = a;
        dissolveMat.uniforms.uTo.value = b;
        if (a && a.image) dissolveMat.uniforms.uFromImg.value.set(a.image.width, a.image.height);
        if (b && b.image) dissolveMat.uniforms.uToImg.value.set(b.image.width, b.image.height);
        dissolve.visible = true; dissolveOn = true; dissolveT = 0;
        var t0 = performance.now(), swapped = false;
        (function step() {
          var e = (performance.now() - t0) / 1500;
          dissolveT = Math.min(1, e);
          if (dissolveT > 0.5 && !swapped) { swapped = true; midway && midway(); }
          if (dissolveT < 1) requestAnimationFrame(step);
          else {
            dissolve.visible = false; dissolveOn = false;
            done && done();
          }
        })();
      };
      getTexture(fromSrc, function (a) { getTexture(toSrc, function (b) { run(a, b); }); });
    },

    setLight: function (x, y) {
      light.set(x, y);
      var warm = (x + 1) / 2;
      glassMat.uniforms.uTint.value.setRGB(0.86 + warm * 0.16, 0.86, 0.94 - warm * 0.24);
      return warm;
    },
    toggleWire: function () { wire = wire ? 0 : 1; return !!wire; },
    flyHat: function () {
      if (!hat || typeof gsap === 'undefined') return false;
      gsap.to(hat.position, { y: 7, duration: 2.2, ease: 'power2.in' });
      gsap.to(hat.rotation, { z: 9, duration: 2.2, ease: 'none',
        onComplete: function () { hat.position.y = 0.38; hat.rotation.z = 0; } });
      return true;
    },
    count: function () { return planes.length; }
  };
})();
