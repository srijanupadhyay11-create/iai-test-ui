import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function initWebSocket(server: any) {
  wss = new WebSocketServer({ server });

  // Ping every 30s so Render's reverse proxy doesn't drop idle WS connections.
  const pingInterval = setInterval(() => {
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      } else {
        clients.delete(client);
      }
    }
  }, 30_000);

  wss.on('close', () => clearInterval(pingInterval));

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    clients.add(ws);
    ws.on('pong', () => {});
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });
}

export function broadcast(event: object) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
