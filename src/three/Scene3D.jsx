import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import Avatar from './Avatar.jsx';
import NeuralSphere from './NeuralSphere.jsx';
import Booster from './Booster.jsx';
import { getKeys } from './keys.js';
import { store, blendAt, damp } from '../lib/scroll.js';

const TechBalls = lazy(() => import('./TechBalls.jsx'));
const Pieces = lazy(() => import('./Pieces.jsx'));

const FIELDS = ['x', 'y', 's', 'ry', 'vis', 'glow', 'booster', 'balls'];
// Shared, mutable pose. Updated every frame from the scroll position, read by the 3D parts.
export const pose = { x: 0, y: -9, s: 1, ry: 0, vis: 0, glow: 0, booster: 0, balls: 0 };

if (import.meta.env.DEV && typeof window !== 'undefined') window.__pose = pose;

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn('3D part disabled:', err?.message || err); this.props.onFail?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Stage() {
  const { viewport } = useThree();
  const anchor = useRef();
  const cache = useRef({ key: '', keys: null });

  const keysFor = () => {
    const id = `${viewport.width.toFixed(2)}|${viewport.height.toFixed(2)}|${store.portrait}`;
    if (cache.current.key !== id) cache.current = { key: id, keys: getKeys(viewport.width, viewport.height, store.portrait) };
    return cache.current.keys;
  };

  const shown = useRef(false);
  // The physics engine is a big download: fetch it only once the reader is getting close to the tech stack.
  const [wantBalls, setWantBalls] = useState(false);
  useFrame((state, dt) => {
    if (!store.ready) return;
    if (!shown.current) { shown.current = true; document.documentElement.classList.add('scene-ready'); }
    const keys = keysFor();
    const centre = window.scrollY + store.vh / 2;
    if (!wantBalls) {
      const tech = store.sections.find((x) => x.id === 'tech');
      if (tech && centre > tech.top - store.vh * 3.5) setWantBalls(true);
    }
    const bl = blendAt(centre);
    const tgt = {};
    FIELDS.forEach((f) => (tgt[f] = 0));
    let sum = 0;
    bl.forEach(({ id, w }) => {
      const k = keys[id] || keys.top;
      FIELDS.forEach((f) => (tgt[f] += k[f] * w));
      sum += w;
    });
    FIELDS.forEach((f) => (tgt[f] /= sum || 1));
    const lam = store.reduced ? 14 : 7;
    FIELDS.forEach((f) => (pose[f] = damp(pose[f], tgt[f], lam, Math.min(dt, 0.1))));

    anchor.current.position.set(pose.x, pose.y, 0);
    anchor.current.scale.setScalar(Math.max(pose.s, 0.001));
    anchor.current.visible = pose.vis > 0.01;

  });

  return (
    <>
      <group ref={anchor}>
        <NeuralSphere pose={pose} />
        <Suspense fallback={null}>
          <Avatar pose={pose} />
        </Suspense>
      </group>
      <Boundary>
        <Suspense fallback={null}>
          <Pieces />
        </Suspense>
      </Boundary>
      <Booster pose={pose} viewport={viewport} />
      {wantBalls && (
        <Boundary>
          <Suspense fallback={null}>
            <TechBalls pose={pose} viewport={viewport} />
          </Suspense>
        </Boundary>
      )}
    </>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#a9c8ff" />
      <directionalLight position={[2.5, 4, 6]} intensity={2.3} color="#f4f8ff" />
      <directionalLight position={[-5, 1.5, 3]} intensity={1.1} color="#4f8cff" />
      <pointLight position={[-2.5, 3, -3]} intensity={30} color="#2f6bff" distance={14} />
      <pointLight position={[3, 0, -2]} intensity={18} color="#22b8ff" distance={12} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2} color="#dbe8ff" position={[0, 4, 4]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#2f6bff" position={[-5, 1, -2]} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#22d3ee" position={[5, 0, -2]} scale={[2, 6, 1]} />
      </Environment>
    </>
  );
}

export default function Scene3D({ onFail }) {
  const [dpr, setDpr] = useState([1, store.portrait ? 1.5 : 1.75]);
  return (
    <div className="stage" aria-hidden="true">
      <Boundary onFail={onFail}>
        <Canvas
          dpr={dpr}
          camera={{ fov: 30, position: [0, 0, 9], near: 0.5, far: 40 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
            gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onFail?.(); });
          }}
        >
          <PerformanceMonitor onDecline={() => setDpr([1, 1])} flipflops={2}>
            <Lights />
            <Stage />
          </PerformanceMonitor>
        </Canvas>
      </Boundary>
    </div>
  );
}
