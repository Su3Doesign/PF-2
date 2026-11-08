import * as THREE from 'three';
import { NOISE } from './glsl';

/**
 * The sky dome. One uniform, uTod, carries the voyage from deep night (0) through
 * moonrise and blue hour to sunrise (1). Stars, a Milky Way band, the moon and the sun
 * are all procedural, so the sky costs no download.
 */
export function createSky() {
  const uniforms = {
    uTime: { value: 0 },
    uTod: { value: 0 },
    uStorm: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0.45, 0.33, -0.83).normalize() },
    uSunDir: { value: new THREE.Vector3(0.0, -0.05, -1).normalize() },
    uMeteor: { value: 0 },
    uChart: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime, uTod, uStorm, uMeteor, uChart;
      uniform vec3 uMoonDir, uSunDir;
      varying vec3 vDir;
      ${NOISE}
      vec3 skyRamp(float h, float tod){
        // night palette (ink tokens) and dawn palette, blended by time of day
        vec3 zN = vec3(0.006,0.008,0.022), mN = vec3(0.016,0.022,0.055), hN = vec3(0.040,0.054,0.115);
        vec3 zP = vec3(0.030,0.040,0.090), mP = vec3(0.110,0.120,0.210), hP = vec3(0.420,0.300,0.300);
        vec3 zD = vec3(0.040,0.060,0.140), mD = vec3(0.170,0.170,0.270), hD = vec3(0.640,0.330,0.200);
        float a = smoothstep(0.35, 0.7, tod), b = smoothstep(0.62, 1.0, tod);
        vec3 z = mix(mix(zN,zP,a),zD,b), m = mix(mix(mN,mP,a),mD,b), hz = mix(mix(hN,hP,a),hD,b);
        float t = clamp(h,0.0,1.0);
        vec3 c = mix(hz, m, smoothstep(0.0, 0.25, t));
        c = mix(c, z, smoothstep(0.2, 0.85, t));
        if (h < 0.0) c = mix(hz, hz*0.35, smoothstep(0.0, -0.25, h));
        return c;
      }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = skyRamp(h, uTod);
        // horizon glow toward the sun as dawn comes
        float sunAmt = smoothstep(0.45, 1.0, uTod);
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        col += vec3(1.0,0.5,0.22) * pow(sd, 8.0) * 0.28 * sunAmt * (1.0 - smoothstep(0.0,0.5,h));
        col += vec3(1.0,0.75,0.45) * pow(sd, 64.0) * 0.8 * sunAmt;
        float disc = smoothstep(0.9993, 0.9997, sd);
        col += vec3(3.0,1.8,0.9) * disc * smoothstep(0.7, 0.95, uTod);

        // stars: a grid on the sphere, one candidate per cell
        float night = 1.0 - smoothstep(0.55, 0.9, uTod);
        vec3 sp = d * 420.0;
        vec3 cell = floor(sp); vec3 f = fract(sp) - 0.5;
        float rnd = hash13(cell);
        float star = step(0.985, rnd) * smoothstep(0.42, 0.0, length(f));
        float tw = 0.6 + 0.4 * sin(uTime * (1.5 + rnd * 5.0) + rnd * 60.0);
        float mag = pow(fract(rnd * 91.7), 6.0);
        col += vec3(0.85,0.88,1.0) * star * (0.25 + 2.4 * mag) * tw * night * smoothstep(-0.02, 0.15, h);
        // a few bright warm stars
        vec3 sp2 = d * 90.0; vec3 c2 = floor(sp2); float r2 = hash13(c2 + 7.0);
        col += vec3(1.0,0.9,0.75) * step(0.996, r2) * smoothstep(0.3, 0.0, length(fract(sp2)-0.5)) * 1.6 * night;

        // Milky Way: a soft band around a tilted great circle
        vec3 axis = normalize(vec3(0.38, 0.86, 0.34));
        float band = 1.0 - abs(dot(d, axis));
        float mw = smoothstep(0.82, 1.0, band);
        float cl = fbm3(d * 3.2 + 4.0) * 0.5 + 0.5;
        float dust = smoothstep(0.35, 0.8, fbm3(d * 7.0 - 3.0) * 0.5 + 0.5);
        col += vec3(0.32,0.34,0.52) * mw * cl * (1.0 - dust * 0.7) * 0.22 * night * smoothstep(-0.05, 0.25, h);

        // the moon
        float md = dot(d, normalize(uMoonDir));
        float moonUp = (1.0 - smoothstep(0.6, 0.95, uTod));
        float mdisc = smoothstep(0.99955, 0.9997, md);
        float crater = 0.85 + 0.15 * snoise(d * 900.0);
        col = mix(col, vec3(1.25,1.22,1.12) * crater, mdisc * moonUp);
        col += vec3(0.55,0.6,0.8) * pow(max(md,0.0), 180.0) * 0.5 * moonUp;
        col += vec3(0.25,0.3,0.45) * pow(max(md,0.0), 16.0) * 0.12 * moonUp;

        // storm darkens and flattens
        col = mix(col, vec3(0.03,0.04,0.07) + col*0.25, uStorm * 0.85);

        // meteor streak (easter egg, after 23:00)
        if (uMeteor > 0.0) {
          vec3 a0 = normalize(vec3(-0.2, 0.7, -0.68)); vec3 a1 = normalize(vec3(0.3, 0.5, -0.8));
          vec3 hd = normalize(mix(a0, a1, uMeteor));
          float ln = max(dot(d, hd), 0.0);
          col += vec3(1.0,0.9,0.7) * pow(ln, 9000.0) * 3.0 * (1.0 - uMeteor);
        }
        // chart mode: the sky becomes ink
        col = mix(col, vec3(0.018,0.022,0.045), uChart * 0.9);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}
