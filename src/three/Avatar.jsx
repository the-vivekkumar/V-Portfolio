import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import avatarUrl from '../assets/avatar/vivek.webp';
import { store, damp } from '../lib/scroll.js';

// Vivek's 3D character picture, shown as it is (transparent background, no glow behind it).
// It sits on the first screen only. The picture turns a little toward the pointer, breathes, floats and bounces on a click.
// The group origin is the middle of the picture's bottom edge; at scale 1 the picture is PH world units tall.
const IW = 1152, IH = 1365;
export const PH = 4;
export const PW = (PH * IW) / IH;
const PIVOT = { x: 0.52, y: 0.6 };      // under the chin, as fractions of the picture (from its top left)
const HEAD_Y = 0.65;                    // where his head is, as a fraction of the picture height measured up from the bottom
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function Avatar({ pose }) {
  const { viewport } = useThree();
  const tex = useTexture(avatarUrl, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  const sway = useRef(), bob = useRef();
  const sim = useRef({ t: 0, ry: 0, rx: 0, rz: 0, near: 0, react: 0 });

  useEffect(() => {
    const hit = () => { sim.current.react = 1; };
    window.addEventListener('pointerdown', hit, { passive: true });
    return () => window.removeEventListener('pointerdown', hit);
  }, []);

  useFrame((state, dt) => {
    const s = sim.current;
    dt = Math.min(dt, 0.1);
    s.t += dt;
    const still = store.reduced;

    // pointer relative to his head, both in -1..1 screen units
    const ax = pose.x / (viewport.width / 2);
    const ay = (pose.y + PH * HEAD_Y * pose.s) / (viewport.height / 2);
    const dx = store.pointer.x - ax;
    const dy = store.pointer.y - ay;

    const close = !still && Math.hypot(dx, dy * 0.7) < 0.35 ? 1 : 0;
    s.near = damp(s.near, close, 6, dt);
    s.react = still ? 0 : Math.max(0, s.react - dt * 1.4);
    const pop = Math.sin((1 - s.react) * Math.PI * 3) * s.react;

    s.ry = damp(s.ry, still ? 0 : clamp(dx * 0.22, -0.2, 0.2), 5, dt);
    s.rx = damp(s.rx, still ? 0 : clamp(-dy * 0.1, -0.07, 0.09), 5, dt);
    s.rz = damp(s.rz, still ? 0 : clamp(-dx * 0.03, -0.035, 0.035), 4, dt);

    const breath = still ? 0 : Math.sin(s.t * 1.5);
    sway.current.rotation.set(s.rx + pop * 0.02, s.ry, s.rz + (still ? 0 : Math.sin(s.t * 0.6) * 0.004));
    const sc = 1 + breath * 0.004 + s.near * 0.012 + pop * 0.012;
    sway.current.scale.set(sc, sc, 1);
    bob.current.position.y = still ? 0 : Math.sin(s.t * 0.9) * 0.025 + Math.max(0, pop) * 0.05;
  });

  const px = (PIVOT.x - 0.5) * PW;
  const py = PH * (1 - PIVOT.y);
  return (
    <group ref={bob}>
      <group ref={sway} position={[px, py, 0]}>
        <mesh position={[-px, PH / 2 - py, 0]} renderOrder={2}>
          <planeGeometry args={[PW, PH]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
