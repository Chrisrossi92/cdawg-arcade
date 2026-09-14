import type { HostContext } from '../contracts/events';
/** Player-safe presentation only. Never display SDK errors or internal status strings. */
export function connectionPresentation(context:HostContext){
 const state=context.connectionState??'local-practice',session=context.arcadeSessionState;
 const busy=state==='discord-connecting'||session==='verifying';
 const recover=state==='discord-error'||['unavailable','expired','account-changed'].includes(session??'');
 const canRetry=context.environment==='discord'&&!busy&&!['invalid-context','configuration'].includes(context.connectionError??'')&&(recover||session==='signed-out');
 const label=busy?'Connecting…':recover?'Connection needed':context.authenticated&&session==='verified'?'Connected':context.authenticated?'Discord connected':'Practice';
 const message=context.connectionError==='invalid-context'?'Reopen the Arcade from Discord to connect.':context.connectionError==='configuration'?'Connection is unavailable. Practice is still here.':session==='account-changed'?'Your account changed. Reconnect to continue.':session==='expired'?'Reconnect to save official scores.':'Couldn’t connect. Try again or enjoy practice.';
 return {busy,recover,canRetry,label,message};
}
export function ConnectionStatus({context,onRetry,onPractice,recoveryOnly=false}:{context:HostContext;onRetry?:()=>void;onPractice?:()=>void;recoveryOnly?:boolean}){
 const state=connectionPresentation(context);
 if(recoveryOnly&&!state.busy&&!state.recover)return null;
 return <div className="connection-status"><span role="status">{state.label}</span>{state.recover&&<p>{state.message}</p>}
  {(state.canRetry||state.busy||state.recover)&&<div className="connection-recovery">{state.canRetry&&onRetry&&<button className="secondary-button" onClick={onRetry}>Reconnect</button>}{onPractice&&<button className="secondary-button" onClick={onPractice}>Continue in practice</button>}</div>}
 </div>;
}
