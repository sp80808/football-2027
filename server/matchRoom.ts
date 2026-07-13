import { Room, Client } from 'colyseus';
import { Schema, type, MapSchema } from '@colyseus/schema';

export class MatchState extends Schema {
  @type('number') homeScore = 0;
  @type('number') awayScore = 0;
  @type('number') matchTime = 0;
  @type('string') phase = 'playing';
}

export class MatchRoom extends Room<MatchState> {
  onCreate(options: any) {
    this.setState(new MatchState());
    console.log('Match room created');
  }

  onJoin(client: Client) {
    console.log(`Client joined: ${client.sessionId}`);
  }

  onLeave(client: Client) {
    console.log(`Client left: ${client.sessionId}`);
  }

  onDispose() {
    console.log('Match room disposed');
  }
}
