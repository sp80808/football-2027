/**
 * Procedural WAV generation for lightweight SFX without external assets.
 *
 * All sounds use filtered / shaped noise and tonal layers rather than raw white
 * noise, which sounded harsh and "static-like". Brown noise (low-passed) gives a
 * warm thump; pink-ish noise gives a natural crowd roar; tonal layers add body.
 */

function encodeWav(samples: Float32Array, sampleRate = 44100): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function renderSamples(
  duration: number,
  sampleRate: number,
  fn: (t: number, i: number) => number,
): Float32Array {
  const length = Math.floor(duration * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = fn(i / sampleRate, i);
  }
  return samples;
}

/**
 * Brown-noise generator (integrated white noise) — sounds like a deep rumble,
 * far warmer than raw white noise. Stateful across a render so it's continuous.
 */
function brownNoiseBuffer(length: number, sampleRate: number): Float32Array {
  const out = new Float32Array(length);
  let last = 0;
  // Leakage factor keeps the walk bounded. 0.02 scales amplitude into [-1,1]-ish.
  const leak = 0.997;
  const scale = 0.02;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + scale * white) * leak;
    out[i] = last;
  }
  return out;
}

/**
 * Pink-ish noise via the Voss-McCartney algorithm (sum of octaves). Rougher than
 * brown noise but without the harsh hiss of white noise — good for crowd wash.
 */
function pinkNoiseBuffer(length: number): Float32Array {
  const out = new Float32Array(length);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return out;
}

export function generateKickSound(): string {
  const sampleRate = 44100;
  // A punchy kick: brown-noise body + sub-bass sine thump + click transient.
  const samples = renderSamples(0.16, sampleRate, (t) => {
    const env = Math.exp(-t * 28);
    // Sub-bass thump: descending pitch from ~110Hz to ~55Hz.
    const pitch = 55 + 55 * Math.exp(-t * 30);
    const thump = Math.sin(2 * Math.PI * pitch * t) * 0.8;
    // Short click transient at the very start for definition.
    const click = t < 0.004 ? (Math.random() * 2 - 1) * 0.3 : 0;
    return (thump + click) * env;
  });

  // Layer brown noise underneath for "leather on boot" weight.
  const brown = brownNoiseBuffer(samples.length, sampleRate);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const noiseEnv = Math.exp(-t * 35);
    samples[i] += brown[i] * 0.35 * noiseEnv;
  }
  return encodeWav(samples);
}

export function generateGoalSound(): string {
  const sampleRate = 44100;
  const length = Math.floor(2.0 * sampleRate);
  const samples = new Float32Array(length);

  // Crowd roar built from pink noise (natural crowd wash) with a slow swell.
  const pink = pinkNoiseBuffer(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Swell up over ~0.3s, sustain, then long decay.
    const attack = Math.min(1, t / 0.3);
    const decay = Math.exp(-t * 0.55);
    const env = attack * decay;
    samples[i] = pink[i] * 0.5 * env;
  }

  // Layer a rising tonal "charge" — crowd anticipation, major-ish cluster.
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 6) * Math.exp(-t * 0.7);
    const rise = 180 + t * 220;
    const tone =
      Math.sin(2 * Math.PI * rise * t) * 0.05 +
      Math.sin(2 * Math.PI * rise * 1.5 * t) * 0.03;
    samples[i] += tone * env;
  }

  return encodeWav(samples);
}

export function generateWhistleSound(): string {
  const sampleRate = 44100;
  const samples = renderSamples(0.6, sampleRate, (t) => {
    const env = t < 0.05 ? t / 0.05 : t > 0.5 ? (0.6 - t) / 0.1 : 1;
    // Two close partials for a pea-whistle warble, + subtle AM vibrato.
    const vibrato = 1 + Math.sin(2 * Math.PI * 14 * t) * 0.02;
    const tone =
      Math.sin(2 * Math.PI * 2600 * t * vibrato) * 0.45 +
      Math.sin(2 * Math.PI * 2950 * t * vibrato) * 0.3;
    // A touch of breath noise (pink-ish) so it's not a pure sine.
    const breath = (Math.random() * 2 - 1) * 0.04 * env;
    return (tone + breath) * env;
  });
  return encodeWav(samples);
}

export function generateBounceSound(): string {
  const sampleRate = 44100;
  const samples = renderSamples(0.07, sampleRate, (t) => {
    const env = Math.exp(-t * 70);
    // Hollow-sounding bounce: ~180Hz with a fast pitch drop.
    const pitch = 180 + 120 * Math.exp(-t * 80);
    const body = Math.sin(2 * Math.PI * pitch * t);
    // Small filtered-noise tick for the "thud" contact.
    const tick = t < 0.005 ? (Math.random() * 2 - 1) * 0.15 : 0;
    return (body * 0.5 + tick) * env;
  });
  return encodeWav(samples);
}

export function generateCrowdAmbience(): string {
  const sampleRate = 44100;
  const length = Math.floor(4.0 * sampleRate);
  // Pink-noise crowd bed (natural roar) with a gentle modulation for life.
  const pink = pinkNoiseBuffer(length);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Slow LFO breathing so the ambience isn't flat/static.
    const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.4 * t);
    samples[i] = pink[i] * 0.1 * lfo;
  }
  return encodeWav(samples);
}

/** Crowd tension bed — low rumble that swells near the penalty area. */
export function generateCrowdTension(): string {
  const sampleRate = 44100;
  const length = Math.floor(4.0 * sampleRate);
  const brown = brownNoiseBuffer(length, sampleRate);
  const pink = pinkNoiseBuffer(length);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const lfo = 0.9 + 0.1 * Math.sin(2 * Math.PI * 0.3 * t);
    samples[i] = (brown[i] * 0.3 + pink[i] * 0.04) * lfo;
  }
  return encodeWav(samples);
}

/** Short crowd cheer — one-shot reaction for goals and shots on target. */
export function generateCrowdCheer(): string {
  const sampleRate = 44100;
  const length = Math.floor(1.8 * sampleRate);
  const pink = pinkNoiseBuffer(length);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.12);
    const decay = Math.exp(-t * 1.2);
    samples[i] = pink[i] * 0.45 * attack * decay;
  }
  // Rising tonal layer for excitement
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 5) * Math.exp(-t * 0.9);
    const rise = 200 + t * 300;
    samples[i] += Math.sin(2 * Math.PI * rise * t) * 0.04 * env;
  }
  return encodeWav(samples);
}

/** Short crowd gasp — one-shot reaction for shots off target / near misses. */
export function generateCrowdGasp(): string {
  const sampleRate = 44100;
  const length = Math.floor(0.8 * sampleRate);
  const pink = pinkNoiseBuffer(length);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.05);
    const decay = Math.exp(-t * 3);
    samples[i] = pink[i] * 0.22 * attack * decay;
  }
  return encodeWav(samples);
}

/** Short crowd groan/boo — one-shot reaction for fouls / offside. */
export function generateCrowdGroan(): string {
  const sampleRate = 44100;
  const length = Math.floor(1.2 * sampleRate);
  const brown = brownNoiseBuffer(length, sampleRate);
  const pink = pinkNoiseBuffer(length);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.08);
    const decay = Math.exp(-t * 1.5);
    samples[i] = (brown[i] * 0.2 + pink[i] * 0.08) * attack * decay;
  }
  // Descending tonal dissonance
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 8) * Math.exp(-t * 1.8);
    const fall = 300 - t * 150;
    samples[i] += Math.sin(2 * Math.PI * fall * t) * 0.03 * env;
  }
  return encodeWav(samples);
}

/** Grass footstep — soft scuff for running sounds. */
export function generateFootstepSound(): string {
  const sampleRate = 44100;
  const samples = renderSamples(0.06, sampleRate, (t) => {
    const env = Math.exp(-t * 90);
    // Filtered noise burst — short and soft, like a boot on grass.
    const noise = (Math.random() * 2 - 1) * 0.5;
    // Low body from a quick sine
    const body = Math.sin(2 * Math.PI * 80 * t) * 0.2;
    return (noise * 0.4 + body) * env;
  });
  return encodeWav(samples);
}

/** Slide tackle — grass scrape + impact thud. */
export function generateSlideSound(): string {
  const sampleRate = 44100;
  const length = Math.floor(0.4 * sampleRate);
  const samples = new Float32Array(length);
  // Scrape: filtered noise with a slow decay
  const pink = pinkNoiseBuffer(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 6);
    samples[i] = pink[i] * 0.3 * env;
  }
  // Thud: low-frequency impact at the start
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 25);
    samples[i] += Math.sin(2 * Math.PI * 60 * t) * 0.5 * env;
  }
  return encodeWav(samples);
}

/** Keeper save — glove impact. */
export function generateSaveSound(): string {
  const sampleRate = 44100;
  const samples = renderSamples(0.15, sampleRate, (t) => {
    const env = Math.exp(-t * 22);
    // Leather impact: mid-frequency punch
    const punch = Math.sin(2 * Math.PI * 140 * t) * 0.6;
    // Noise tick for the "smack"
    const smack = t < 0.008 ? (Math.random() * 2 - 1) * 0.4 : 0;
    return (punch + smack) * env;
  });
  // Layer brown noise for body
  const brown = brownNoiseBuffer(samples.length, sampleRate);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    samples[i] += brown[i] * 0.2 * Math.exp(-t * 30);
  }
  return encodeWav(samples);
}

/** Post / crossbar hit — metallic ping. */
export function generatePostHitSound(): string {
  const sampleRate = 44100;
  const samples = renderSamples(0.5, sampleRate, (t) => {
    const env = Math.exp(-t * 8);
    // Metallic ring: two high partials with slightly detuned frequencies
    const ping1 = Math.sin(2 * Math.PI * 1800 * t) * 0.5;
    const ping2 = Math.sin(2 * Math.PI * 2400 * t) * 0.3;
    const ping3 = Math.sin(2 * Math.PI * 3100 * t) * 0.15;
    // Initial impact tick
    const tick = t < 0.003 ? (Math.random() * 2 - 1) * 0.3 : 0;
    return (ping1 + ping2 + ping3 + tick) * env;
  });
  return encodeWav(samples);
}

/** Pitch call — short vocal-style "hey" shout. Uses formant synthesis. */
export function generatePitchCallSound(): string {
  const sampleRate = 44100;
  const samples = renderSamples(0.3, sampleRate, (t) => {
    const env = t < 0.03 ? t / 0.03 : t > 0.25 ? (0.3 - t) / 0.05 : 1;
    // Glottal pulse train at ~140Hz for a human-like voice source
    const f0 = 140;
    const pulse = Math.sign(Math.sin(2 * Math.PI * f0 * t)) * 0.3;
    // Two formant resonances to shape it into "hey"
    const formant1 = Math.sin(2 * Math.PI * 500 * t) * 0.4;
    const formant2 = Math.sin(2 * Math.PI * 1500 * t) * 0.25;
    return (pulse * 0.3 + formant1 * 0.2 + formant2 * 0.1) * env * 0.5;
  });
  return encodeWav(samples);
}

/** Soft kick variant — for gentle passes and taps. */
export function generateSoftKickSound(): string {
  const sampleRate = 44100;
  const samples = renderSamples(0.1, sampleRate, (t) => {
    const env = Math.exp(-t * 35);
    const pitch = 80 + 40 * Math.exp(-t * 40);
    const thump = Math.sin(2 * Math.PI * pitch * t) * 0.4;
    const click = t < 0.003 ? (Math.random() * 2 - 1) * 0.15 : 0;
    return (thump + click) * env;
  });
  const brown = brownNoiseBuffer(samples.length, sampleRate);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    samples[i] += brown[i] * 0.2 * Math.exp(-t * 45);
  }
  return encodeWav(samples);
}
