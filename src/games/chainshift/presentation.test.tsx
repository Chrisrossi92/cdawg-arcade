import {afterEach,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {Chainshift} from './Chainshift';
import {ChainshiftAudio} from './audio';
import {WebAudioManager} from '../../services/audioManager';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('renders a branded local challenge without hints, timer, ranking, or answer certificates',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('localStorage',{getItem:()=>null});
 const html=renderToStaticMarkup(<Chainshift/>);
 expect(html).toContain('LOCAL PRACTICE');expect(html).toContain('CHAINSHIFT');expect(html).toContain('ICE');expect(html).toContain('ROOM');
 expect(html).toContain('Fewest shifts wins. Time breaks ties.');expect(html).toContain('alt="CDAWG Arcade"');expect(html).toContain('alt=""');expect(html).toContain('role="status"');expect(html).toContain('aria-live="polite"');
 expect(html).not.toContain('Graph minimum');expect(html).not.toContain('score-strip');expect(html).not.toContain('shortestCertificate');expect(html).not.toContain('WAR');
});
it('honors the existing explicit motion preference and OS preference independently',()=>{
 for(const [stored,os] of [['true',false],['false',true],['false',false]] as const){
  vi.stubGlobal('matchMedia',()=>({matches:os}));vi.stubGlobal('localStorage',{getItem:(key:string)=>key.includes('reduced-motion')?stored:null});
  expect(renderToStaticMarkup(<Chainshift/>)).toContain(`data-reduced="${stored==='true'||os}"`);
 }
});
it('optional settings storage failure cannot prevent local play',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('localStorage',{getItem:()=>{throw Error('unavailable');}});
 expect(renderToStaticMarkup(<Chainshift/>)).toContain('START');
});
it('uses a soft synthesized palette with a bounded completion sting and no music',()=>{
 const sequence=vi.spyOn(WebAudioManager.prototype,'playSequence').mockImplementation(()=>{});const audio=new ChainshiftAudio();
 for(const kind of ['accepted','rejected','backtracked','completed'] as const)audio.feedback(kind);
 const calls=sequence.mock.calls.map(call=>call[0]);expect(calls.every(tones=>tones.every(t=>['sine','triangle'].includes(t.type)))).toBe(true);
 expect(calls[0]).toHaveLength(3);expect(calls[0][0].duration).toBeLessThan(.05);expect(calls[0][1].type).toBe('triangle');expect(calls[1][0].volume).toBeLessThan(.025);expect(calls[2][1].frequency).toBeLessThan(calls[2][0].frequency);
 const duration=Math.max(...calls[3].map(t=>(t.delay??0)/1000+t.duration));expect(duration).toBeGreaterThanOrEqual(.5);expect(duration).toBeLessThanOrEqual(1);expect(audio.musicEnabled).toBe(false);audio.dispose();
});
