/**
 * Procedural WAV generation for lightweight SFX without external assets.
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
  fn: (t: number, i: number) => number
): Float32Array {
  const length = Math.floor(duration * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = fn(i / sampleRate, i);
  }
  return samples;
}

export function generateKickSound(): string {
  const samples = renderSamples(0.12, 44100, (t) => {
    const env = Math.exp(-t * 40);
    const noise = (Math.random() * 2 - 1) * 0.6;
    const thump = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 25);
    return (noise + thump) * env;
  });
  return encodeWav(samples);
}

export function generateGoalSound(): string {
  const samples = renderSamples(1.8, 44100, (t) => {
    const env = Math.min(1, t * 8) * Math.exp(-t * 0.8);
    const cheer = (Math.random() * 2 - 1) * 0.35;
    const rise = Math.sin(2 * Math.PI * (200 + t * 300) * t) * 0.15;
    return (cheer + rise) * env;
  });
  return encodeWav(samples);
}

export function generateWhistleSound(): string {
  const samples = renderSamples(0.55, 44100, (t) => {
    const env = t < 0.05 ? t / 0.05 : t > 0.45 ? (0.55 - t) / 0.1 : 1;
    const tone = Math.sin(2 * Math.PI * 2800 * t) * 0.5 + Math.sin(2 * Math.PI * 3200 * t) * 0.3;
    return tone * env;
  });
  return encodeWav(samples);
}

export function generateBounceSound(): string {
  const samples = renderSamples(0.06, 44100, (t) => {
    const env = Math.exp(-t * 60);
    return Math.sin(2 * Math.PI * 180 * t) * env * 0.5;
  });
  return encodeWav(samples);
}

export function generateCrowdAmbience(): string {
  const samples = renderSamples(4.0, 44100, (t) => {
  const loop = t % 4;
    const env = loop < 0.5 ? loop / 0.5 : loop > 3.5 ? (4 - loop) / 0.5 : 1;
    return (Math.random() * 2 - 1) * 0.08 * env;
  });
  return encodeWav(samples);
}
