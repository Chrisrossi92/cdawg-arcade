import {it,expect,vi,afterEach} from 'vitest';
import {WebAudioManager} from './audioManager';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('closes audio and removes music/delayed tones across repeated game mounts',()=>{
 vi.useFakeTimers();vi.stubGlobal('window',globalThis);
 const close=vi.fn(async()=>{}),oscillator=vi.fn(()=>({type:'',frequency:{value:0},connect:()=>{},start:()=>{},stop:()=>{}}));
 vi.stubGlobal('AudioContext',class {currentTime=0;destination={};close=close;createOscillator=oscillator;createGain=()=>({gain:{value:0,exponentialRampToValueAtTime:()=>{}},connect:()=>{}});});
 for(let i=0;i<100;i++){const audio=new WebAudioManager();audio.setMusicEnabled(true);vi.advanceTimersByTime(750);audio.dispose();expect(vi.getTimerCount()).toBe(0);const count=oscillator.mock.calls.length;audio.playCue('input');vi.advanceTimersByTime(1000);expect(oscillator).toHaveBeenCalledTimes(count);}
 expect(close).toHaveBeenCalledTimes(100);
});
