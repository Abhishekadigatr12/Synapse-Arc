import React, {useEffect, useState} from 'react';
import {WS_URL} from '../utils/constants';

export default function Dashboard(){
  const [events, setEvents] = useState([]);
  useEffect(()=>{
    const ws = new WebSocket(WS_URL);
    ws.onmessage = e=>{
      try{ const data = JSON.parse(e.data); setEvents(prev=>[data].concat(prev).slice(0,50)); }catch(err){}
    }
    return ()=> ws.close();
  },[])
  return <div style={{padding:20}}>
    <h1>Dashboard</h1>
    <div>
      {events.map((ev,idx)=> <pre key={idx} style={{borderBottom:'1px solid #eee'}}>{JSON.stringify(ev)}</pre>)}
    </div>
  </div>;
}
