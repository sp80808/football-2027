export type GameEventType = 'kick' | 'bounce' | 'goal' | 'whistle' | 'celebration';

export interface GameEvent {
  type: GameEventType;
  /** Positive = player scored (attacking +Y goal), negative = conceded */
  goalSide?: 1 | -1;
  intensity?: number;
}

type GameEventListener = (event: GameEvent) => void;

export class GameEventBus {
  private listeners = new Set<GameEventListener>();

  subscribe(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: GameEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
