// Bounded CDP requests with observable terminal states; no page retry or timeout inflation.
export function transport(socket, {timeoutMs=20000, record=()=>{}}={}) {
  let sequence=0;
  const pending=new Map();
  const finish=(id,error,result)=>{
    const item=pending.get(id);
    if(!item){record({event:'late-response',id});return;}
    pending.delete(id);clearTimeout(item.timer);
    record({event:error?'request-failed':'request-complete',id,method:item.method,elapsedMs:Date.now()-item.start,error:error?.message});
    if(error)item.reject(error);else item.resolve(result);
  };
  socket.addEventListener('message',event=>{
    const data=JSON.parse(event.data);
    if(data.id)finish(data.id,data.error?Error(data.error.message):null,data.result);
  });
  const dispose=(reason='CDP connection closed')=>{for(const id of [...pending.keys()])finish(id,Error(reason));};
  socket.addEventListener('close',()=>{record({event:'socket-close'});dispose();});
  socket.addEventListener('error',()=>{record({event:'socket-error'});dispose('CDP connection error');});
  return {
    send(method,params={}) {return new Promise((resolve,reject)=>{
      const id=++sequence,start=Date.now();
      const timer=setTimeout(()=>finish(id,Error('CDP timeout: '+method)),timeoutMs);
      pending.set(id,{method,start,timer,resolve,reject});
      record({event:'request-start',id,method,expressionBytes:params.expression?.length});
      try{socket.send(JSON.stringify({id,method,params}));}catch(error){finish(id,error);}
    });},
    pendingCount:()=>pending.size,
    dispose,
  };
}
