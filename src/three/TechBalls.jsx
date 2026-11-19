import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { techStack } from '../content.js';
import { store } from '../lib/scroll.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const GROUPS = {
  Python: 0, SQL: 0, JavaScript: 0, TypeScript: 0,
  'scikit-learn': 1, Pandas: 1, NumPy: 1, 'Gemini API': 1, BigQuery: 1, Tableau: 1,
  React: 2, 'Next.js': 2, 'Node.js': 2, Flask: 2, Supabase: 2,
  Git: 3, GitHub: 3, Linux: 3
};
// [light, dark] ball colours per group: languages, AI and data, web, tools. All blues.
const INK = [['#3b82f6', '#1e3a8a'], ['#0ea5e9', '#0c4a6e'], ['#2563eb', '#172554'], ['#5b7bd6', '#1f2a5c']];

function labelTexture(text, ink) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, ink[0]); bg.addColorStop(1, ink[1]);
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 104;
  g.font = `800 ${size}px "Bricolage Grotesque", "Instrument Sans", system-ui, sans-serif`;
  while (g.measureText(text).width > 290 && size > 40) { size -= 6; g.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`; }
  g.fillText(text, 256, 256);
  g.fillText(text, 768, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function useBalls() {
  return useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 40, 28);
    const items = techStack.map((name) => ({
      name,
      mat: new THREE.MeshStandardMaterial({ map: labelTexture(name, INK[GROUPS[name] ?? 0]), roughness: 0.3, metalness: 0.05 })
    }));
    return { geo, items };
  }, []);
}

function radiusFor(viewport) {
  return store.portrait ? 0.3 : clamp(viewport.width * 0.052, 0.34, 0.6);
}

/** Reduced motion or no physics: the same balls, already resting in a heap. No movement. */
export function TechBallsStatic({ pose, viewport }) {
  const { geo, items } = useBalls();
  const g = useRef();
  const r = radiusFor(viewport);
  const perRow = Math.max(3, Math.floor((viewport.width - r * 2.6) / (r * 2.05)));
  useFrame(() => { g.current.visible = pose.balls > 0.01; });
  return (
    <group ref={g}>
      {items.map((it, i) => {
        const row = Math.floor(i / perRow), col = i % perRow;
        const x = (col - (perRow - 1) / 2) * r * 2.05 + (row % 2 ? r * 1.025 : 0) - r * 0.5;
        const y = -viewport.height / 2 + r + 0.1 + row * r * 1.75;
        return <mesh key={it.name} geometry={geo} material={it.mat} position={[x, y, 0]} scale={r} rotation={[0, ((i * 3) % 5 - 2) * 0.1, 0]} />;
      })}
    </group>
  );
}

function Balls({ pose, viewport }) {
  const { geo, items } = useBalls();
  const bodies = useRef([]);
  const pointer = useRef();
  const group = useRef();
  const was = useRef(false);
  const [active, setActive] = useState(false);
  const r = radiusFor(viewport);
  const w = viewport.width, h = viewport.height;

  const spawn = useMemo(() => {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return items.map((_, i) => [(rnd() - 0.5) * (w - r * 3), h / 2 + r + 0.4 + i * (r * 1.3), 0]);
  }, [items, w, h, r]);

  useFrame(() => {
    const on = pose.balls > 0.12;
    group.current.visible = pose.balls > 0.01;
    group.current.scale.setScalar(Math.min(1, pose.balls * 2.5));
    if (on !== was.current) {
      was.current = on;
      setActive(on);
      if (on) {
        bodies.current.forEach((b, i) => {
          if (!b) return;
          b.setTranslation({ x: spawn[i][0], y: spawn[i][1], z: 0 }, true);
          b.setLinvel({ x: 0, y: 0, z: 0 }, true);
          b.setAngvel({ x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3, z: 0 }, true);
        });
      }
    }
    if (on && pointer.current) {
      const px = store.pointer.px, py = store.pointer.py;
      const x = (px / store.vw - 0.5) * w, y = (0.5 - py / store.vh) * h;
      pointer.current.setNextKinematicTranslation({ x, y, z: 0 });
    }
  });

  return (
    <group ref={group}>
      <Physics gravity={[0, -11, 0]} paused={!active} timeStep={1 / 60}>
        {items.map((it, i) => (
          <RigidBody
            key={it.name}
            ref={(el) => (bodies.current[i] = el)}
            colliders={false}
            position={spawn[i]}
            restitution={0.5}
            friction={0.35}
            linearDamping={0.15}
            angularDamping={0.25}
            enabledTranslations={[true, true, false]}
          >
            <BallCollider args={[r]} />
            <mesh geometry={geo} material={it.mat} scale={r} />
          </RigidBody>
        ))}
        {/* floor and side walls of the visible area; no ceiling, so balls can drop in from above */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[w, 0.5, 4]} position={[0, -h / 2 - 0.5 + 0.06, 0]} />
          <CuboidCollider args={[0.5, h * 4, 4]} position={[-w / 2 - 0.5, 0, 0]} />
          <CuboidCollider args={[0.5, h * 4, 4]} position={[w / 2 + 0.5, 0, 0]} />
        </RigidBody>
        {/* invisible ball that follows the pointer and shoves the others */}
        <RigidBody ref={pointer} type="kinematicPosition" colliders={false} position={[0, -99, 0]}>
          <BallCollider args={[store.portrait ? 0.35 : 0.6]} />
        </RigidBody>
      </Physics>
    </group>
  );
}

export default function TechBalls(props) {
  return store.reduced ? <TechBallsStatic {...props} /> : <Balls {...props} />;
}
