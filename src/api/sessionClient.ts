import { buildApiUrl } from './url';
export interface ArcadeSession { status:'verified'; player:{id:string;displayName:string}; guild:{id:string}; expiresAt:string;idleExpiresAt:string;csrf:string; }
export interface AuthChallenge {challengeId:string;codeChallenge:string;codeChallengeMethod:'S256';}
export class SessionClientError extends Error { constructor(readonly code:string) {super('Arcade session unavailable');} }
export class ArcadeSessionClient {
  private csrf = '';
  constructor(private fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis), private origin = typeof window === 'undefined' ? '' : window.location.origin) {}
  private async request(path:string, body:unknown|undefined, parent?:AbortSignal) {
    const signal = parent ? AbortSignal.any([parent,AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000);
    const res = await this.fetchImpl(buildApiUrl(path), {method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal,
      headers:{'Content-Type':'application/json','X-Arcade-Request':'1','X-Arcade-Origin':this.origin,...(this.csrf?{'X-Arcade-CSRF':this.csrf}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    const value = await res.json();
    if (!res.ok) {
      const code = ['sessions_unavailable','expired','account_changed','csrf_invalid'].includes(value?.error) ? value.error : 'verification_unavailable';
      if (code==='expired'||code==='account_changed') this.csrf=''; throw new SessionClientError(code);
    }
    return value;
  }
  private session(value: ArcadeSession): ArcadeSession {
    if (value?.status!=='verified' || !/^[1-9][0-9]{16,19}$/.test(value.player?.id) || !/^[1-9][0-9]{16,19}$/.test(value.guild?.id) ||
      typeof value.player?.displayName!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(value.csrf) || !Number.isFinite(Date.parse(value.expiresAt)) || !Number.isFinite(Date.parse(value.idleExpiresAt))) throw new SessionClientError('verification_unavailable');
    this.csrf=value.csrf; return {status:'verified',player:{id:value.player.id,displayName:value.player.displayName},guild:{id:value.guild.id},expiresAt:value.expiresAt,idleExpiresAt:value.idleExpiresAt,csrf:value.csrf};
  }
  async me(signal?:AbortSignal):Promise<ArcadeSession> {return this.session(await this.request('/me',undefined,signal));}
  async challenge(signal?:AbortSignal):Promise<AuthChallenge|null> {
    try {await this.me(signal);} catch(e) {
      if (e instanceof SessionClientError && e.code==='sessions_unavailable') return null;
      if (!(e instanceof SessionClientError && e.code==='expired')) throw e;
    }
    const value = await this.request('/auth/challenges',{},signal);
    if (typeof value.challengeId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value.codeChallenge)||value.codeChallengeMethod!=='S256') throw new SessionClientError('verification_unavailable');
    return value;
  }
  async establish(challenge:AuthChallenge,code:string,instanceId:string,signal?:AbortSignal):Promise<{session:ArcadeSession;access_token:string}> {
    const value = await this.request('/session',{challengeId:challenge.challengeId,code,instanceId},signal);
    if (typeof value.access_token!=='string'||!value.access_token) throw new SessionClientError('verification_unavailable');
    const {access_token,...safe} = value;
    return {session:this.session(safe),access_token};
  }
  get hasSession() {return Boolean(this.csrf);}
  async logout(signal?:AbortSignal) {await this.request('/logout',{},signal);this.csrf='';}
  async discrepancy(signal?:AbortSignal) {await this.request('/session/discrepancy',{},signal);}
  clear() {this.csrf='';}
}
