/** Spoiler-safe transport contracts. No manifests, analysis or review certificates. */
export interface DailyPuzzle {id:string;day:string;start:{key:string;display:string};finish:{key:string;display:string};graphVersion:string;checksum:string;rulesRevision:string}
export interface RankedAttempt {attemptId:string;puzzle:DailyPuzzle;state:'active'|'completed';route:string[];revision:number;claimedAt:string;serverNow:string;completedAt:string|null;shifts:number;elapsedMs:number}
export type RankedFeedback={kind:'accepted'|'rejected'|'backtracked'|'completed'|'none';text:string;removed?:string};
export interface RankedReply {attempt:RankedAttempt;feedback:RankedFeedback;duplicate?:boolean}
export interface DailyView {puzzle:DailyPuzzle;attempt:RankedAttempt|null;player:{id:string;displayName:string}}
export interface RankedRow {playerTag:string;displayName:string;shifts:number;elapsedMs:number;rank:number;isYou:boolean}
export interface RankedBoard {puzzleId:string;scope:'global'|'guild';rows:RankedRow[];own:RankedRow|null;limit:number}
export interface RankedRoutes {puzzleId:string;rows:(RankedRow&{route:string[]})[]}
