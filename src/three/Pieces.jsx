import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { store, damp, blendAt, progressOf } from '../lib/scroll.js';
import { useGlowTextures } from './glow.js';
import { certificates, journey } from '../content.js';

// One 3D piece per section. Each piece lives in a "slot": an empty element in the page (data-slot="...").
// The piece follows that element's box every frame, so it stays in place on any screen and while scrolling.
const T = Math.PI * 2;
const ease = (t) => t * t * (3 - 2 * t);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const BLUE = '#4f8cff', SKY = '#60a5fa', CYAN = '#22d3ee', INDIGO = '#7aa7ff', ICE = '#dbeafe';

const els = {};
const slotEl = (id) => (els[id] && els[id].isConnected ? els[id] : (els[id] = document.querySelector(`[data-slot="${id}"]`)));

function Slot({ id, fit = 1, children }) {
  const g = useRef(), a = useRef(0);
  const { viewport } = useThree();
  useFrame((_, dt) => {
    const el = slotEl(id);
    const r = el ? el.getBoundingClientRect() : null;
    const on = r && r.width > 0 && r.bottom > -store.vh * 0.15 && r.top < store.vh * 1.15;
    a.current = damp(a.current, on ? 1 : 0, 6, Math.min(dt, 0.1));
    g.current.visible = a.current > 0.01 && !!r;
    if (!g.current.visible) return;
    const k = viewport.height / store.vh;
    g.current.position.set((r.left + r.width / 2 - store.vw / 2) * k, -(r.top + r.height / 2 - store.vh / 2) * k, 0);
    g.current.scale.setScalar(Math.max(1e-4, Math.min(r.width, r.height) * k * 0.5 * fit * (0.6 + 0.4 * ease(a.current))));
  });
  return <group ref={g} visible={false}>{children}</group>;
}

/** Gentle pointer parallax plus a slow idle sway. */
function useSway(ref, ax = 0.2, ay = 0.25) {
  useFrame((st, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = store.reduced ? 0 : st.clock.elapsedTime;
    g.rotation.x = damp(g.rotation.x, -store.pointer.y * ax + Math.sin(t * 0.5) * 0.03, 4, Math.min(dt, 0.1));
    g.rotation.y = damp(g.rotation.y, store.pointer.x * ay, 4, Math.min(dt, 0.1));
  });
}

const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
const lineMat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
const Halo = ({ s = 3.4, color = '#3b82f6', o = 0.55 }) => {
  const tex = useGlowTextures();
  return (
    <sprite scale={[s, s, 1]}>
      <spriteMaterial map={tex.halo} color={color} transparent opacity={o} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  );
};

/* ------------------------------------------------------------------ About: globe pinned on Mysore */
const MYSORE = { lat: (12.3 * Math.PI) / 180, lon: (76.64 * Math.PI) / 180 };
function Globe() {
  const tex = useGlowTextures();
  const spin = useRef(), tilt = useRef(), pulses = useRef([]), sats = useRef([]);
  const d = useMemo(() => {
    const seg = [];
    const ring = (fn, n = 72) => { for (let i = 0; i < n; i++) seg.push(...fn(i / n), ...fn((i + 1) / n)); };
    for (let lat = -60; lat <= 60; lat += 30) { const la = (lat * Math.PI) / 180; ring((t) => [Math.cos(la) * Math.cos(t * T), Math.sin(la), Math.cos(la) * Math.sin(t * T)]); }
    for (let lon = 0; lon < 180; lon += 20) { const lo = (lon * Math.PI) / 180; ring((t) => [Math.cos(t * T) * Math.cos(lo), Math.sin(t * T), Math.cos(t * T) * Math.sin(lo)]); }
    const lines = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    const land = [], sea = [];
    const N = 2600;
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      const n = Math.sin(x * 2.1 + 1.3) * Math.cos(y * 2.7 - 0.4) + Math.sin(z * 2.3 + x * 1.7) * 0.8 + Math.sin(y * 4.1 + z * 3.3) * 0.4;
      (n > 0.25 ? land : sea).push(x * 1.005, y * 1.005, z * 1.005);
    }
    const geo = (a) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
    const pin = new THREE.Vector3(Math.cos(MYSORE.lat) * Math.cos(MYSORE.lon), Math.sin(MYSORE.lat), Math.cos(MYSORE.lat) * Math.sin(MYSORE.lon));
    return { lines, land: geo(land), sea: geo(sea), pin, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pin) };
  }, []);
  const atmos = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: new THREE.Color('#3b82f6') } },
    vertexShader: 'varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 n; uniform vec3 c; void main(){ float i = pow(clamp(0.78 - dot(n, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0); gl_FragColor = vec4(c * i * 1.1, i * 0.7); }'
  }), []);
  const pm = useMemo(() => [glowMat(CYAN, 0), glowMat(CYAN, 0)], []);

  useFrame((st, dt) => {
    const t = store.reduced ? 0 : st.clock.elapsedTime;
    spin.current.rotation.set(MYSORE.lat, MYSORE.lon - Math.PI / 2 + Math.sin(t * 0.3) * 0.7, 0);
    pulses.current.forEach((m, i) => {
      const ph = (t * 0.45 + i * 0.5) % 1;
      m.scale.setScalar(1 + ph * 7);
      pm[i].opacity = (1 - ph) * 0.9;
    });
    sats.current.forEach((g, i) => { if (g) g.rotation.z = t * (0.35 + i * 0.12) + i * 2; });
  });
  useSway(tilt, 0.12, 0.2);

  return (
    <group ref={tilt}>
      <Halo s={4.2} o={0.5} />
      <mesh scale={1.2} material={atmos}><sphereGeometry args={[1, 48, 32]} /></mesh>
      <mesh><sphereGeometry args={[0.99, 48, 32]} /><meshStandardMaterial color="#0a1c46" emissive="#0b2a78" emissiveIntensity={0.55} roughness={0.55} metalness={0.25} /></mesh>
      <group ref={spin}>
        <lineSegments geometry={d.lines} material={lineMat(SKY, 0.28)} />
        <points geometry={d.sea}><pointsMaterial map={tex.dot} size={0.04} color="#3b6fd8" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
        <points geometry={d.land}><pointsMaterial map={tex.dot} size={0.075} color="#bcdcff" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
        {/* the pin: Mysore */}
        <group position={d.pin.toArray()} quaternion={d.q}>
          <mesh position={[0, 0, 0.012]}><sphereGeometry args={[0.04, 16, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
          <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.006, 0.006, 0.4, 8]} /><primitive object={glowMat(CYAN, 0.9)} attach="material" /></mesh>
          {pm.map((m, i) => (
            <mesh key={i} ref={(el) => (pulses.current[i] = el)} position={[0, 0, 0.004]} material={m}><ringGeometry args={[0.04, 0.052, 40]} /></mesh>
          ))}
        </group>
      </group>
      {[0, 1].map((i) => (
        <group key={i} rotation={[1.05 - i * 1.7, i * 0.6, 0.3]}>
          <group ref={(el) => (sats.current[i] = el)}>
            <mesh><torusGeometry args={[1.42 + i * 0.16, 0.004, 6, 120]} /><primitive object={glowMat(i ? INDIGO : CYAN, 0.35)} attach="material" /></mesh>
            <mesh position={[1.42 + i * 0.16, 0, 0]}><sphereGeometry args={[0.045, 12, 10]} /><meshBasicMaterial color={i ? INDIGO : CYAN} toneMapped={false} /></mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ What I do: an AI core with three orbiting skills */
const SATS = [{ c: SKY, r: 1.0, rx: 1.15, rz: 0.15, v: 0.55 }, { c: CYAN, r: 1.38, rx: 0.45, rz: 0.95, v: -0.42 }, { c: INDIGO, r: 1.75, rx: -0.75, rz: -0.35, v: 0.33 }];
function Core() {
  const tex = useGlowTextures();
  const tilt = useRef(), shell = useRef(), orbs = useRef([]), rings = useRef([]), sat = useRef([]), cur = useRef([0, 0, 0]);
  const ico = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)), []);
  const dust = useMemo(() => {
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const a = []; for (let i = 0; i < 160; i++) { const u = r() * T, v = Math.acos(2 * r() - 1), R = 0.9 + r() * 1.2; a.push(R * Math.sin(v) * Math.cos(u), R * Math.cos(v) * 0.7, R * Math.sin(v) * Math.sin(u)); }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  }, []);
  useFrame((st, dt) => {
    const t = store.reduced ? 0 : st.clock.elapsedTime;
    shell.current.rotation.set(t * 0.4, t * 0.55, 0);
    SATS.forEach((S, i) => {
      orbs.current[i].rotation.z = t * S.v + i * 2;
      const f = store.focus.doing === i ? 1 : 0;
      cur.current[i] = damp(cur.current[i], f, 8, Math.min(dt, 0.1));
      sat.current[i].scale.setScalar(1 + cur.current[i] * 1.6);
      rings.current[i].material.opacity = 0.28 + cur.current[i] * 0.6;
    });
  });
  useSway(tilt, 0.22, 0.3);
  return (
    <group ref={tilt}>
      <Halo s={4.4} o={0.45} />
      <mesh><sphereGeometry args={[0.44, 32, 24]} /><meshStandardMaterial color="#1d4ed8" emissive="#2f6bff" emissiveIntensity={1.1} roughness={0.25} metalness={0.3} /></mesh>
      <lineSegments ref={shell} geometry={ico} material={lineMat(ICE, 0.75)} />
      <points geometry={dust}><pointsMaterial map={tex.dot} size={0.05} color="#9cc4ff" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
      {SATS.map((S, i) => (
        <group key={i} rotation={[S.rx, 0, S.rz]}>
          <group ref={(el) => (orbs.current[i] = el)}>
            <mesh ref={(el) => (rings.current[i] = el)}><torusGeometry args={[S.r, 0.006, 6, 120]} /><primitive object={glowMat(S.c, 0.3)} attach="material" /></mesh>
            <group ref={(el) => (sat.current[i] = el)} position={[S.r, 0, 0]}>
              <mesh><sphereGeometry args={[0.1, 20, 16]} /><meshStandardMaterial color={S.c} emissive={S.c} emissiveIntensity={1.2} roughness={0.2} /></mesh>
              <sprite scale={[0.55, 0.55, 1]}><spriteMaterial map={tex.dot} color={S.c} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ Career: a double helix that lights up as you scroll the timeline */
function Helix() {
  const tex = useGlowTextures();
  const turn = useRef(), litA = useRef(), litB = useRef(), litR = useRef(), nodes = useRef([]);
  const N = 240, H = 3.1, R = 0.55, TURNS = 3.2;
  const d = useMemo(() => {
    const pt = (i, ph) => { const u = i / (N - 1), a = u * TURNS * T + ph; return [Math.cos(a) * R, H / 2 - u * H, Math.sin(a) * R]; };
    const A = [], B = [], rung = [];
    for (let i = 0; i < N; i++) { A.push(...pt(i, 0)); B.push(...pt(i, Math.PI)); if (i % 6 === 0) rung.push(...pt(i, 0), ...pt(i, Math.PI)); }
    const g = (a) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
    const marks = journey.map((_, i) => { const idx = Math.round((i / (journey.length - 1)) * (N - 1)); return pt(idx, 0); });
    return { A: g(A), B: g(B), rung: g(rung), marks };
  }, []);
  useFrame((st) => {
    const t = store.reduced ? 0 : st.clock.elapsedTime;
    turn.current.rotation.y = t * 0.28 - store.journeyP * 2.4;
    const p = clamp(store.journeyP);
    litA.current.geometry.setDrawRange(0, Math.floor(p * N));
    litB.current.geometry.setDrawRange(0, Math.floor(p * N));
    litR.current.geometry.setDrawRange(0, Math.floor(p * (N / 6)) * 2);
    nodes.current.forEach((g, i) => {
      const on = p >= i / (journey.length - 1) - 0.02;
      const s = on ? 1.25 + (store.reduced ? 0 : Math.sin(t * 3 + i) * 0.12) : 0.7;
      g.scale.setScalar(damp(g.scale.x, s, 8, 0.016));
      g.children[0].material.color.set(on ? '#ffffff' : '#4a6bb0');
      g.children[1].material.opacity = on ? 0.85 : 0.12;
    });
  });
  const base = useMemo(() => lineMat('#3b6fd8', 0.28), []);
  const brightA = useMemo(() => lineMat(CYAN, 1), []);
  const brightB = useMemo(() => lineMat(BLUE, 1), []);
  const brightR = useMemo(() => lineMat(SKY, 0.65), []);
  return (
    <group>
      <Halo s={4} o={0.35} />
      <group ref={turn}>
        <line geometry={d.A} material={base} /><line geometry={d.B} material={base} />
        <lineSegments geometry={d.rung} material={lineMat('#3b6fd8', 0.2)} />
        <line ref={litA} geometry={d.A.clone()} material={brightA} />
        <line ref={litB} geometry={d.B.clone()} material={brightB} />
        <lineSegments ref={litR} geometry={d.rung.clone()} material={brightR} />
        {d.marks.map((p, i) => (
          <group key={i} position={p} ref={(el) => (nodes.current[i] = el)}>
            <mesh><sphereGeometry args={[0.085, 18, 14]} /><meshBasicMaterial color="#4a6bb0" toneMapped={false} /></mesh>
            <sprite scale={[0.6, 0.6, 1]}><spriteMaterial map={tex.dot} color={CYAN} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ Work: a drifting field of crystals behind the project cards */
function Field() {
  const { viewport } = useThree();
  const refs = [useRef(), useRef(), useRef()];
  const geos = useMemo(() => [new THREE.OctahedronGeometry(1), new THREE.IcosahedronGeometry(1, 0), new THREE.BoxGeometry(1.2, 1.2, 1.2)], []);
  const items = useMemo(() => {
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const cols = [SKY, CYAN, INDIGO, BLUE, ICE].map((c) => new THREE.Color(c));
    // keep the crystals out of the band where the section heading sits (62% to 92% of the height)
    const lane = () => { const v = r() < 0.72 ? (r() < 0.62 ? 0.04 + r() * 0.2 : 0.93 + r() * 0.05) : r(); return v > 0.62 && v < 0.92 ? 0.05 + (v - 0.62) * 0.6 : v; };
    return Array.from({ length: 45 }, (_, i) => ({ type: i % 3, x: r(), y: lane(), z: -5 + r() * 5.2, s: 0.07 + r() * 0.15, rx: r() * T, ry: r() * T, sp: 0.2 + r() * 0.6, c: cols[Math.floor(r() * cols.length)] }));
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.7, roughness: 0.22, flatShading: true, emissive: '#1d4ed8', emissiveIntensity: 0.35, transparent: true, opacity: 0.88 }), []);
  useFrame((st) => {
    const c = window.scrollY + store.vh / 2;
    const w = blendAt(c).find((x) => x.id === 'work')?.w ?? 0;
    const p = progressOf('work', c);
    const t = store.reduced ? 0 : st.clock.elapsedTime;
    const W = viewport.width * 1.7, Hh = viewport.height;
    const counts = [0, 0, 0];
    items.forEach((it, i) => {
      const depth = (it.z + 5) / 6.5;                       // 0 far .. 1 near
      const x = ((((it.x * W - p * W * (0.5 + depth * 1.1)) % W) + W) % W) - W / 2;
      const y = (it.y - 0.5) * Hh * 1.05 + Math.sin(t * it.sp + i) * 0.12;
      dummy.position.set(x * (1 + (1 - depth) * 0.2), y, it.z);
      dummy.rotation.set(it.rx + t * it.sp * 0.6, it.ry + t * it.sp * 0.4, 0);
      dummy.scale.setScalar(it.s * (0.4 + 0.6 * ease(w)) * (1 + depth * 0.6));
      dummy.updateMatrix();
      const m = refs[it.type].current;
      m.setMatrixAt(counts[it.type], dummy.matrix);
      m.setColorAt(counts[it.type], it.c);
      counts[it.type]++;
    });
    refs.forEach((m, k) => { m.current.count = counts[k]; m.current.instanceMatrix.needsUpdate = true; if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true; m.current.visible = w > 0.01; });
  });
  return (
    <group>
      {geos.map((g, i) => <instancedMesh key={i} ref={refs[i]} args={[g, mat, 24]} frustumCulled={false} />)}
    </group>
  );
}

/* ------------------------------------------------------------------ Certifications: a ring of badges; the chosen group lights up */
const CERT_COLORS = { data: '#60a5fa', software: '#22d3ee', security: '#7aa7ff', skills: '#5eead4', internships: '#fcd34d' };
function badgeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 118, 10, 128, 128, 128);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#e6efff'); gr.addColorStop(1, '#b9cdf5');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, T); g.fill();
  g.strokeStyle = 'rgba(30,60,140,.55)'; g.lineWidth = 7; g.beginPath(); g.arc(128, 128, 104, 0, T); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 90, 0, T); g.stroke();
  g.fillStyle = 'rgba(30,60,140,.85)'; g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 54, a = (i / 10) * T - Math.PI / 2; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); }
  g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function Coins() {
  const ring = useRef(), mesh = useRef(), tilt = useRef();
  const list = useMemo(() => certificates.flatMap((g) => g.items.map(() => g.id)), []);
  const n = list.length;
  const geo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.2, 0.05, 36), []);
  const mats = useMemo(() => {
    const tx = badgeTexture();
    const side = new THREE.MeshStandardMaterial({ color: '#9db8ee', metalness: 0.9, roughness: 0.25 });
    const face = new THREE.MeshStandardMaterial({ map: tx, metalness: 0.35, roughness: 0.35, emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: 0.12 });
    return [side, face, face];
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []), rad = useMemo(() => new THREE.Vector3(), []);
  const cur = useRef(new Float32Array(n).fill(0.5));
  const col = useMemo(() => new THREE.Color(), []);
  const R = 1.3;
  useFrame((st, dt) => {
    const t = store.reduced ? 0 : st.clock.elapsedTime;
    ring.current.rotation.y = t * 0.2;
    const sel = store.cat;
    list.forEach((id, i) => {
      const on = sel === 'all' || sel === id;
      cur.current[i] = damp(cur.current[i], on ? 1 : 0.28, 7, Math.min(dt, 0.1));
      const k = cur.current[i];
      const a = (i / n) * T;
      dummy.position.set(Math.cos(a) * R, Math.sin(t * 0.8 + i) * 0.04 * (store.reduced ? 0 : 1), Math.sin(a) * R);
      dummy.quaternion.setFromUnitVectors(up, rad.set(Math.cos(a), 0, Math.sin(a)));
      dummy.scale.setScalar(0.65 + k * 0.6 * (sel === 'all' ? 0.8 : 1));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, col.set(CERT_COLORS[id] || SKY).multiplyScalar(0.35 + k * 0.85));
    });
    mesh.current.instanceMatrix.needsUpdate = true; mesh.current.instanceColor.needsUpdate = true;
  });
  useSway(tilt, 0.1, 0.12);
  return (
    <group ref={tilt}>
      <group rotation={[0.95, 0, 0.12]}>
        <Halo s={4.6} o={0.4} />
        <group ref={ring}>
          <instancedMesh ref={mesh} args={[geo, mats, n]} frustumCulled={false} />
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R, 0.006, 6, 160]} /><primitive object={glowMat(SKY, 0.35)} attach="material" /></mesh>
        </group>
        <mesh><sphereGeometry args={[0.32, 28, 20]} /><meshStandardMaterial color="#1d4ed8" emissive="#2f6bff" emissiveIntensity={1.2} roughness={0.25} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.55, 0.008, 6, 100]} /><primitive object={glowMat(CYAN, 0.55)} attach="material" /></mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ Achievements: a trophy with three medals */
const MEDALS = ['#60a5fa', '#22d3ee', '#fb7185'];
function Trophy() {
  const tex = useGlowTextures();
  const spin = useRef(), tilt = useRef(), medals = useRef([]), orbit = useRef(), cur = useRef([0, 0, 0]), spark = useRef();
  const cup = useMemo(() => {
    const p = [[0.001, 0], [0.62, 0], [0.64, 0.1], [0.5, 0.15], [0.22, 0.24], [0.13, 0.5], [0.17, 0.64], [0.1, 0.74], [0.1, 0.98], [0.32, 1.06], [0.52, 1.25], [0.63, 1.52], [0.66, 1.9], [0.6, 2.03], [0.55, 2.0], [0.57, 1.88], [0.54, 1.55], [0.42, 1.28], [0.12, 1.1], [0.001, 1.08]];
    return new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 56);
  }, []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd77a', metalness: 0.88, roughness: 0.28, emissive: '#8a5a12', emissiveIntensity: 0.7, envMapIntensity: 2.2, side: THREE.DoubleSide }), []);
  const sp = useMemo(() => {
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const a = []; for (let i = 0; i < 70; i++) a.push((r() - 0.5) * 3.4, (r() - 0.5) * 3.2, (r() - 0.5) * 2); return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  }, []);
  useFrame((st, dt) => {
    const t = store.reduced ? 0 : st.clock.elapsedTime;
    spin.current.rotation.y = t * 0.5;
    spin.current.position.y = Math.sin(t * 0.9) * 0.05;
    orbit.current.rotation.y = -t * 0.35;
    medals.current.forEach((g, i) => {
      cur.current[i] = damp(cur.current[i], store.focus.ach === i ? 1 : 0, 8, Math.min(dt, 0.1));
      g.scale.setScalar(1 + cur.current[i] * 0.7);
      g.rotation.y = t * 1.2 + cur.current[i] * 3;
    });
    spark.current.rotation.y = t * 0.1;
    spark.current.material.opacity = 0.5 + (store.reduced ? 0 : Math.sin(t * 2) * 0.25);
  });
  useSway(tilt, 0.1, 0.18);
  return (
    <group ref={tilt}>
      <Halo s={4.2} o={0.5} />
      <points ref={spark} geometry={sp}><pointsMaterial map={tex.dot} size={0.08} color="#cfe3ff" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
      <group position={[0, -1.0, 0]} scale={0.95}>
        <group ref={spin}>
          <mesh geometry={cup} material={gold} />
          {[1, -1].map((s) => (
            <mesh key={s} position={[s * 0.66, 1.55, 0]} rotation={[0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2]} material={gold}><torusGeometry args={[0.27, 0.045, 14, 28, Math.PI]} /></mesh>
          ))}
          <mesh position={[0, -0.09, 0]}><cylinderGeometry args={[0.78, 0.84, 0.18, 48]} /><meshStandardMaterial color="#0e1a3d" metalness={0.6} roughness={0.3} emissive="#1d4ed8" emissiveIntensity={0.4} /></mesh>
        </group>
        <group ref={orbit} position={[0, 1.0, 0]}>
          {MEDALS.map((c, i) => (
            <group key={i} position={[Math.cos((i / 3) * T) * 1.1, Math.sin((i / 3) * T * 2) * 0.3, Math.sin((i / 3) * T) * 1.1]}>
              <group ref={(el) => (medals.current[i] = el)}>
                <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.24, 0.24, 0.05, 32]} /><meshStandardMaterial color={c} metalness={0.8} roughness={0.2} emissive={c} emissiveIntensity={0.45} /></mesh>
                <mesh position={[0, 0, 0.03]}><torusGeometry args={[0.16, 0.014, 8, 32]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
                <mesh position={[0, 0, 0.035]}><octahedronGeometry args={[0.065, 0]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ Contact: an envelope sending out signals */
function Signal() {
  const tex = useGlowTextures();
  const tilt = useRef(), flap = useRef(), letter = useRef(), ripples = useRef([]), orbit = useRef([]), float = useRef();
  const rm = useMemo(() => [0, 1, 2].map(() => glowMat(SKY, 0)), []);
  const flapGeo = useMemo(() => new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.75, 0), new THREE.Vector2(0.75, 0), new THREE.Vector2(0, -0.62)])), []);
  useFrame((st) => {
    const t = store.reduced ? 0.0 : st.clock.elapsedTime;
    const cyc = (t % 7) / 7;
    const open = store.reduced ? 1 : ease(clamp((cyc - 0.08) / 0.12)) * (1 - ease(clamp((cyc - 0.6) / 0.14)));
    flap.current.rotation.x = open * 2.7;
    letter.current.position.y = -0.05 + open * 0.62;
    float.current.position.y = store.reduced ? 0 : Math.sin(t * 1.1) * 0.06;
    float.current.rotation.z = store.reduced ? 0 : Math.sin(t * 0.7) * 0.04;
    ripples.current.forEach((m, i) => {
      const ph = (t * 0.35 + i / 3) % 1;
      m.scale.setScalar(0.9 + ph * 2.1);
      rm[i].opacity = (1 - ph) * 0.6;
    });
    orbit.current.forEach((g, i) => { if (g) g.rotation.z = t * (0.5 + i * 0.2) + i * 2; });
  });
  useSway(tilt, 0.18, 0.3);
  return (
    <group ref={tilt}>
      <Halo s={4.6} o={0.5} />
      {rm.map((m, i) => <mesh key={i} ref={(el) => (ripples.current[i] = el)} position={[0, 0, -0.2]} material={m}><torusGeometry args={[1, 0.007, 6, 120]} /></mesh>)}
      <group ref={float} scale={1.15}>
        <mesh position={[0, 0, -0.03]} ref={letter}><planeGeometry args={[1.25, 0.8]} /><meshStandardMaterial color="#ffffff" emissive="#9cc4ff" emissiveIntensity={0.5} roughness={0.5} /></mesh>
        <mesh><boxGeometry args={[1.5, 0.98, 0.05]} /><meshStandardMaterial color="#6f9cf2" emissive="#2f6bff" emissiveIntensity={0.32} metalness={0.3} roughness={0.35} /></mesh>
        <mesh position={[0, 0, 0.03]} rotation={[0, 0, 0]}><shapeGeometry args={[new THREE.Shape([new THREE.Vector2(-0.75, -0.49), new THREE.Vector2(0.75, -0.49), new THREE.Vector2(0, 0.12)])]} /><meshStandardMaterial color="#8db3f7" emissive="#2f6bff" emissiveIntensity={0.18} roughness={0.5} /></mesh>
        <group ref={flap} position={[0, 0.49, 0.036]}>
          <mesh geometry={flapGeo}><meshStandardMaterial color="#a6c4fa" emissive="#4f8cff" emissiveIntensity={0.25} side={THREE.DoubleSide} roughness={0.4} /></mesh>
        </group>
      </group>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[1.0 - i * 0.8, i * 0.7, 0.2 * i]}>
          <group ref={(el) => (orbit.current[i] = el)}>
            <mesh><torusGeometry args={[1.25 + i * 0.14, 0.004, 6, 120]} /><primitive object={glowMat(i === 1 ? CYAN : SKY, 0.28)} attach="material" /></mesh>
            <mesh position={[1.25 + i * 0.14, 0, 0]}><sphereGeometry args={[0.05, 12, 10]} /><meshBasicMaterial color={i === 1 ? CYAN : '#ffffff'} toneMapped={false} /></mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

export default function Pieces() {
  return (
    <>
      <Slot id="about" fit={0.62}><Globe /></Slot>
      <Slot id="doing" fit={0.7}><Core /></Slot>
      <Slot id="journey" fit={0.7}><Helix /></Slot>
      <Field />
      <Slot id="certs" fit={0.8}><Coins /></Slot>
      <Slot id="ach" fit={0.85}><Trophy /></Slot>
      <Slot id="contact" fit={0.66}><Signal /></Slot>
    </>
  );
}
