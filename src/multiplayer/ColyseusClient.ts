import { Client, Room } from 'colyseus.js';

const DEFAULT_SERVER = import.meta.env.VITE_COLYSEUS_SERVER || 'ws://localhost:2567';

class MultiplayerManager {
  private client: Client;
  private room: Room | null = null;
  private onStateChange: (state: any) => void = () => {};
  private onError: (error: unknown) => void = () => {};

  constructor() {
    this.client = new Client(DEFAULT_SERVER);
  }

  async joinMatch(): Promise<void> {
    try {
      this.room = await this.client.joinOrCreate('match');
      this.room.onStateChange((state) => this.onStateChange(state));
      this.room.onError((error) => this.onError(error));
      this.room.onLeave((code) => console.log('Left room:', code));
    } catch (error) {
      console.error('Failed to join match:', error);
      this.onError(error);
    }
  }

  leave(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }

  sendInput(input: Record<string, unknown>): void {
    if (this.room) {
      this.room.send('input', input);
    }
  }

  onMatchState(callback: (state: any) => void): void {
    this.onStateChange = callback;
  }

  onMatchError(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  get isConnected(): boolean {
    return this.room !== null && this.room.connection !== null;
  }
}

export const multiplayer = new MultiplayerManager();
