// Bounded cleanup also covers setup failures before a CDP session is returned.
export async function stopBrowserProcess(child,graceMs=1000){
 if(child.exitCode!==null||child.signalCode)return;
 const exited=new Promise(resolve=>child.once('exit',resolve));
 const wait=async()=>{let timer;try{return await Promise.race([exited.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),graceMs);})]);}finally{clearTimeout(timer);}};
 child.kill('SIGTERM');
 if(!await wait()){child.kill('SIGKILL');if(!await wait())throw Error('Disposable Chromium did not exit');}
}
