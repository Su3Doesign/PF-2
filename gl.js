/* ══════════════════════════════════════════════════════════════
   gl.js — the WebGL layer.

   One fixed canvas behind the whole document. Every image marked
   [data-gl] is lifted out of the DOM and drawn as a deformable
   plane locked to its element's rect, so scroll velocity bends it,
   the cursor pushes it, and it still resolves in render buckets.

   In front of it sits a glass artifact that genuinely refracts the
   scene behind it — the background is rendered to a target first,
   then sampled with per-channel dispersion.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('gl');
  if (!canvas || typeof window.THREE === 'undefined') { window.GL = null; return; }

  var PERSPECTIVE = 1400;
  var PASS = { beauty: 0, clay: 1, wire: 2, depth: 3 };

  /* ═══ SHADER CHUNKS ═══════════════════════════════════════ */

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

  /* ── plane ────────────────────────────────────────────────── */

  var PLANE_VERT = [
    'uniform float uVelocity, uHover, uTime, uEnter;',
    'uniform vec2 uMouse;',
    'varying vec2 vUv;',
    'varying float vBend;',
    'void main(){',
    '  vUv = uv;',
    '  vec3 pos = position;',
    '  float arc = sin(uv.x * 3.14159265);',
    '  float col = sin(uv.y * 3.14159265);',
    // scroll velocity curls the plane away from the viewer
    '  float bend = arc * col * uVelocity * 0.85;',
    '  pos.z += bend;',
    '  pos.y += arc * uVelocity * 0.22;',
    // the cursor pushes a dent into it while hovering
    '  float d = distance(uv, uMouse * 0.5 + 0.5);',
    '  float dent = exp(-d * 5.5) * uHover * 0.16;',
    '  pos.z += dent;',
    // it also enters with a fold
    '  pos.z += arc * (1.0 - uEnter) * 0.35;',
    '  vBend = bend + dent;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
    '}'
  ].join('\n');

  var PLANE_FRAG = [
    'precision highp float;',
    'uniform sampler2D uTex;',
    'uniform vec2 uSize, uImg, uMouse;',
    'uniform float uProgress, uVelocity, uHover, uTime, uPass, uAlpha;',
    'varying vec2 vUv;',
    'varying float vBend;',

    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',

    'vec2 cover(vec2 uv){',
    '  float boxA = uSize.x / uSize.y;',
    '  float imgA = uImg.x / uImg.y;',
    '  vec2 s = boxA > imgA ? vec2(1.0, imgA / boxA) : vec2(boxA / imgA, 1.0);',
    '  return (uv - 0.5) * s + 0.5;',
    '}',

    'vec3 grade(vec3 c, vec2 uv){',
    '  if (uPass < 0.5) return c;',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  if (uPass < 1.5) return vec3(pow(l, 0.85)) * 0.86 + 0.06;',
    '  if (uPass < 2.5){',
    '    vec2 g = fract(uv * vec2(30.0, 18.0));',
    '    float line = step(0.94, max(g.x, g.y));',
    '    return mix(c * 0.08, vec3(0.18, 0.83, 0.75), line * 0.6);',
    '  }',
    '  float d = clamp(mix(1.0 - uv.y, l, 0.4), 0.0, 1.0);',
    '  return vec3(pow(d, 1.6));',
    '}',

    'void main(){',
    '  vec2 uv = cover(vUv);',
    // parallax: the image drifts a little slower than its frame
    '  uv += (vUv - 0.5) * -0.045 * (1.0 + uHover);',
    '  float split = (abs(uVelocity) * 0.9 + uHover * 0.35) * 0.012;',

    '  float r = texture2D(uTex, clamp(uv + vec2(split, 0.0), 0.001, 0.999)).r;',
    '  float g = texture2D(uTex, clamp(uv, 0.001, 0.999)).g;',
    '  float b = texture2D(uTex, clamp(uv - vec2(split, 0.0), 0.001, 0.999)).b;',
    '  vec3 col = vec3(r, g, b);',

    // buckets: scanline order with jitter, noise while a bucket resolves
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

    // the fold catches light
    '  col += clamp(vBend * 0.55, -0.25, 0.25);',
    '  col = grade(col, vUv);',
    '  gl_FragColor = vec4(col, uAlpha * reveal);',
    '}'
  ].join('\n');

  /* ── glass artifact ───────────────────────────────────────── */

  var GLASS_VERT = [
    'uniform float uTime, uAmp, uPointer;',
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
    // finite-difference normal so the light behaves on the new surface
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
    'uniform float uTime, uPass, uFade;',
    'varying vec3 vNormalW;',
    'varying vec3 vViewDir;',
    'varying vec4 vScreen;',
    'varying float vRidge;',
    'void main(){',
    '  vec2 suv = (vScreen.xy / vScreen.w) * 0.5 + 0.5;',
    '  vec3 n = normalize(vNormalW);',
    '  vec3 v = normalize(vViewDir);',
    '  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.6);',
    // per-channel refraction offsets — cheap dispersion
    '  vec2 off = n.xy * 0.13;',
    '  float r = texture2D(uScene, clamp(suv - off * 1.14, 0.002, 0.998)).r;',
    '  float g = texture2D(uScene, clamp(suv - off * 1.00, 0.002, 0.998)).g;',
    '  float b = texture2D(uScene, clamp(suv - off * 0.86, 0.002, 0.998)).b;',
    '  vec3 refr = vec3(r, g, b);',
    '  vec3 col = mix(refr * uTint, vec3(1.0), fres * 0.55);',
    // a hard specular so it reads as a solid object, not a smear
    '  vec3 L = normalize(vec3(-0.5, 0.85, 0.6));',
    '  float spec = pow(max(dot(reflect(-L, n), v), 0.0), 42.0);',
    '  col += spec * 0.85;',
    '  col += smoothstep(0.35, 0.95, vRidge) * 0.10;',
    '  if (uPass > 0.5 && uPass < 1.5) col = vec3(dot(col, vec3(0.33)) * 0.8 + 0.12);',
    '  if (uPass > 1.5 && uPass < 2.5){',
    '    float w = step(0.86, fres);',
    '    col = mix(vec3(0.04), vec3(0.18, 0.83, 0.75), w);',
    '  }',
    '  if (uPass > 2.5) col = vec3(clamp(0.6 + n.z * 0.4, 0.0, 1.0));',
    '  gl_FragColor = vec4(col, uFade * (0.55 + fres * 0.45));',
    '}'
  ].join('\n');

  /* ── post ─────────────────────────────────────────────────── */

  var POST = {
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uRipple: { value: null },
      uAspect: { value: 1 }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'precision highp float;',
      'uniform sampler2D tDiffuse;',
      'uniform float uTime, uVelocity, uAspect;',
      'uniform vec4 uRipple;', // xy = pointer, z = strength, w = trail age
      'varying vec2 vUv;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'void main(){',
      '  vec2 uv = vUv;',
      '  vec2 c = uv - 0.5;',
      // barrel, very slight, keeps the frame feeling like glass
      '  uv = uv + c * dot(c, c) * 0.035;',
      // pointer ripple
      '  vec2 pd = (uv - uRipple.xy) * vec2(uAspect, 1.0);',
      '  float pr = length(pd);',
      '  float ring = sin(pr * 34.0 - uTime * 3.4) * exp(-pr * 9.0) * uRipple.z;',
      '  uv += normalize(pd + 0.0001) * ring * 0.006;',
      // chromatic aberration scales with scroll velocity
      '  float amt = 0.0016 + abs(uVelocity) * 0.02;',
      '  vec2 dir = normalize(c + 0.0001);',
      '  float r = texture2D(tDiffuse, uv + dir * amt).r;',
      '  vec4 g = texture2D(tDiffuse, uv);',
      '  float b = texture2D(tDiffuse, uv - dir * amt).b;',
      '  vec3 col = vec3(r, g.g, b);',
      // grain + vignette
      '  float n = hash(uv * 900.0 + fract(uTime) * 100.0);',
      '  col += (n - 0.5) * 0.035;',
      '  col *= 1.0 - dot(c, c) * 0.28;',
      '  gl_FragColor = vec4(col, g.a);',
      '}'
    ].join('\n')
  };

  /* ═══ RENDERER ════════════════════════════════════════════ */

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
  var loader = new THREE.TextureLoader();
  var clock = new THREE.Clock();

  /* ═══ COMPOSER ════════════════════════════════════════════ */

  var composer = null, postPass = null, bloom = null;
  try {
    if (THREE.EffectComposer && THREE.RenderPass && THREE.ShaderPass) {
      composer = new THREE.EffectComposer(renderer);
      composer.setPixelRatio(DPR);
      composer.setSize(W, H);
      composer.addPass(new THREE.RenderPass(scene, camera));
      if (THREE.UnrealBloomPass) {
        bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.34, 0.85, 0.82);
        composer.addPass(bloom);
      }
      postPass = new THREE.ShaderPass(POST);
      postPass.renderToScreen = true;
      composer.addPass(postPass);
    }
  } catch (e) { composer = null; }

  /* ═══ PLANES ══════════════════════════════════════════════ */

  var planes = [];
  var planeGeo = new THREE.PlaneGeometry(1, 1, 28, 20);

  function addPlane(node) {
    var src = node.getAttribute('data-gl');
    if (!src) return;
    var mat = new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT,
      fragmentShader: PLANE_FRAG,
      transparent: true,
      uniforms: {
        uTex: { value: null },
        uSize: { value: new THREE.Vector2(1, 1) },
        uImg: { value: new THREE.Vector2(16, 9) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uProgress: { value: reduced ? 1 : 0 },
        uVelocity: { value: 0 },
        uHover: { value: 0 },
        uEnter: { value: reduced ? 1 : 0 },
        uAlpha: { value: 1 },
        uTime: { value: 0 },
        uPass: { value: 0 }
      }
    });

    var mesh = new THREE.Mesh(planeGeo, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);

    var item = { node: node, mesh: mesh, mat: mat, loaded: false, target: 0, hover: 0, hoverT: 0, enter: 0 };
    planes.push(item);

    // load only when the element is near the viewport
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      loader.load(src, function (tex) {
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        mat.uniforms.uTex.value = tex;
        mat.uniforms.uImg.value.set(tex.image.width, tex.image.height);
        item.loaded = true;
        item.target = 1;
        node.classList.add('is-gl');
      }, undefined, function () {
        node.classList.add('is-gl-failed');
      });
    }, { rootMargin: '400px 0px' });
    io.observe(node);

    node.addEventListener('pointerenter', function () { item.hoverT = 1; });
    node.addEventListener('pointerleave', function () { item.hoverT = 0; });
    node.addEventListener('pointermove', function (e) {
      var r = node.getBoundingClientRect();
      item.mat.uniforms.uMouse.value.set(
        ((e.clientX - r.left) / r.width - 0.5) * 2,
        -((e.clientY - r.top) / r.height - 0.5) * 2
      );
    });
  }

  /* ═══ GLASS ═══════════════════════════════════════════════ */

  var glass = null, glassMat = null;
  function buildGlass() {
    var detail = window.innerWidth < 760 ? 3 : 5;
    glassMat = new THREE.ShaderMaterial({
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: true,
      uniforms: {
        uScene: { value: rtBG.texture },
        uTint: { value: new THREE.Color(0.98, 0.86, 0.72) },
        uTime: { value: 0 },
        uAmp: { value: 0.16 },
        uPointer: { value: 0 },
        uPass: { value: 0 },
        uFade: { value: 1 }
      }
    });
    glass = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), glassMat);
    glass.frustumCulled = false;
    scene.add(glass);
  }
  buildGlass();

  /* ═══ CLOSING OBJECT (chest + hat) ════════════════════════ */

  var prop = null, hat = null, propHost = null;
  (function watchProp() {
    if (!THREE.GLTFLoader) return;
    propHost = document.querySelector('[data-gl-prop]');
    if (!propHost) return;
    // 3 MB of chest — don't fetch it until the closer is in sight
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      loadProp();
    }, { rootMargin: '900px 0px' });
    io.observe(propHost);
  })();

  function loadProp() {
    var g = new THREE.GLTFLoader();
    var group = new THREE.Group();
    group.visible = false;
    scene.add(group);
    prop = group;

    var key = new THREE.DirectionalLight(0xfff0d8, 2.6);
    key.position.set(-1.2, 1.6, 1.4);
    var rim = new THREE.DirectionalLight(0x9fe8ff, 1.5);
    rim.position.set(1.4, 0.4, -1.2);
    group.add(key, rim, new THREE.AmbientLight(0xffffff, 0.55));

    g.load('assets/models/treasure-chest.glb', function (res) {
      var m = res.scene;
      var box = new THREE.Box3().setFromObject(m);
      var size = box.getSize(new THREE.Vector3());
      var s = 1 / Math.max(size.x, size.y, size.z);
      m.scale.setScalar(s);
      box.setFromObject(m);
      var c = box.getCenter(new THREE.Vector3());
      m.position.sub(c);
      group.add(m);
      group.visible = true;
    }, undefined, function () {});

    g.load('assets/models/strawhat.glb', function (res) {
      var m = res.scene;
      var box = new THREE.Box3().setFromObject(m);
      var size = box.getSize(new THREE.Vector3());
      var s = 0.62 / Math.max(size.x, size.z);
      m.scale.setScalar(s);
      m.position.y = 0.38;
      hat = m;
      group.add(m);
    }, undefined, function () {});
  }

  /* ═══ STATE ═══════════════════════════════════════════════ */

  var velocity = 0, velTarget = 0, lastScroll = window.scrollY;
  var pointer = new THREE.Vector2(0.5, 0.5);
  var ripple = new THREE.Vector4(0.5, 0.5, 0, 0);
  var passId = 0, started = false, heroFade = 1;

  window.addEventListener('pointermove', function (e) {
    pointer.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    ripple.x = pointer.x; ripple.y = pointer.y; ripple.z = Math.min(1, ripple.z + 0.35);
  }, { passive: true });

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
  }
  window.addEventListener('resize', onResize);
  renderer.setSize(W, H, false);
  if (postPass) postPass.uniforms.uAspect.value = W / H;

  /* ═══ LOOP ════════════════════════════════════════════════ */

  function syncPlane(item, t) {
    var r = item.node.getBoundingClientRect();
    var off = 400;
    var near = r.bottom > -off && r.top < H + off;
    item.mesh.visible = near && item.loaded;
    if (!item.mesh.visible) return;

    item.mesh.position.set(
      r.left + r.width / 2 - W / 2,
      -(r.top + r.height / 2) + H / 2,
      0
    );
    item.mesh.scale.set(r.width, r.height, 1);

    var u = item.mat.uniforms;
    u.uSize.value.set(r.width, r.height);
    u.uTime.value = t;
    u.uVelocity.value += (velocity - u.uVelocity.value) * 0.12;
    item.hover += (item.hoverT - item.hover) * 0.09;
    u.uHover.value = item.hover;
    u.uPass.value = passId;

    // resolve buckets once it has actually arrived on screen
    if (item.loaded && r.top < H * 0.92 && item.target === 1) {
      u.uProgress.value = Math.min(1, u.uProgress.value + 0.022);
      item.enter += (1 - item.enter) * 0.05;
      u.uEnter.value = item.enter;
    }
  }

  function tick() {
    requestAnimationFrame(tick);
    var t = clock.getElapsedTime();

    // scroll velocity, normalised and damped
    var y = window.scrollY;
    velTarget = (y - lastScroll) / Math.max(1, H);
    lastScroll = y;
    velocity += (velTarget - velocity) * 0.1;
    velocity *= 0.94;

    for (var i = 0; i < planes.length; i++) syncPlane(planes[i], t);

    if (glass) {
      var hero = document.getElementById('hero');
      var hr = hero ? hero.getBoundingClientRect() : null;
      var p = hr ? Math.min(1, Math.max(0, -hr.top / Math.max(1, hr.height))) : 1;
      heroFade = 1 - p;
      glass.visible = heroFade > 0.02;
      if (glass.visible) {
        var base = Math.min(W, H) * (window.innerWidth < 760 ? 0.30 : 0.26);
        glass.scale.setScalar(base * (0.82 + heroFade * 0.18));
        glass.position.set(W * 0.24, -H * 0.04 - p * H * 0.35, 240);
        glass.rotation.y = t * 0.22 + pointer.x * 0.5;
        glass.rotation.x = Math.sin(t * 0.18) * 0.25 + (pointer.y - 0.5) * -0.4;
        glassMat.uniforms.uTime.value = t;
        glassMat.uniforms.uAmp.value = 0.14 + Math.abs(velocity) * 0.5;
        glassMat.uniforms.uPass.value = passId;
        glassMat.uniforms.uFade.value = heroFade;
      }
    }

    if (prop && propHost) {
      var pr = propHost.getBoundingClientRect();
      var vis = pr.bottom > -200 && pr.top < H + 200;
      prop.visible = vis && prop.children.length > 3;
      if (prop.visible) {
        var scl = Math.min(pr.width, pr.height) * 0.62;
        prop.scale.setScalar(scl);
        prop.position.set(pr.left + pr.width / 2 - W / 2, -(pr.top + pr.height / 2) + H / 2, 120);
        prop.rotation.y = t * 0.35 + pointer.x * 0.6;
        prop.rotation.x = -0.15 + Math.sin(t * 0.5) * 0.06;
        if (hat) hat.position.y = 0.38 + Math.sin(t * 1.2) * 0.02;
      }
    }

    ripple.z *= 0.94;
    if (postPass) {
      postPass.uniforms.uTime.value = t;
      postPass.uniforms.uVelocity.value = velocity;
      postPass.uniforms.uRipple.value = ripple;
    }

    // background pass for the glass to refract
    if (glass && glass.visible) {
      glass.visible = false;
      renderer.setRenderTarget(rtBG);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      glass.visible = true;
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  /* ═══ API ═════════════════════════════════════════════════ */

  window.GL = {
    ready: true,
    mount: function () {
      var nodes = document.querySelectorAll('[data-gl]');
      Array.prototype.forEach.call(nodes, addPlane);
      document.documentElement.classList.add('has-gl');
    },
    start: function () {
      if (started) return;
      started = true;
      tick();
    },
    setPass: function (p) { passId = PASS[p] != null ? PASS[p] : 0; },
    flyHat: function () {
      if (!hat || typeof gsap === 'undefined') return false;
      gsap.to(hat.position, { y: 6, duration: 2.2, ease: 'power2.in' });
      gsap.to(hat.rotation, { z: 8, duration: 2.2, ease: 'none',
        onComplete: function () { hat.position.y = 0.38; hat.rotation.z = 0; } });
      return true;
    },
    count: function () { return planes.length; }
  };
})();
