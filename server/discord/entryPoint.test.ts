import {it,expect,vi} from 'vitest';
import {auditEntryPoint} from './entryPoint';
const app='1525643672194908330',id='123456789012345678',token='SYNTHETIC_ONLY_TOKEN';
it.each([[2,'discord-handled'],[1,'app-handled'],[99,'unknown-handler']])('audits type 4 handler %s without registration',async(handler,state)=>{
 const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify([{id,application_id:app,name:'launch',type:4,handler},{id,application_id:app,name:'other',type:1}])));
 expect(await auditEntryPoint(app,token,transport)).toEqual({state,commandId:id,name:'launch'});
 expect(transport).toHaveBeenCalledOnce();expect(transport.mock.calls[0][0]).toBe(`https://discord.com/api/v10/applications/${app}/commands`);expect(transport.mock.calls[0][1]).toMatchObject({method:'GET',redirect:'error'});
});
it('does not call Discord without existing credentials or with malformed app id',async()=>{const transport=vi.fn();for(const pair of [[undefined,token],[app,undefined],['https://evil.invalid',token]])expect(await auditEntryPoint(pair[0],pair[1],transport)).toEqual({state:'unavailable'});expect(transport).not.toHaveBeenCalled();});
it.each([{commands:[],state:'missing'},{commands:[{id,application_id:app,name:'launch',type:4,handler:2},{id,application_id:app,name:'launch2',type:4,handler:1}],state:'ambiguous'}])('distinguishes $state command lists',async({commands,state})=>{
 const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify(commands)));
 expect((await auditEntryPoint(app,token,transport)).state).toBe(state);
});
it('sanitizes authentication, network, malformed and oversized failures',async()=>{
 for(const response of [new Response('private provider error',{status:401}),new Response('{'),new Response('x'.repeat(65537))])expect(await auditEntryPoint(app,token,vi.fn().mockResolvedValue(response))).toEqual({state:'unavailable'});
 expect(await auditEntryPoint(app,token,vi.fn().mockRejectedValue(new Error(token)))).toEqual({state:'unavailable'});
});

it('does not report a foreign or guild-scoped command as the global application entry point',async()=>{
 for(const patch of [{application_id:'123456789012345678'},{guild_id:'345678901234567890'}]){
  const transport=vi.fn().mockResolvedValue(new Response(JSON.stringify([{id,application_id:app,name:'launch',type:4,handler:2,...patch}])));
  expect(await auditEntryPoint(app,token,transport)).toEqual({state:'unavailable'});
 }
});
