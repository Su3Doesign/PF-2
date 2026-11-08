import * as THREE from 'three';
import { VPoint, VSpot } from './lights';
import { G, makeNoise3 } from './shared';
import { std, glowMaterial } from './materials';
import { TEXNOISE } from './noise';

/**
 * The end of the map: below the cloud sea, a calm sea at dawn, a rock with a lighthouse
 * whose beam turns and comes to rest on the email address. A paper map lies wet on the
 * rocks at its foot.
 */
export const SEA_Y = -150;
export const LIGHTHOUSE = new THREE.Vector3(60, SEA_Y, 1000);

export function createFinale(scene: THREE.Scene) {
  const group = new THREE.Group(); group.name = 'finale'; scene.add(group);

  // ---- the sea: Gerstner swell in the vertex shader, sky-ramp reflection and a sun glitter path
  const uniforms = {
    uTime: G.uTime, uTod: { value: 0.6 }, uSunDir: { value: new THREE.Vector3(0, 0.05, -1).normalize() }, uCam: { value: new THREE.Vector3() },
    uCalm: { value: 1 }, uChart: G.uChart, tNoise: G.tNoise,
  };
  const seaGeo = new THREE.PlaneGeometry(9000, 9000, 320, 320).rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime, uCalm; varying vec3 vW; varying vec3 vN;
      vec3 gerstner(vec2 p, vec2 dir, float steep, float wl, inout vec3 t, inout vec3 b){
        float k = 6.28318/wl; float c = sqrt(9.8/k); vec2 d = normalize(dir); float f = k*(dot(d,p) - c*uTime); float a = steep/k;
        t += vec3(-d.x*d.x*(steep*sin(f)), d.x*(steep*cos(f)), -d.x*d.y*(steep*sin(f)));
        b += vec3(-d.x*d.y*(steep*sin(f)), d.y*(steep*cos(f)), -d.y*d.y*(steep*sin(f)));
        return vec3(d.x*(a*cos(f)), a*sin(f), d.y*(a*cos(f)));
      }
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vec3 t = vec3(1.0,0.0,0.0), b = vec3(0.0,0.0,1.0); vec3 p = w.xyz;
        float s = mix(1.0, 0.35, uCalm);
        p += gerstner(w.xz, vec2(1.0,0.3), 0.16*s, 90.0, t, b);
        p += gerstner(w.xz, vec2(0.2,1.0), 0.12*s, 48.0, t, b);
        p += gerstner(w.xz, vec2(-0.7,0.6), 0.1*s, 26.0, t, b);
        p += gerstner(w.xz, vec2(0.9,-0.4), 0.08*s, 13.0, t, b);
        vN = normalize(cross(b, t)); vW = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uTod, uChart; uniform vec3 uSunDir, uCam; varying vec3 vW; varying vec3 vN;
      ${TEXNOISE}
      void main(){
        vec2 rip = texture2D(tNoise, vW.xz * 0.004 + uTime * 0.004).ba + texture2D(tNoise, vW.xz * 0.011 - uTime * 0.006).ba - 1.0;
        vec3 n = normalize(vN + vec3(rip.x, 0.0, rip.y) * 0.3);
        vec3 v = normalize(uCam - vW); vec3 r = reflect(-v, n);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        float h = clamp(r.y, 0.0, 1.0);
        float dawn = smoothstep(0.55, 1.0, uTod);
        vec3 skyLo = mix(vec3(0.04,0.05,0.11), vec3(0.36,0.17,0.115), dawn), skyHi = mix(vec3(0.01,0.015,0.04), vec3(0.06,0.075,0.15), dawn);
        vec3 refl = mix(skyLo, skyHi, smoothstep(0.0, 0.4, h));
        float sd = max(dot(r, normalize(uSunDir)), 0.0);
        refl += vec3(1.0,0.7,0.4) * (pow(sd, 380.0) * 10.0 + pow(sd, 40.0) * 0.45) * dawn;
        vec3 deep = mix(vec3(0.004,0.01,0.02), vec3(0.006,0.018,0.036), dawn);
        vec3 col = mix(deep, refl, fres);
        float dist = length(uCam - vW);
        col = mix(col, skyLo * 0.85, 1.0 - exp(-dist*0.00042));
        col = mix(col, vec3(0.02,0.026,0.055), uChart);
        gl_FragColor = vec4(col, 1.0);
      }`,
    toneMapped: true,
  }));
  sea.position.y = SEA_Y; sea.frustumCulled = false; group.add(sea);

  // ---- the rock and the lighthouse
  const lh = new THREE.Group(); lh.position.copy(LIGHTHOUSE); group.add(lh);
  const n3 = makeNoise3(3);
  const rockGeo = new THREE.IcosahedronGeometry(1, 5); const rp = rockGeo.getAttribute('position') as THREE.BufferAttribute; const v = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) { v.fromBufferAttribute(rp, i); const d = 1 + n3.fbm(v.x * 2, v.y * 2, v.z * 2, 4) * 0.5; v.multiplyScalar(d); v.x *= 26; v.z *= 18; v.y *= v.y > 0 ? 7 : 4; rp.setXYZ(i, v.x, v.y, v.z); }
  rockGeo.computeVertexNormals();
  lh.add(new THREE.Mesh(rockGeo, std(0x1c1d22, 0.95, 0, { bump: 0.7, bumpScale: 0.6, tint: 0.3 })));
  const towerGeo = new THREE.LatheGeometry([new THREE.Vector2(3.4, 0), new THREE.Vector2(3.0, 10), new THREE.Vector2(2.4, 24), new THREE.Vector2(2.2, 26)], 32);
  const towerTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const g = c.getContext('2d')!; g.fillStyle = '#e9e4d8'; g.fillRect(0, 0, 8, 64); g.fillStyle = '#8f2a22'; g.fillRect(0, 14, 8, 10); g.fillRect(0, 38, 8, 10); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const tower = new THREE.Mesh(towerGeo, new THREE.MeshStandardMaterial({ map: towerTex, roughness: 0.7 })); tower.position.y = 5; lh.add(tower);
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 24), std(0x1a1a1e, 0.5, 0.6, { contour: 0 })); gallery.position.y = 31.2; lh.add(gallery);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 3.2, 16), glowMaterial(0xffe3a8, 5)); lampRoom.position.y = 33; lh.add(lampRoom);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.4, 16), std(0x2a1a14, 0.5, 0.3, { contour: 0 })); cap.position.y = 35.8; lh.add(cap);
  const lhLight = new VPoint(0xffe0a8, 1200, 120, 1.4); lhLight.position.y = 33; lh.add(lhLight);
  // the beam: a long additive cone with a falloff along its length and edges
  const beamGeo = new THREE.ConeGeometry(16, 600, 48, 1, true); beamGeo.translate(0, -300, 0); beamGeo.rotateZ(Math.PI / 2);
  const beamU = { uI: { value: 1 } };
  const beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
    uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform float uI; varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ float along = clamp(vP.x/600.0, 0.0, 1.0); float edge = pow(abs(dot(vN, vV)), 1.6); float a = (1.0-along)*(1.0-along) * edge * 0.55 * uI; gl_FragColor = vec4(vec3(1.0,0.86,0.6)*a, 1.0); }',
  }));
  beam.position.y = 33; lh.add(beam);
  // the wet paper map at the foot
  const map = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6, 8, 6), std(0xcdbb94, 0.5, 0, { contour: 0 }));
  const mp = map.geometry.getAttribute('position') as THREE.BufferAttribute; for (let i = 0; i < mp.count; i++) mp.setZ(i, Math.sin(mp.getX(i) * 1.6) * 0.25);
  map.geometry.computeVertexNormals(); map.rotation.x = -Math.PI / 2 + 0.2; map.position.set(-6, 3.4, 16); lh.add(map);

  function update(s: { t: number; tod: number; cam: THREE.Vector3; beamAngle: number; beamI: number }) {
    uniforms.uTod.value = s.tod; uniforms.uCam.value.copy(s.cam);
    beam.rotation.y = s.beamAngle; beamU.uI.value = s.beamI;
  }
  return { group, update, beam, lh, sea };
}
