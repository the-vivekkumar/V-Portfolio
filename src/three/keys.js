// Where the character, booster and tech balls should be for each page section.
// Units are world units at z = 0 of the camera (see Scene3D). w, h = visible world size.
//  s    character scale (1 = the picture is PH = 4 units tall)   x, y  position of the middle of the picture's bottom edge
//  ry   unused turn         vis   0 hides the character
//  glow fades the neural network behind the character   booster / balls  presence 0..1
// The character appears on the first screen only; every other section has its own 3D piece (see Pieces.jsx).
import { PH, PW } from './Avatar.jsx';

export function getKeys(w, h, portrait) {
  const away = (y, s) => ({ x: 0, y, s, ry: 0, vis: 0, glow: 0, booster: 0, balls: 0 });
  // tall: picture height in world units, x: centre, bottom: world y of the bottom edge
  const bust = (tall, x, bottom) => ({ x, y: bottom, s: tall / PH, ry: 0, vis: 1, glow: 1, booster: 0, balls: 0 });
  const gone = away(h * 1.5, 1);

  if (portrait) {
    // a band above the text: the picture is as wide as most of the screen, but never taller than 40% of it
    const tall = Math.min(h * 0.4, (w * 0.84 * PH) / PW);
    return {
      top: bust(tall, 0, h / 2 - h * 0.075 - tall),
      about: gone, doing: gone, journey: gone, work: gone,
      research: { ...gone, booster: 1 },
      tech: { ...gone, balls: 1 },
      certifications: gone, achievements: gone, contact: gone
    };
  }
  // wide: the left half, standing on the bottom edge of the screen (his shoulders run off the screen)
  const tall = Math.min(h * 0.93, (w * 0.47 * PH) / PW);
  return {
    top: bust(tall, -0.23 * w, -h / 2 - 0.02 * h),
    about: gone, doing: gone, journey: gone, work: gone,
    research: { ...gone, booster: 1 },
    tech: { ...gone, balls: 1 },
    certifications: gone, achievements: gone, contact: gone
  };
}
