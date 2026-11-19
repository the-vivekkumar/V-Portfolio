import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { store, damp } from '../lib/scroll.js';

// A slowly turning sphere of connected points behind the character: a neural network seen in 3D.
// Nodes and links are shaded by depth (near = bright, far = dim) and pulses travel along some of the links.
// A slim ring with a few orbiting nodes circles it. Everything is drawn behind the character picture.
const R = 2.05;                          // sphere radius in the character's units
const CENTER = [-0.1, 2.25, -1.0];        // behind his head and shoulders

function build(count) {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts = [];
  const shell = Math.round(count * 0.84);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < shell; i++) {
    const y = 1 - (i + 0.5) / shell * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    const k = R * (0.93 + rnd() * 0.08);
    pts.push(new THREE.Vector3(Math.cos(a) * r * k, y * k, Math.sin(a) * r * k));
  }
  for (let i = shell; i < count; i++) {
    const v = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(R * (0.3 + rnd() * 0.4));
    pts.push(v);
  }
  // each node links to its 3 nearest neighbours
  const seen = new Set(), edges = [];
  pts.forEach((p, i) => {
    pts.map((q, j) => [j, p.distanceToSquared(q)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([j, d2]) => {
      if (d2 > (R * 0.78) ** 2) return;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) { seen.add(key); edges.push([i, j]); }
    });
  });
  const lp = new Float32Array(edges.length * 6), lt = new Float32Array(edges.length * 2), lph = new Float32Array(edges.length * 2), lact = new Float32Array(edges.length * 2);
  edges.forEach(([a, b], i) => {
    pts[a].toArray(lp, i * 6); pts[b].toArray(lp, i * 6 + 3);
    lt[i * 2] = 0; lt[i * 2 + 1] = 1;
    const ph = rnd(), act = rnd() < 0.3 ? 1 : 0;
    lph[i * 2] = lph[i * 2 + 1] = ph;
    lact[i * 2] = lact[i * 2 + 1] = act;
  });
  const pp = new Float32Array(pts.length * 3), ps = new Float32Array(pts.length), pseed = new Float32Array(pts.length);
  pts.forEach((p, i) => { p.toArray(pp, i * 3); ps[i] = 0.06 + rnd() * 0.06 + (i >= shell ? 0.015 : 0); pseed[i] = rnd(); });
  return { pp, ps, pseed, lp, lt, lph, lact };
}

const COMMON = /* glsl */`
  uniform float uTime; uniform float uOpacity; uniform float uPpu; uniform float uRad; uniform vec3 uCenterView;
  varying float vDepth;
  float depthOf(vec4 mv) { return clamp((mv.z - uCenterView.z) / uRad * 0.5 + 0.5, 0.0, 1.0); }
`;
const POINT_VS = /* glsl */`${COMMON}
  attribute float aSize; attribute float aSeed; varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vDepth = depthOf(mv);
    vTw = 0.72 + 0.28 * sin(uTime * 1.3 + aSeed * 6.2831);
    gl_PointSize = aSize * uPpu * (9.0 / -mv.z) * (0.55 + 0.9 * vDepth);
  }`;
const POINT_FS = /* glsl */`
  uniform float uOpacity; varying float vDepth; varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(1.0, 0.15, d);
    vec3 col = mix(vec3(0.16, 0.34, 0.85), vec3(0.72, 0.93, 1.0), vDepth);
    gl_FragColor = vec4(col, core * (0.25 + 0.75 * vDepth) * vTw * uOpacity);
  }`;
const LINE_VS = /* glsl */`${COMMON}
  attribute float aT; attribute float aPh; attribute float aAct; varying float vT; varying float vPh; varying float vAct;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vDepth = depthOf(mv); vT = aT; vPh = aPh; vAct = aAct;
  }`;
const LINE_FS = /* glsl */`
  uniform float uTime; uniform float uOpacity; varying float vDepth; varying float vT; varying float vPh; varying float vAct;
  void main() {
    vec3 base = mix(vec3(0.14, 0.32, 0.8), vec3(0.45, 0.72, 1.0), vDepth);
    float a = (0.1 + 0.26 * vDepth);
    float p = fract(uTime * 0.2 + vPh);
    float pulse = exp(-pow((vT - p) * 7.0, 2.0)) * vAct;
    vec3 col = mix(base, vec3(0.8, 0.97, 1.0), pulse);
    gl_FragColor = vec4(col, (a + pulse * 0.75 * (0.4 + vDepth)) * uOpacity);
  }`;

export default function NeuralSphere({ pose }) {
  const { camera, gl } = useThree();
  const g = useRef(), spin = useRef(), ring = useRef(), orbit = useRef();
  const sim = useRef({ t: 0, ry: 0, rx: 0, px: 0, py: 0 });
  const small = store.portrait;
  const data = useMemo(() => build(small ? 92 : 150), [small]);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), s: new THREE.Vector2() }), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uOpacity: { value: 0 }, uPpu: { value: 200 }, uRad: { value: R }, uCenterView: { value: new THREE.Vector3() }
  }), []);
  const ringPts = useMemo(() => Array.from({ length: 161 }, (_, i) => { const a = (i / 160) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.2, 0); }), []);
  const ringGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(ringPts), [ringPts]);
  const orbitGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array([0.11, 0.08, 0.09]), 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array([0.1, 0.5, 0.9]), 1));
    return geo;
  }, []);

  useFrame((state, dt) => {
    const o = Math.min(1, pose.glow);
    g.current.visible = o > 0.01;
    if (!g.current.visible) return;
    const s = sim.current;
    dt = Math.min(dt, 0.1);
    const still = store.reduced;
    if (!still) s.t += dt;
    s.px = damp(s.px, still ? 0 : store.pointer.x, 3, dt);
    s.py = damp(s.py, still ? 0 : store.pointer.y, 3, dt);

    spin.current.rotation.set(0.32 - s.py * 0.16, s.t * 0.13 + s.px * 0.3, 0.12);
    ring.current.rotation.set(1.12 - s.py * 0.1, 0.3 + s.px * 0.2, s.t * 0.18);
    g.current.position.set(CENTER[0] + s.px * 0.1, CENTER[1] + s.py * 0.05 + (still ? 0 : Math.sin(s.t * 0.7) * 0.03), CENTER[2]);

    // orbiting nodes on the ring
    const a = orbitGeo.attributes.position;
    for (let i = 0; i < 3; i++) {
      const ang = s.t * (0.7 + i * 0.15) + i * 2.1;
      a.setXYZ(i, Math.cos(ang) * R * 1.2, Math.sin(ang) * R * 1.2, 0);
    }
    a.needsUpdate = true;

    // uniforms shared by every material
    g.current.updateWorldMatrix(true, false);
    tmp.v.set(0, 0, 0).applyMatrix4(g.current.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    uniforms.uCenterView.value.copy(tmp.v);
    gl.getDrawingBufferSize(tmp.s);
    uniforms.uPpu.value = tmp.s.y / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z);
    uniforms.uRad.value = R * Math.max(pose.s, 0.2);
    uniforms.uTime.value = s.t;
    uniforms.uOpacity.value = o;
  });

  const add = { transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms };
  return (
    <group ref={g} renderOrder={0}>
      <group ref={spin}>
        <lineSegments renderOrder={0} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[data.lp, 3]} />
            <bufferAttribute attach="attributes-aT" args={[data.lt, 1]} />
            <bufferAttribute attach="attributes-aPh" args={[data.lph, 1]} />
            <bufferAttribute attach="attributes-aAct" args={[data.lact, 1]} />
          </bufferGeometry>
          <shaderMaterial vertexShader={LINE_VS} fragmentShader={LINE_FS} {...add} />
        </lineSegments>
        <points renderOrder={1} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[data.pp, 3]} />
            <bufferAttribute attach="attributes-aSize" args={[data.ps, 1]} />
            <bufferAttribute attach="attributes-aSeed" args={[data.pseed, 1]} />
          </bufferGeometry>
          <shaderMaterial vertexShader={POINT_VS} fragmentShader={POINT_FS} {...add} />
        </points>
      </group>
      <group ref={ring}>
        <lineLoop geometry={ringGeo} renderOrder={0} frustumCulled={false}>
          <lineBasicMaterial color="#4f8cff" transparent opacity={0.4} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </lineLoop>
        <points ref={orbit} geometry={orbitGeo} renderOrder={1} frustumCulled={false}>
          <shaderMaterial vertexShader={POINT_VS} fragmentShader={POINT_FS} {...add} />
        </points>
      </group>
    </group>
  );
}
