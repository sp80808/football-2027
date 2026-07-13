import http from 'node:http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { MatchRoom } from './matchRoom';

const PORT = Number(process.env.COLYSEUS_PORT) || 2567;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Colyseus server running');
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

gameServer.define('match', MatchRoom);

server.listen(PORT, () => {
  console.log(`Colyseus server listening on ws://localhost:${PORT}`);
});
