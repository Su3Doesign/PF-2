import * as THREE from 'three';
import { Effect, EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, NoiseEffect, ToneMappingEffect, ToneMappingMode, BlendFunction, ChromaticAberrationEffect } from 'postprocessing';
import { detectQuality, type Quality } from './quality';

export type FrameFn = (dt: number, t: number) => void;

/** Renderer, camera, post chain and the single frame loop everything hangs off. */
export class App {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: BloomEffect;
  vignette: VignetteEffect;
  chroma: ChromaticAberrationEffect;
  quality: Quality;
  private frames: FrameFn[] = [];
  private last = performance.now();
  private slow = 0;
  time = 0;
  running = true;
  dprScale = 1;
  still = false;
  renderOnce: (t?: number) => void = () => {};

  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: true, preserveDrawingBuffer: location.search.includes('still') });
    this.quality = detectQuality(this.renderer.getContext() as WebGL2RenderingContext);
    this.renderer.setPixelRatio(this.quality.dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.localClippingEnabled = true;
    this.camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.3, 9000);
    this.scene.fog = new THREE.FogExp2(0x0a0f22, 0.00085);

    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: this.quality.tier === 3 ? 4 : this.quality.tier === 2 && !this.quality.tablet ? 2 : 0 });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // One stray NaN or Inf pixel (a degenerate normal on a grazing clearcoat, say) would be
    // smeared across the whole frame by the bloom's mip chain, so the HDR buffer is
    // sanitised and clamped before anything blurs it.
    this.composer.addPass(new EffectPass(this.camera, new Effect('Sanitize', `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        // isnan() can be optimised away, so test the exponent bits directly
        uvec3 b = floatBitsToUint(c) & 0x7f800000u;
        if (b.x == 0x7f800000u || b.y == 0x7f800000u || b.z == 0x7f800000u) c = vec3(0.0);
        c = max(c, vec3(0.0));
        outputColor = vec4(min(c, vec3(48.0)), inputColor.a);
      }`)));
    this.bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.62, luminanceSmoothing: 0.22, intensity: 1.15, radius: 0.72, resolutionScale: this.quality.tier === 3 ? 0.5 : 0.35 });
    if (this.quality.tier < 3) (this.bloom as unknown as { mipmapBlurPass: { levels: number } }).mipmapBlurPass.levels = 6;
    this.vignette = new VignetteEffect({ offset: 0.28, darkness: 0.62 });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    noise.blendMode.opacity.value = 0.09;
    this.chroma = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0006, 0.0004), radialModulation: true, modulationOffset: 0.45 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    // Convolution effects (chromatic aberration, SMAA) each need a pass of their own.
    this.composer.addPass(new EffectPass(this.camera, this.bloom, tone, this.vignette, noise));
    // the extra full-screen passes only where the GPU has room for them
    if (this.quality.fancyPost) this.composer.addPass(new EffectPass(this.camera, this.chroma));

    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
    // ?still renders only on request (for captures on software GPUs)
    this.still = new URLSearchParams(location.search).has('still');
    const loop = () => {
      if (!this.still) requestAnimationFrame(loop);
      const now = performance.now();
      const dt = this.still ? 1 / 60 : Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.running || (document.hidden && !this.still)) return;
      this.time += dt;
      for (const f of this.frames) f(dt, this.time);
      this.composer.render(dt);
      if (!this.still) this.govern(dt);
    };
    this.renderOnce = (t?: number) => { if (t !== undefined) this.time = t; loop(); };
    if (!this.still) requestAnimationFrame(loop);
  }

  onFrame(f: FrameFn) { this.frames.push(f); }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.quality.dpr * this.dprScale);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h, false);
  }

  /** Frame governor: if frames run long for two seconds, step resolution down. */
  degrade = 0;
  onDegrade: (level: number) => void = () => {};
  private govern(dt: number) {
    if (dt > 0.024) this.slow += dt; else this.slow = Math.max(0, this.slow - dt * 0.5);
    if (this.slow > 1.5) {
      this.slow = 0;
      if (this.dprScale > 0.7) { this.dprScale = Math.max(0.7, this.dprScale - 0.15); this.resize(); }
      else if (this.degrade < 3) { this.degrade++; this.onDegrade(this.degrade); }
    }
  }
}
