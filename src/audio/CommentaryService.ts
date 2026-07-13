import type { SimEvent } from '../engine/GameEngine';
import type { MatchSnapshot } from '../engine/MatchManager';
import type { Player } from '../engine/Player';
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
  update(events: SimEvent[], snapshot: MatchSnapshot, player: Player) {
    const lines = commentaryEngine.processEvents(events, snapshot, inferPossession(player));
    const nearMiss = commentaryEngine.getPreloadedNearMiss();
    if (nearMiss) window.setTimeout(() => commentaryTTS.speak(nearMiss), 900 + Math.random() * 400);
    for (const line of lines) commentaryTTS.speak(line);
  }
}
export const commentaryService = new CommentaryService();
