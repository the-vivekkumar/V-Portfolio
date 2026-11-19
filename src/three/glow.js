import { useMemo } from 'react';
import * as THREE from 'three';

function radial(size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft round sprites: the blue halo behind the character and the dots of the neural network. */
let cache = null;
export function useGlowTextures() {
  return useMemo(() => cache || (cache = {
    halo: radial(256, [[0, 'rgba(70, 150, 255, 0.9)'], [0.4, 'rgba(40, 110, 240, 0.4)'], [0.75, 'rgba(25, 70, 190, 0.12)'], [1, 'rgba(20, 50, 140, 0)']]),
    dot: radial(64, [[0, 'rgba(255, 255, 255, 1)'], [0.35, 'rgba(160, 200, 255, 0.85)'], [1, 'rgba(96, 165, 250, 0)']])
  }), []);
}
