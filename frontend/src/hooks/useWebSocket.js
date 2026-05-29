import {useEffect, useRef} from 'react';
export default function useWebSocket(url, onMessage){
  const ref = useRef(null);
  useEffect(()=>{ ref.current = new WebSocket(url); ref.current.onmessage = e=> onMessage(JSON.parse(e.data)); return ()=> ref.current && ref.current.close(); },[url]);
}
