import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { store, progressOf } from '../lib/scroll.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** A stylised first-stage booster that descends as the Research section scrolls past, then lands. */
export default function Booster({ pose, viewport }) {
  const group = useRef(), flame = useRef(), flameCore = useRef(), legs = useRef([]), fins = useRef([]), light = useRef(), pad = useRef();
  const m = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: '#eef3fc', roughness: 0.35, metalness: 0.15 }),
    black: new THREE.MeshStandardMaterial({ color: '#10141f', roughness: 0.55 }),
    metal: new THREE.MeshStandardMaterial({ color: '#8a97b0', roughness: 0.4, metalness: 0.7 }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0.85, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }),
    core: new THREE.MeshBasicMaterial({ color: '#fff3dc', transparent: true, opacity: 0.95, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }),
    pad: new THREE.MeshStandardMaterial({ color: '#142033', roughness: 0.7, metalness: 0.3 }),
    ring: new THREE.MeshBasicMaterial({ color: '#3b82f6', toneMapped: false })
  }), []);

  useFrame((state) => {
    const g = group.current;
    const on = pose.booster;
    g.visible = pad.current.visible = on > 0.01;
    if (!g.visible) return;
    const c = window.scrollY + store.vh / 2;
    const p = clamp((progressOf('research', c) - 0.08) / 0.84);
    const e = 1 - Math.pow(1 - p, 2.2); // fast at first, slow near touchdown
    const topY = viewport.height * 0.5 + 2.2, padY = -viewport.height * 0.5 + 0.55;
    const bodyH = 2.6;
    const y = THREE.MathUtils.lerp(topY, padY + bodyH * 0.5 + 0.34, e);
    g.position.set(-0.3 * viewport.width, y, 0);
    g.scale.setScalar(0.8 * (0.35 + 0.65 * on) );
    const t = state.clock.elapsedTime;
    const sway = store.reduced ? 0 : Math.sin(t * 2.2) * 0.05 * (1 - p) + Math.sin(t * 5.1) * 0.012;
    g.rotation.z = sway;
    // flame: on during the burns, fades as it touches down
    const burn = clamp((p - 0.18) / 0.12) * (1 - clamp((p - 0.97) / 0.03));
    const flick = store.reduced ? 1 : 0.9 + Math.sin(t * 40) * 0.08 + Math.sin(t * 23) * 0.05;
    const len = (0.5 + (1 - p) * 0.9) * flick * burn;
    flame.current.scale.set(0.9 + 0.1 * flick, Math.max(len, 0.001), 0.9 + 0.1 * flick);
    flameCore.current.scale.set(0.7, Math.max(len * 0.6, 0.001), 0.7);
    light.current.intensity = 6 * burn * flick;
    // legs open late, grid fins always out
    const open = clamp((p - 0.62) / 0.22);
    legs.current.forEach((l, i) => { if (l) l.rotation.z = (i % 2 ? -1 : 1) * (0.05 + open * 0.75); });
  });

  const legPos = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  return (
    <group>
      <group ref={group}>
        <mesh material={m.body} position={[0, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 2.6, 28]} /></mesh>
        <mesh material={m.black} position={[0, 1.0, 0]}><cylinderGeometry args={[0.225, 0.225, 0.5, 28]} /></mesh>
        <mesh material={m.black} position={[0, -1.2, 0]}><cylinderGeometry args={[0.225, 0.2, 0.22, 28]} /></mesh>
        <mesh material={m.metal} position={[0, -1.36, 0]}><cylinderGeometry args={[0.19, 0.24, 0.12, 20]} /></mesh>
        {/* engine bells */}
        {[[0, 0], [0.11, 0], [-0.11, 0], [0, 0.11], [0, -0.11]].map(([x, z], i) => (
          <mesh key={i} material={m.metal} position={[x, -1.46, z]}><cylinderGeometry args={[0.035, 0.06, 0.12, 10]} /></mesh>
        ))}
        {/* grid fins */}
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]}>
            <mesh ref={(el) => (fins.current[i] = el)} material={m.black} position={[0.3, 1.18, 0]}><boxGeometry args={[0.22, 0.02, 0.2]} /></mesh>
          </group>
        ))}
        {/* landing legs */}
        {legPos.map(([x, z], i) => (
          <group key={i} position={[x * 0.2, -1.22, z * 0.2]} rotation={[0, Math.atan2(x, z), 0]}>
            <group ref={(el) => (legs.current[i] = el)}>
              <mesh material={m.metal} position={[0, -0.34, 0.0]}><boxGeometry args={[0.04, 0.72, 0.04]} /></mesh>
            </group>
          </group>
        ))}
        {/* exhaust */}
        <group position={[0, -1.52, 0]}>
          <mesh ref={flame} material={m.flame} position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.2, 1, 18, 1, true]} /></mesh>
          <mesh ref={flameCore} material={m.core} position={[0, -0.3, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.1, 0.6, 14, 1, true]} /></mesh>
          <pointLight ref={light} position={[0, -0.9, 0.6]} color="#ffb36b" distance={4} intensity={0} />
        </group>
      </group>
      {/* landing pad, fixed to the floor of the view */}
      <group ref={pad} position={[-0.3 * viewport.width, -viewport.height * 0.5 + 0.38, 0]} visible={false}>
        <mesh material={m.pad}><cylinderGeometry args={[0.95, 1.05, 0.14, 40]} /></mesh>
        <mesh material={m.ring} position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.7, 0.75, 48]} /></mesh>
      </group>
    </group>
  );
}
