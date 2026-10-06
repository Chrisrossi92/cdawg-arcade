import {SessionStore} from '../../build/server/sessions/store.js';
import {createManifest} from '../../build/shared/chainshift/manifest.js';
import {enrichedReferee} from '../../build/shared/chainshift/enrichment/graph-v2.js';
import {publishLocalCandidate} from '../../build/server/chainshift/publication.js';
export const fixtureOrigin='https://123456789012345678.discordsays.com';
export const fixturePlayers={C:{userId:'678901234567890123',guildId:'345678901234567890',displayName:'Fixture Explorer',avatarHash:null},A:{userId:'234567890123456789',guildId:'345678901234567890',displayName:'Fixture Chris',avatarHash:null},B:{userId:'456789012345678901',guildId:'345678901234567890',displayName:'Fixture Loki',avatarHash:null},A2:{userId:'234567890123456789',guildId:'567890123456789012',displayName:'Fixture Chris',avatarHash:null}};
export async function loginFixture(runtime,identity,prior=null){
 const sessions=new SessionStore(runtime),challenge=await sessions.challenge(fixtureOrigin,prior);await sessions.consume(challenge.id,challenge.binding,fixtureOrigin,prior);
 const result=await sessions.finish(challenge.id,challenge.binding,identity,fixtureOrigin,prior);
 return {...result,credentials:{token:result.token,csrf:result.view.csrf,playerId:result.view.player.id}};
}
export async function seedFixture(db){
 const day=(await db.query("SELECT to_char(clock_timestamp() AT TIME ZONE 'America/New_York','YYYY-MM-DD') AS day")).rows[0].day;
 const manifest=createManifest(enrichedReferee,{id:'chainshift-local-ranked-001',number:1,day,start:'ice',finish:'room',generatedAt:'2026-10-04T00:00:00.000Z'});
 await publishLocalCandidate(db,manifest);return manifest;
}
