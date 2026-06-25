import { useEffect, useRef, useCallback, useState } from 'react';
import { WsEvent } from '../types';

// In dev the server is on :4000; in production the client is served from the same Express server.
const WS_URL = import.meta.env.DEV
  ? `ws://${window.location.hostname}:4000`
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

export function useWebSocket(onEvent: (event: WsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as WsEvent;
          handlerRef.current(event);
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send, isConnected };
}
