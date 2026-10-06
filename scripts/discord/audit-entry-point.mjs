// Existing approved credentials only; does not load dotenv or register/change anything.
import {auditEntryPoint} from '../../build/server/discord/entryPoint.js';
const result=await auditEntryPoint(process.env.DISCORD_CLIENT_ID,process.env.DISCORD_ARCADE_BOT_TOKEN);
console.log(JSON.stringify(result));
if(['unavailable','ambiguous','unknown-handler'].includes(result.state))process.exitCode=1;
