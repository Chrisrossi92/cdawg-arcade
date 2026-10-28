/** A new rules identity: never compare these results with legacy shortest-route scores. */
export const FIXED_RULES='chainshift-authored-v2';
export type Mode='daily'|'practice';
export interface PuzzleCard {id:string;title:string;start:string;finish:string;words:number}
export interface Slot {length:number;display:string;solved:boolean;endpoint:boolean}
export interface FixedView {
 rules:typeof FIXED_RULES;id:string;puzzle:PuzzleCard;mode:Mode;day:string|null;revision:number;
 phase:'ready'|'playing'|'completed';slots:Slot[];current:number;hints:number;mistakes:number;score:number;
 elapsedMs:number;message:string;outcome:'none'|'correct'|'miss'|'hint'|'complete';connections?:string[];
}
export interface FixedHome {player:{id:string;displayName:string};daily:FixedView|null;dailyMessage:string;practice:PuzzleCard[];practiceAttempt:FixedView|null}
export interface FixedRow {rank:number;name:string;isYou:boolean;score:number;hints:number;mistakes:number;elapsedMs:number}
export type FixedAction={kind:'start'}|{kind:'guess';word:string}|{kind:'hint'};
export interface FixedRequest {requestId:string;revision:number;action:FixedAction}
export const normalizeGuess=(value:unknown):string|null=>typeof value==='string'&&/^[a-z]+$/i.test(value.trim())?value.trim().toUpperCase():null;
export const performanceBonus=(assists:number,elapsedMs:number)=>Math.max(0,500-Math.floor(Math.max(0,elapsedMs)/1000)-50*assists);
export const fixedScore=(assists:number,elapsedMs:number,completed=false)=>completed?500+performanceBonus(assists,elapsedMs):0;
export function timeLabel(ms:number){const seconds=Math.floor(Math.max(0,ms)/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
