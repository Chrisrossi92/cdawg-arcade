import {WebAudioManager,type SynthTone} from '../../services/audioManager';
export type ChainFeedback='accepted'|'rejected'|'backtracked'|'completed';
const tone=(frequency:number,duration:number,type:OscillatorType='sine',delay=0,volume=.025):SynthTone=>({frequency,duration,type,delay,volume});
/** Six warm steps, then a ceiling. Rejection never advances it; backtrack lowers it. */
export function lockPitch(shifts:number):number {
 return 280+Math.min(6,Math.max(0,Math.floor(Number.isFinite(shifts)?shifts:0)-1))*18;
}
export function chainTones(kind:ChainFeedback,shifts=1):readonly SynthTone[] {
 const pitch=lockPitch(shifts);
 switch(kind){
  case 'accepted':return [tone(150,.035,'triangle',0,.028),tone(pitch,.105,'triangle',12,.026),tone(pitch*1.5,.09,'sine',28,.012)];
  case 'rejected':return [tone(115,.055,'triangle',0,.014)];
  case 'backtracked':return [tone(pitch,.05,'triangle',0,.02),tone(170,.075,'triangle',35,.016)];
  case 'completed':return [tone(150,.04,'triangle',0,.028),tone(330,.21,'triangle',15,.03),tone(440,.27,'sine',95,.024),tone(550,.32,'sine',175,.022),tone(660,.46,'sine',245,.019),tone(330,.48,'sine',270,.015)];
 }
}
export class ChainshiftAudio extends WebAudioManager {
 constructor(){super(['sine','triangle']);}
 feedback(kind:ChainFeedback,shifts=1):void {this.playSequence(chainTones(kind,shifts));}
}
