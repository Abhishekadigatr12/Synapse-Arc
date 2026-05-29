export function createWS(onMessage) {
  const url = (location.protocol === 'https:' ? 'wss' : 'ws') + '://127.0.0.1:8000/ws/live';
  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.debug('WS connected', url);
  };

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (onMessage) onMessage(data);
    } catch (e) {
      // some messages may be raw strings
      if (onMessage) onMessage({ raw: evt.data });
    }
  };

  ws.onclose = () => console.debug('WS closed');
  ws.onerror = (e) => console.debug('WS error', e);

  return ws;
}

export default createWS;
