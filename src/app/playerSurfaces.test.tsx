import {describe,it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {PlayerSettings} from './PlayerSettings';
import {ConnectionStatus,connectionPresentation} from './ConnectionStatus';
import {makeDefaultLocalContext} from '../platform/hostAdapter';
import {createV1ProductUiPolicy} from './v1ProductPolicy';
const local=makeDefaultLocalContext(),verified={...local,environment:'discord' as const,authenticated:true,connectionState:'discord-authenticated' as const,arcadeSessionState:'verified' as const};
afterEach(()=>vi.unstubAllEnvs());
describe('player settings and recovery boundaries',()=>{
 it('keeps healthy connection recovery absent',()=>{expect(renderToStaticMarkup(<ConnectionStatus recoveryOnly context={verified} onRetry={()=>{}}/>)).toBe('');expect(connectionPresentation(verified).canRetry).toBe(false);});
 it('uses a named native dialog with a real trigger, not a CSS-only protected panel',()=>{const html=renderToStaticMarkup(<PlayerSettings context={verified} onPractice={()=>{}} official/>);expect(html).toContain('aria-haspopup="dialog"');expect(html).toContain('Your Arcade');expect(html).toContain('Disconnect and practice');expect(html).not.toContain('Reconnect');expect(html).not.toContain('initializationStatus');});
 it.each(['expired','account-changed','unavailable','signed-out'] as const)('offers contextual reconnect for %s',arcadeSessionState=>expect(connectionPresentation({...verified,arcadeSessionState}).canRetry).toBe(true));
 it.each(['invalid-context','configuration'] as const)('never retries unsupported %s or reveals raw errors',connectionError=>{const html=renderToStaticMarkup(<ConnectionStatus context={{...verified,connectionState:'discord-error',connectionError,initializationStatus:'PRIVATE SDK TRACE'}} onRetry={()=>{}} onPractice={()=>{}}/>);expect(html).not.toContain('Reconnect');expect(html).not.toContain('PRIVATE');expect(html).toContain('Continue in practice');});
 it.each(['?dev=1','?tuning=1','?owner=true','?diagnostics=1'])('cannot enable production diagnostics via %s',query=>{vi.stubEnv('DEV',false);expect(createV1ProductUiPolicy(query).showDevelopmentUi).toBe(false);});
 it('removes the local tuning query as an operational control',()=>{vi.stubEnv('DEV',true);expect(createV1ProductUiPolicy('?tuning').showDevelopmentUi).toBe(false);});
 it('shows only one practice action while connecting',()=>{const html=renderToStaticMarkup(<PlayerSettings context={{...verified,arcadeSessionState:'verifying'}} onPractice={()=>{}}/>);expect(html).toContain('Continue in practice');expect(html).not.toContain('Disconnect and practice');});
 it('disables sound changes while a run is preparing or active',()=>{const html=renderToStaticMarkup(<PlayerSettings context={local} disabled/>);expect(html).toContain('<fieldset disabled=""');});
});
