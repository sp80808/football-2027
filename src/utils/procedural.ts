/**
 * Procedural generation utilities — seeded simplex noise wrappers.
 *
 * Provides deterministic noise functions for:
 *   - Pitch surface variation (non-league boggy → Premier League carpet)
 *   - Kit pattern generation (stripes, hoops, halves, chevrons)
 *   - Town/region name generation weights
 *   - Crowd density variation across stands
 *
 * All functions accept a SeededRandom or explicit seed to guarantee
 * deterministic output matching the 120 Hz simulation invariant.
 */

import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';
import { SeededRandom } from '../engine/SeededRandom';

// ============================================
// Core Noise Generators (Seeded)
// ============================================

/**
 * Create a seeded 2D simplex noise function.
 * Returns values in [-1, 1].
 */
export function createSeededNoise2D(seed: number): (x: number, y: number) => number {
  const rng = new SeededRandom(seed);
  return createNoise2D(() => rng.next());
}

/**
 * Create a seeded 3D simplex noise function.
 * Returns values in [-1, 1].
 */
export function createSeededNoise3D(seed: number): (x: number, y: number, z: number) => number {
  const rng = new SeededRandom(seed);
  return createNoise3D(() => rng.next());
}

/**
 * Create a seeded 4D simplex noise function.
 * Useful for time-varying effects (animated grass, dynamic weather).
 */
export function createSeededNoise4D(
  seed: number,
): (x: number, y: number, z: number, w: number) => number {
  const rng = new SeededRandom(seed);
  return createNoise4D(() => rng.next());
}

// ============================================
// Fractal Brownian Motion (fBm)
// ============================================

/**
 * Fractal Brownian Motion — layered noise for natural-looking variation.
 *
 * @param noise2D A seeded 2D noise function.
 * @param x World-space x coordinate.
 * @param y World-space y coordinate.
 * @param octaves Number of noise layers (default: 4).
 * @param lacunarity Frequency multiplier per octave (default: 2.0).
 * @param gain Amplitude multiplier per octave (default: 0.5).
 * @returns Value in approximately [-1, 1].
 */
export function fbm2D(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxAmplitude;
}

// ============================================
// Pitch Surface Generation
// ============================================

export type PitchQuality = 'non_league' | 'lower_league' | 'championship' | 'premier_league';

export interface PitchSurface {
  /** Grass height variation at (x, y). Higher = longer grass. [0, 1] */
  grassHeight: (x: number, y: number) => number;
  /** Mud/wear factor at (x, y). Higher = more worn. [0, 1] */
  wearFactor: (x: number, y: number) => number;
  /** Unevenness at (x, y). Higher = bumpier surface. [0, 1] */
  bumpiness: (x: number, y: number) => number;
}

/** Quality presets affect noise frequency and amplitude. */
const PITCH_PRESETS: Record<PitchQuality, { wearScale: number; bumpScale: number; grassVar: number }> = {
  non_league:     { wearScale: 0.8, bumpScale: 0.6, grassVar: 0.4 },
  lower_league:   { wearScale: 0.5, bumpScale: 0.3, grassVar: 0.25 },
  championship:   { wearScale: 0.3, bumpScale: 0.15, grassVar: 0.15 },
  premier_league: { wearScale: 0.1, bumpScale: 0.05, grassVar: 0.08 },
};

/**
 * Generate pitch surface variation functions for a given quality tier.
 */
export function createPitchSurface(seed: number, quality: PitchQuality): PitchSurface {
  const preset = PITCH_PRESETS[quality];
  const noiseA = createSeededNoise2D(seed);
  const noiseB = createSeededNoise2D(seed + 1);
  const noiseC = createSeededNoise2D(seed + 2);

  return {
    grassHeight: (x, y) => {
      const base = 0.5 + fbm2D(noiseA, x * 0.05, y * 0.05, 3) * preset.grassVar;
      return Math.max(0, Math.min(1, base));
    },
    wearFactor: (x, y) => {
      // Higher wear in center circle, penalty areas, touchlines
      const centerDist = Math.sqrt(x * x + y * y) / 52.5; // normalized
      const centerWear = Math.max(0, 1 - centerDist * 2); // peak at center
      const noise = fbm2D(noiseB, x * 0.08, y * 0.08, 3) * 0.5 + 0.5;
      return Math.max(0, Math.min(1, (centerWear * 0.6 + noise * 0.4) * preset.wearScale));
    },
    bumpiness: (x, y) => {
      const noise = fbm2D(noiseC, x * 0.15, y * 0.15, 4) * 0.5 + 0.5;
      return Math.max(0, Math.min(1, noise * preset.bumpScale));
    },
  };
}

// ============================================
// Kit Pattern Generation
// ============================================

export type KitPattern = 'solid' | 'stripes' | 'hoops' | 'halves' | 'sash' | 'chevron' | 'pinstripes';

export interface KitDesign {
  pattern: KitPattern;
  primaryColor: string;
  secondaryColor: string;
  /** Pattern frequency (for stripes/hoops). */
  frequency: number;
  /** Pattern angle in radians (for sash/chevron). */
  angle: number;
}

const KIT_PATTERNS: KitPattern[] = ['solid', 'stripes', 'hoops', 'halves', 'sash', 'chevron', 'pinstripes'];

/**
 * Generate a deterministic kit design from a seed.
 * Colors are HSL to ensure vibrant, non-muddy results.
 */
export function generateKitDesign(seed: number): KitDesign {
  const rng = new SeededRandom(seed);

  const pattern = KIT_PATTERNS[Math.floor(rng.next() * KIT_PATTERNS.length)];
  const hue1 = Math.floor(rng.next() * 360);
  // Secondary hue: complementary or analogous
  const hueOffset = rng.next() > 0.5 ? 180 : 30 + Math.floor(rng.next() * 60);
  const hue2 = (hue1 + hueOffset) % 360;

  const sat1 = 60 + Math.floor(rng.next() * 30);  // 60-90%
  const sat2 = 50 + Math.floor(rng.next() * 40);   // 50-90%
  const light1 = 35 + Math.floor(rng.next() * 25);  // 35-60%
  const light2 = 30 + Math.floor(rng.next() * 30);  // 30-60%

  return {
    pattern,
    primaryColor: `hsl(${hue1}, ${sat1}%, ${light1}%)`,
    secondaryColor: `hsl(${hue2}, ${sat2}%, ${light2}%)`,
    frequency: pattern === 'pinstripes' ? 8 + Math.floor(rng.next() * 12) : 2 + Math.floor(rng.next() * 4),
    angle: pattern === 'sash' ? (Math.PI / 6 + rng.next() * Math.PI / 6) : 0,
  };
}

// ============================================
// Crowd Density
// ============================================

/**
 * Generate crowd density noise for a stadium.
 * Returns a function mapping stand position (angle around pitch, height in stand)
 * to density [0, 1].
 *
 * @param seed Stadium seed.
 * @param fillRate Overall attendance as a fraction [0, 1].
 */
export function createCrowdDensity(
  seed: number,
  fillRate: number,
): (angle: number, height: number) => number {
  const noise = createSeededNoise2D(seed);

  return (angle: number, height: number) => {
    // Base density from fill rate
    const base = fillRate;
    // Noise variation
    const variation = noise(angle * 2, height * 3) * 0.15;
    // Lower rows fill first
    const heightBias = 1 - height * 0.3;
    // Behind-goal ends are louder (angle near 0 or π)
    const endBias = 1 + Math.cos(angle * 2) * 0.1;

    return Math.max(0, Math.min(1, base * heightBias * endBias + variation));
  };
}
