import { describe, expect, it } from 'vitest';
import { hashCommentaryKey } from '../src/audio/commentaryTtsHash';
import { findInstantClipText } from '../src/audio/commentaryInstantClips';
import { enqueueWithCap } from '../src/audio/commentaryTtsQueue';
import type { CommentaryLine } from '../src/audio/CommentaryEngine';

function line(priority: CommentaryLine['priority'], id: string): CommentaryLine {
  return {
    text: id,
    priority,
    category: 'buildup_home',
    templateId: id,
  };
}

describe('hashCommentaryKey', () => {
  it('is stable for the same text and voice', () => {
    const a = hashCommentaryKey('Goal for the home side!', 'en-GB-RyanNeural');
    const b = hashCommentaryKey('Goal for the home side!', 'en-GB-RyanNeural');
    expect(a).toBe(b);
    expect(a.startsWith('tts-')).toBe(true);
  });

  it('normalizes casing and whitespace', () => {
    const a = hashCommentaryKey('  GOAL!  ', 'en-GB-RyanNeural');
    const b = hashCommentaryKey('goal!', 'en-GB-RyanNeural');
    expect(a).toBe(b);
  });

  it('changes when voice changes', () => {
    const a = hashCommentaryKey('Shot on goal', 'en-GB-RyanNeural');
    const b = hashCommentaryKey('Shot on goal', 'en-US-GuyNeural');
    expect(a).not.toBe(b);
  });
});

describe('findInstantClipText', () => {
  it('maps goal lines to a short goal clip', () => {
    expect(findInstantClipText('GOAL! the home side find the net!')).toBe('Goal!');
  });

  it('maps shot lines to shot clip', () => {
    expect(findInstantClipText('Effort on goal from the home side!')).toBe('Shot on goal!');
  });

  it('returns null when no clip matches', () => {
    expect(findInstantClipText('Patient build-up in midfield.')).toBeNull();
  });
});

describe('enqueueWithCap', () => {
  it('keeps higher priority lines when queue is full', () => {
    const queue = [line('medium', 'm1'), line('low', 'l1')];
    const next = enqueueWithCap(queue, line('critical', 'c1'), 2);

    expect(next).toHaveLength(2);
    expect(next.map((item) => item.templateId).sort()).toEqual(['c1', 'm1']);
  });

  it('drops incoming line when it is lowest priority', () => {
    const queue = [line('high', 'h1'), line('medium', 'm1')];
    const next = enqueueWithCap(queue, line('ambient', 'a1'), 2);

    expect(next).toHaveLength(2);
    expect(next.map((item) => item.templateId).sort()).toEqual(['h1', 'm1']);
  });
});
