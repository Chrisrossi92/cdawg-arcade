import {WebAudioManager,type SynthTone} from '../../services/audioManager';
const tone=(frequency:number,duration:number,delay=0,volume=0.025):SynthTone=>({frequency,duration,delay,volume,type:'sine'});
const palette={
 accepted:[tone(660,.085)],
 rejected:[{frequency:125,duration:.065,type:'triangle',volume:.018} as SynthTone],
 backtracked:[tone(390,.065),tone(245,.07,45,.018)],
 completed:[tone(440,.25),tone(554.37,.3,110),tone(659.25,.48,220),tone(880,.35,330,.018)],
};
export class ChainshiftAudio extends WebAudioManager {
 constructor(){super(['sine','triangle']);}
 feedback(kind:keyof typeof palette):void {this.playSequence(palette[kind]);}
}
