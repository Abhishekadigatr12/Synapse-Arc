export async function postMetrics(data){
  return fetch('/api/metrics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
}
