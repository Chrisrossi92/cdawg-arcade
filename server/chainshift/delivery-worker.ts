import type {Database} from '../database/pool.js';
import {liveDeliveryConfig} from './live-config.js';
import {DiscordDailyDelivery} from './discord-delivery.js';
import {DurableDailyReconciler,type ReconcileResult} from './delivery-store.js';
export interface DailyWorker {stop():Promise<void>}
/** Two-minute cadence, no overlapping ticks. Pilot scope expires; continuous scope requires explicit separate config. */
export function startDailyWorker(database:Database|undefined,env:NodeJS.ProcessEnv=process.env,
 report:(result:ReconcileResult)=>void=result=>console.log(JSON.stringify({event:'chainshift_daily_delivery',...result})),gameArtifactAvailable=false):DailyWorker {
 const config=liveDeliveryConfig(env);
 if(!config||!database||!gameArtifactAvailable)return {stop:async()=>{}};
 const reconciler=new DurableDailyReconciler(database,new DiscordDailyDelivery(config,env.DISCORD_ARCADE_BOT_TOKEN!),config);
 return scheduleDailyWorker(()=>reconciler.reconcile(),report);
}
export function scheduleDailyWorker(reconcile:()=>Promise<ReconcileResult>,report:(result:ReconcileResult)=>void,cadenceMs=120_000):DailyWorker {
 let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,pending:Promise<void>|undefined;
 const tick=()=>{
  if(stopped)return;
  pending=(async()=>{
   try{const result=await reconcile();report(result);if(result.state==='blocked'||result.state==='outside_pilot')stopped=true;}
   catch{report({state:'unavailable',error:'reconciliation_failed'});}
   if(!stopped){timer=setTimeout(tick,cadenceMs);timer.unref();}
  })();
 };
 timer=setTimeout(tick,0);timer.unref();
 return {async stop(){stopped=true;if(timer)clearTimeout(timer);await pending;}};
}
