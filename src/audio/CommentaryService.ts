import type { SimEvent } from '../engine/GameEngine';
import type { MatchSnapshot } from '../engine/MatchManager';
import type { Player } from '../engine/Player';
import type { CommentaryVoiceId } from './commentaryTtsConfig';
import { commentaryEngine } from './CommentaryEngine';
import { commentaryTTS } from './CommentaryTTS';

function inferPossession(player: Player): 'home' | 'away' | 'loose' {
  const state = player.controlState;
  if (state === 'under_control' || state === 'shielding' || state === 'receiving') return 'home';
  return 'loose';
}

export class CommentaryService {
  reset() { commentaryEngine.reset(); commentaryTTS.cancel(); }
  setEnabled(enabled: boolean) { commentaryTTS.setEnabled(enabled); if (!enabled) commentaryTTS.cancel(); }
  setVolume(volume: number) { commentaryTTS.setVolume(volume); }
  setVoice(voiceId: CommentaryVoiceId) { commentaryTTS.setVoice(voiceId); }
  unlock() { commentaryTTS.unlock(); }

  update(events: SimEvent[], snapshot: MatchSnapshot, player: Player) {
    for (const event of events) {
      if (event.type === 'shot') {
        commentaryTTS.prefetch("He's through!");
        commentaryTTS.prefetch('So close!');
      }
    }
    const lines = commentaryEngine.processEvents(events, snapshot, inferPossession(player));
    const nearMiss = commentaryEngine.getPreloadedNearMiss();
    if (nearMiss) {
      commentaryTTS.prefetch(nearMiss.text);
      window.setTimeout(() => commentaryTTS.speak(nearMiss), 900 + Math.random() * 400);
    }
    for (const line of lines) {
      commentaryTTS.prefetch(line.text);
      commentaryTTS.speak(line);
    }
  }
}

export const commentaryService = new CommentaryService();
