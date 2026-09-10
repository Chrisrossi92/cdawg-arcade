import {describe, expect, it, vi} from 'vitest';
import {DiscordIdentityProvider, type PkceProbeOutcome} from './discord';
import {loadServerConfig} from '../env';

const config = loadServerConfig({
  DISCORD_CLIENT_ID:'123456789012345678',
  DISCORD_CLIENT_SECRET:'DUMMY_PKCE_PROBE_CLIENT_SECRET',
  DISCORD_REDIRECT_URI:'https://arcade.example',
  ALLOWED_ORIGINS:'https://arcade.example',
});
const verifier = 'A'.repeat(43);
const code = 'synthetic-probe-code';
const access = {access_token:'synthetic-probe-access',token_type:'Bearer',scope:'identify guilds'};
const user = {id:'234567890123456789',username:'Synthetic Player'};
const activity = {application_id:config.discordClientId,instance_id:'synthetic-instance',
  location:{kind:'gc',guild_id:'345678901234567890'},users:[user.id]};
const rejection = () => new Response(JSON.stringify({error:'invalid_grant'}),{status:400});
const json = (value:unknown) => new Response(JSON.stringify(value));
const positive = () => [json(access),json(user),json(activity)];
function setup(responses:Response[], enabled = true) {
  const outcomes:PkceProbeOutcome[] = [];
  const fetcher = vi.fn(async (_url:string|URL|Request,_init?:RequestInit) => {
    const response = responses.shift();
    if (!response) throw new Error('Unexpected synthetic request');
    return response;
  });
  const service = new DiscordIdentityProvider(config,'synthetic-arcade-credential',fetcher,
    {enabled,report:outcome=>outcomes.push(outcome)});
  return {service,fetcher,outcomes,run:()=>service.verify(code,verifier,'synthetic-instance',new AbortController().signal)};
}
describe('opt-in live PKCE rejection probe',()=>{
  it('requires rejection then successful verification of the same code, changing only the verifier',async()=>{
    const test=setup([rejection(),...positive()]);
    expect((await test.run()).identity.userId).toBe(user.id);
    expect(test.outcomes).toEqual(['rejected_then_verified']);
    const negative = new URLSearchParams(String(test.fetcher.mock.calls[0][1]?.body));
    const correct = new URLSearchParams(String(test.fetcher.mock.calls[1][1]?.body));
    expect(negative.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(negative.get('code_verifier')).not.toBe(verifier);
    expect(correct.get('code_verifier')).toBe(verifier);
    expect(correct.get('code')).toBe(code);
    negative.delete('code_verifier');correct.delete('code_verifier');
    expect([...negative]).toEqual([...correct]);
    for (const [,init] of test.fetcher.mock.calls) {
      expect(init?.redirect).toBe('error');
      expect(init?.signal).toBe(test.fetcher.mock.calls[0][1]?.signal);
    }
  });
  it('adds no requests or probe report when disabled',async()=>{
    const test=setup(positive(),false);await test.run();
    expect(test.fetcher).toHaveBeenCalledTimes(3);
    expect(test.outcomes).toEqual([]);
  });
  it('fails closed and revokes only an unexpectedly issued negative-test token',async()=>{
    const test=setup([json(access),new Response(null,{status:200})]);
    await expect(test.run()).rejects.toThrow('verification_unavailable');
    expect(test.outcomes).toEqual(['wrong_verifier_accepted']);
    expect(test.fetcher).toHaveBeenCalledTimes(2);
    expect(test.fetcher.mock.calls[1][0]).toBe('https://discord.com/api/oauth2/token/revoke');
    const form=new URLSearchParams(String(test.fetcher.mock.calls[1][1]?.body));
    expect(form.get('token')).toBe(access.access_token);
    expect(form.get('token_type_hint')).toBe('access_token');
  });
  it('does not return a session bootstrap when negative-token revocation fails',async()=>{
    const test=setup([json(access)]);
    await expect(test.run()).rejects.toThrow('verification_unavailable');
    expect(test.outcomes).toEqual(['wrong_verifier_accepted']);
  });
  for(const status of [401,429,500]) it(`does not mistake HTTP ${status} for PKCE rejection`,async()=>{
    const test=setup([new Response(JSON.stringify({error:'invalid_grant'}),{status})]);
    await expect(test.run()).rejects.toThrow('verification_unavailable');
    expect(test.outcomes).toEqual(['inconclusive']);
    expect(test.fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not mistake invalid client credentials for PKCE rejection',async()=>{
    const test=setup([new Response(JSON.stringify({error:'invalid_client'}),{status:400})]);
    await expect(test.run()).rejects.toThrow('verification_unavailable');
    expect(test.outcomes).toEqual(['inconclusive']);
  });
  it('requires the correct-verifier exchange to succeed, including when a failed exchange consumes the code',async()=>{
    const test=setup([rejection(),rejection()]);
    await expect(test.run()).rejects.toThrow('verification_unavailable');
    expect(test.outcomes).toEqual(['inconclusive']);
    expect(test.fetcher).toHaveBeenCalledTimes(2);
  });
  it('still rejects wrong application or participant context after the paired exchanges',async()=>{
    const test=setup([rejection(),json(access),json(user),json({...activity,users:[]})]);
    await expect(test.run()).rejects.toThrow('verification_unavailable');
    expect(test.outcomes).toEqual(['inconclusive']);
  });
  it('treats a successful response without a token as inconclusive and never continues',async()=>{
    const test=setup([json({unexpected:'response'})]);
    await expect(test.run()).rejects.toThrow('verification_unavailable');
    expect(test.outcomes).toEqual(['inconclusive']);
    expect(test.fetcher).toHaveBeenCalledTimes(1);
  });
  it('sanitizes failure details and reports no code, verifier, credential or response body',async()=>{
    const test=setup([new Response(JSON.stringify({error:'invalid_request',error_description:'SYNTHETIC_PRIVATE_DETAIL'}),{status:400})]);
    await expect(test.run()).rejects.toThrow(/^verification_unavailable$/);
    expect(JSON.stringify(test.outcomes)).toBe('["inconclusive"]');
  });
});
