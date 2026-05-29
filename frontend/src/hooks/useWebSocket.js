import {useEffect, useRef} from 'react';

export default function useWebSocket(url, onMessage) {
  const handlerRef = useRef(onMessage);
  const socketRef = useRef(null);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let active = true;
    let retryTimer = null;
    let attempt = 0;

    const connect = () => {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          handlerRef.current?.(JSON.parse(event.data));
        } catch (error) {
          handlerRef.current?.(event.data);
        }
      };

      socket.onclose = () => {
        if (!active) {
          return;
        }
        retryTimer = setTimeout(connect, Math.min(2000 * 2 ** attempt, 10000));
        attempt += 1;
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      active = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      socketRef.current?.close();
    };
  }, [url]);
}
