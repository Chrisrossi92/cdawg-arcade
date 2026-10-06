/** Read-only audit. Never creates, edits, or deletes Discord commands. */
export interface EntryPointAudit {
 state:'discord-handled'|'app-handled'|'missing'|'ambiguous'|'unknown-handler'|'unavailable';
 commandId?:string;
 name?:string;
}
export async function auditEntryPoint(applicationId:string|undefined,botToken:string|undefined,transport:typeof fetch=fetch):Promise<EntryPointAudit>{
 if(!applicationId||!/^[1-9][0-9]{16,19}$/.test(applicationId)||!botToken)return {state:'unavailable'};
 try {
  const response=await transport(`https://discord.com/api/v10/applications/${applicationId}/commands`,{method:'GET',redirect:'error',headers:{Authorization:`Bot ${botToken}`},signal:AbortSignal.timeout(8000)});
  if(!response.ok||!response.body)return {state:'unavailable'};
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>65536)return {state:'unavailable'};chunks.push(next.value);}}finally{await reader.cancel().catch(()=>{});}
  const commands:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!Array.isArray(commands)||commands.length>100)return {state:'unavailable'};
  const entries=commands.filter(c=>c&&typeof c==='object'&&c.type===4);
  if(!entries.length)return {state:'missing'};if(entries.length!==1)return {state:'ambiguous'};
  const command=entries[0];
  if(command.application_id!==applicationId||command.guild_id!==undefined||!/^[1-9][0-9]{16,19}$/.test(command.id)||typeof command.name!=='string'||!command.name.length||command.name.length>32)return {state:'unavailable'};
  return {state:command.handler===2?'discord-handled':command.handler===1?'app-handled':'unknown-handler',commandId:command.id,name:command.name};
 }catch{return {state:'unavailable'};}
}
