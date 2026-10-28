import type {ArcadeRuntime} from './runtime';
import {verified} from './runtime';
import {ArcadeSessionClient} from '../api/sessionClient';
import type {RankedIdentity} from '../games/chainshift/ranked';

/** Recheck the application's existing cookie session; host display state never grants ranked identity. */
export async function chainshiftIdentity(runtime:ArcadeRuntime,client=new ArcadeSessionClient()):Promise<RankedIdentity>{
 const expected=runtime.context;
 if(!verified(expected))throw new Error('unverified');
 const session=await client.me();
 if(!verified(runtime.context)||runtime.context.currentUser.id!==expected.currentUser.id||runtime.context.guildId!==expected.guildId||session.player.id!==expected.currentUser.id||session.guild.id!==expected.guildId)throw new Error('account_changed');
 return {player:session.player,csrf:session.csrf};
}
