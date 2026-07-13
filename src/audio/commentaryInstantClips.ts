const INSTANT_CLIPS: { pattern: RegExp; clip: string }[] = [
  { pattern: /GOAL!/i, clip: 'Goal!' },
  { pattern: /\bshot\b/i, clip: 'Shot on goal!' },
  { pattern: /on goal/i, clip: 'Shot on goal!' },
  { pattern: /offside/i, clip: 'Offside!' },
  { pattern: /tackle/i, clip: 'Tackle won!' },
  { pattern: /half time/i, clip: 'Half time.' },
  { pattern: /full time/i, clip: 'Full time.' },
  { pattern: /kick off|underway/i, clip: 'And we are underway!' },
  { pattern: /so close|just wide|inches away/i, clip: 'So close!' },
];

const ALL_CLIPS = [...new Set(INSTANT_CLIPS.map((entry) => entry.clip))];

export function findInstantClipText(line: string): string | null {
  for (const entry of INSTANT_CLIPS) {
    if (entry.pattern.test(line)) return entry.clip;
  }
  return null;
}

export function allInstantClipTexts(): string[] {
  return ALL_CLIPS;
}
