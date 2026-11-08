import * as THREE from 'three';
import { TEXNOISE } from './noise';
import { G } from './shared';

/**
 * The sea of cloud the islands hang over. Stacked alpha layers share one domain-warped
 * noise field, so seen from above they read as billows, and skimmed from inside they
 * read as depth. The layer count follows the quality tier.
 */
export function createClouds(layers: number) {
  const group = new THREE.Group();
  const uniforms = {
    uTime: { value: 0 },
    uTod: { value: 0 },
    uDensity: { value: 1 },
    uMoonDir: { value: new THREE.Vector3(0.45, 0.33, -0.83).normalize() },
    uSunDir: { value: new THREE.Vector3(0, 0.02, -1).normalize() },
    uFogColor: { value: new THREE.Color('#0a0f22') },
    uCamPos: { value: new THREE.Vector3() },
    uWake: { value: 0 },
    uStorm: { value: 0 },
    uChart: { value: 0 },
    uGlow: { value: new THREE.Vector4(0, 0, 0, 0) }, // xyz glow source (e.g. a light-fall), w strength
    tNoise: G.tNoise,
  };
  const geo = new THREE.PlaneGeometry(9000, 9000, 1, 1).rotateX(-Math.PI / 2);
  for (let i = 0; i < layers; i++) {
    const t = layers === 1 ? 0.5 : i / (layers - 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uLayer: { value: t }, uY: { value: -46 + t * 30 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float uY;
        varying vec3 vWorld;
        void main(){
          vec4 w = modelMatrix * vec4(position.x, uY, position.z, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime, uTod, uDensity, uLayer, uWake, uStorm, uChart;
        uniform vec3 uMoonDir, uSunDir, uFogColor, uCamPos;
        uniform vec4 uGlow;
        varying vec3 vWorld;
        ${TEXNOISE}
        // domain-warped fbm from three texture fetches (was ~30 procedural noise evaluations)
        float field(vec2 p){
          vec2 q = texture2D(tNoise, p * 0.23 + vec2(uTime * 0.0012, 0.0)).rg - 0.5;
          return tn(p * 0.5 + q * 0.55 + vec2(uTime * 0.0016, uTime * 0.0007));
        }
        void main(){
          vec2 p = vWorld.xz * 0.0024 + vec2(uLayer * 3.1, uLayer * 1.7);
          float n = field(p);
          // camera wake: a soft dent under the camera when it skims the cloud
          float wd = length(vWorld.xz - uCamPos.xz);
          n -= uWake * 0.22 * exp(-wd*wd / 900.0);
          float thr = mix(0.44, 0.58, uLayer) + (1.0 - uDensity) * 0.5;
          float a = smoothstep(thr, thr + 0.16, n);
          if (a < 0.003) discard;
          // light: sample the field toward the light, brighter where it rises toward it
          vec3 L = normalize(mix(uMoonDir, uSunDir, smoothstep(0.55, 0.95, uTod)));
          float n2 = field(p + L.xz * 0.06);
          float lit = clamp(0.5 + (n - n2) * 7.0, 0.0, 1.0);
          vec3 shadow = mix(vec3(0.010,0.014,0.032), vec3(0.16,0.11,0.16), smoothstep(0.55,1.0,uTod));
          vec3 light  = mix(vec3(0.105,0.13,0.215), vec3(0.95,0.6,0.42), smoothstep(0.55,1.0,uTod));
          vec3 col = mix(shadow, light, lit * mix(0.45, 1.0, uLayer));
          // a warm glow where a light-fall plunges in
          float gd = length(vWorld - uGlow.xyz);
          col += vec3(0.79,0.66,0.42) * uGlow.w * exp(-gd*gd / 6000.0) * 0.6;
          col = mix(col, col * 0.35, uStorm);
          // distance fog into the horizon colour
          float dist = length(vWorld - uCamPos);
          float fog = 1.0 - exp(-dist * 0.00055);
          col = mix(col, uFogColor, fog);
          // fade out near the camera so layers never pop across the lens
          a *= smoothstep(4.0, 26.0, abs(vWorld.y - uCamPos.y) + dist * 0.15);
          a *= mix(0.55, 0.9, uLayer) * (1.0 - uChart);
          a *= 1.0 - smoothstep(1800.0, 3600.0, length(vWorld.xz - uCamPos.xz));
          gl_FragColor = vec4(col, a);
        }`,
    });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = -5 + i;
    group.add(m);
  }
  return { group, uniforms };
}
