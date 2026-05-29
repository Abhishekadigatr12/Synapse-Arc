export function connect(url, onMessage){
  const ws = new WebSocket(url);
  ws.onmessage = (e)=> onMessage(JSON.parse(e.data));
  return ws;
}
