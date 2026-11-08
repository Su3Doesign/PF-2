import * as THREE from 'three';
import { NOISE } from './glsl';
import { G, patchMaterial } from './shared';

/**
 * Parian marble: object-space 3D-noise veins, a soft wrap term standing in for
 * subsurface light, and kintsugi: gold-filled cracks that glow when uGold rises.
 */
export function marbleMaterial(opts: { scale?: number; gold?: { value: number }; crackScale?: number; tint?: THREE.ColorRepresentation; crackBase?: number } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ color: opts.tint ?? 0xeee9df, roughness: 0.32, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0 });
  const gold = opts.gold ?? { value: 0.15 };
  const sc = (opts.scale ?? 1).toFixed(4), cs = (opts.crackScale ?? 1).toFixed(4);
  mat.onBeforeCompile = (s) => {
    s.uniforms.uGold = gold; s.uniforms.uChart = G.uChart; s.uniforms.uTime = G.uTime; s.uniforms.uDim = G.uDim;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vWPos2;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos2 = (modelMatrix * vec4(transformed,1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vObj; varying vec3 vWPos2; uniform float uGold, uChart, uTime, uDim;
      ${NOISE}
      float veins(vec3 p){ float n = fbm3(p*0.7) ; return abs(sin(p.x*1.3 + p.y*0.6 + n*5.5)); }
      float crack(vec3 p){ float n = snoise(p*0.9)*0.5 + snoise(p*2.3)*0.25; return 1.0 - smoothstep(0.0, 0.035, abs(n)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 P = vObj * ${sc};
      float v = veins(P);
      float vein = 1.0 - smoothstep(0.0, 0.08, v);
      float vein2 = 1.0 - smoothstep(0.0, 0.25, abs(sin(P.z*0.9 + fbm3(P*1.3+4.0)*4.0)));
      diffuseColor.rgb *= 1.0 - vein*0.33 - vein2*0.08;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.96,0.94,0.9), fbm3(P*0.3)*0.5+0.5);
      float kc = crack(vObj * ${cs});`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(1.0,0.72,0.32) * kc * (${(opts.crackBase ?? 0.25).toFixed(3)} + uGold*4.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75,0.58,0.3), kc*${(opts.crackBase ?? 0.25) > 0 ? '0.85' : '0.0'});`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      // wrap light: marble lets a little light round the terminator
      reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.10,0.11,0.16) * 0.6;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
      if (uChart > 0.001) { float l = 1.0 - smoothstep(0.0, fwidth(vWPos2.y/1.5)*1.2, 0.5 - abs(fract(vWPos2.y/1.5)-0.5));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.02,0.026,0.055) + vec3(0.79,0.66,0.42)*l*0.8, uChart); }
      gl_FragColor.rgb *= 1.0 - uDim*0.7;`);
  };
  mat.customProgramCacheKey = () => `marble${sc}${cs}${opts.crackBase ?? 0.25}`;
  return mat;
}

/** Emissive surface with a slow flicker, for neon and lamps. */
export function glowMaterial(color: THREE.ColorRepresentation, strength = 3) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: false });
}

/** A quick physical material through the world patch. */
export function std(color: THREE.ColorRepresentation, rough = 0.8, metal = 0, extra: Parameters<typeof patchMaterial>[1] = {}) {
  return patchMaterial(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }), { contour: 3, ...extra });
}

/**
 * An image set into the world (a framed print, a window, a billboard). Unlit, with a
 * gentle emissive lift so it reads at night, and a hover brightening.
 */
export function imageMaterial(tex: THREE.Texture, glow = 1) {
  const u = { uHover: { value: 0 }, uGlow: { value: glow } };
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, ...u, uChart: G.uChart, uDim: G.uDim },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float uHover, uGlow, uChart, uDim; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(map, vUv).rgb;
        c = pow(c, vec3(2.2));
        c *= uGlow * (0.85 + uHover*0.5);
        float edge = max(smoothstep(0.0,0.012,vUv.x)*smoothstep(1.0,0.988,vUv.x), 0.0)*smoothstep(0.0,0.012,vUv.y)*smoothstep(1.0,0.988,vUv.y);
        c *= mix(0.6, 1.0, edge);
        c = mix(c, vec3(0.02,0.026,0.055) + vec3(0.79,0.66,0.42)*0.08, uChart);
        gl_FragColor = vec4(c * (1.0 - uDim*0.6), 1.0);
      }`,
    toneMapped: false,
  });
  return { mat, u };
}
