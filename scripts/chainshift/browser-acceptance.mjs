// Browser acceptance through the active cua_repl tab/viewport handles.
// Uses localhost as a separate test origin from the user's 127.0.0.1 play URL.
// Certificates stay in this offline harness, never in the candidate bundle.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=new URL('../../',import.meta.url);
const manifests=JSON.parse(await readFile(new URL('shared/chainshift/enrichment/LOCAL_PUZZLES_V2.json',base),'utf8'));
const evidence=new URL('tmp/chainshift/slice4-evidence/',base);
export async function accept(tab,viewport){
 await mkdir(evidence,{recursive:true});const checks=[];
 const observe=()=>tab.getAXState({emit:false});
 const capture=async name=>{await observe();await writeFile(new URL(name+'.jpg',evidence),await tab.screenshot({fullPage:name.includes('results')||name.includes('completed')}));};
 const input=()=>tab.playwright.getByRole('textbox',{name:'Next word',exact:true});
 const button=name=>tab.playwright.getByRole('button',{name,exact:true});
 const submit=async word=>{await input().fill(word);await input().press('Enter');};
 const inspect=()=>tab.playwright.evaluate(()=>{
  const rect=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON();
  const list=document.querySelector('.word-chain'),node=document.querySelector('.word-node.current');
  return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,focus:document.activeElement?.id,
   count:document.querySelectorAll('.word-node').length,locked:document.querySelectorAll('.word-node.locked').length,
   input:rect('#next-word'),current:rect('.word-node.current'),chain:rect('.word-chain'),scroll:list?.scrollTop,
   destination:document.querySelector('.destination strong')?.textContent,
   origin:document.querySelector('.word-node.origin')?.getAttribute('data-lock'),
   currentLocked:node?.getAttribute('data-lock'),border:node?getComputedStyle(node).borderColor:null,
   animation:node?getComputedStyle(node).animationName:null,connector:node?getComputedStyle(node,'::before').width:null,
   unlock:!!document.querySelector('.unlock-connector'),resolved:!!document.querySelector('.resolved'),freshSweep:!!document.querySelector('.just-completed'),
   status:document.querySelector('[role=status]')?.textContent,designation:document.querySelector('.result-designation')?.textContent,
   reduced:document.querySelector('.chainshift-shell')?.getAttribute('data-reduced'),
   saved:document.querySelector('.minimum')?.textContent,elapsed:document.querySelector('.result-panel dl>div:last-child dd')?.textContent,
   history:Array.from(document.querySelectorAll('.practice-runs>li')).map(li=>({shifts:li.querySelector('.practice-score strong')?.textContent,time:li.querySelector('.practice-score>span')?.textContent})),
   portraits:document.querySelectorAll('.host-presence img,.complete-heading img').length,
   targets:Array.from(document.querySelectorAll('button,select,summary')).filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height),
  };
 });
 const readyForPuzzle=async index=>{
  if(await button('TRY AGAIN').count())await button('TRY AGAIN').click();
  await tab.playwright.getByRole('combobox',{name:'Local puzzle',exact:true}).selectOption(String(index));await observe();
 };
 await viewport.set({width:1280,height:900});
 if(await tab.url()!=='http://localhost:5263/')await tab.goto('http://localhost:5263/');else await tab.reload();
 await observe();await readyForPuzzle(0);
 await button('Settings').click();await observe();await tab.playwright.getByRole('checkbox',{name:'Sound effects',exact:true}).check();await tab.playwright.getByRole('checkbox',{name:'Reduce motion',exact:true}).uncheck();await button('Done').click();await observe();
 await capture('start-desktop');await button('START').click();await observe();let g=await inspect();assert.equal(g.origin,'origin');assert.equal(g.destination,'ROOM');assert.equal(g.portraits,0);
 await submit('box');await observe();g=await inspect();assert.equal(g.locked,1);assert.equal(g.currentLocked,'locked');assert.equal(g.focus,'next-word');assert.equal(g.connector,'4px');assert.equal(g.border,'rgb(255, 138, 43)');await capture('first-lock-desktop');
 for(const word of ['car','pool','party'])await submit(word);await observe();g=await inspect();assert.equal(g.locked,4);assert.equal(g.count,5);assert.equal(g.focus,'next-word');await capture('several-locks-desktop');
 await submit('nope');await observe();g=await inspect();assert.equal(g.count,5);assert.match(g.status,/Not a recognized/);assert.equal(g.focus,'next-word');await capture('invalid-desktop');
 await button('← Backtrack').click();await observe();g=await inspect();assert.equal(g.locked,3);assert.equal(g.unlock,true);assert.equal(g.focus,'next-word');await capture('unlock-desktop');
 await submit('party');await submit('room');await observe();g=await inspect();assert.equal(g.resolved,true);assert.equal(g.freshSweep,true);assert.equal(g.count,6);assert.match(g.saved,/Saved on this browser/);assert.equal(await input().count(),0);await capture('completed-desktop');
 checks.push('origin/locked/current/waiting states, 4px warm joints, immediate Enter, invalid, unlock, resolved finish');
 const completedTime=g.elapsed;await button('VIEW LOCAL RESULTS').click();await observe();let firstCount=(await inspect()).history.length;assert.ok(firstCount>=1);await capture('local-results-first');
 await button('Close local results').click();await button('TRY AGAIN').click();await observe();assert.match(await tab.playwright.domSnapshot(),/LOCAL BEST/);await button('START').click();await observe();
 for(const word of ['cold','war','room'])await submit(word);await observe();g=await inspect();assert.equal(g.count,4);assert.match(g.saved,/Saved on this browser/);assert.equal(g.resolved,true);await capture('new-local-best-desktop');
 await button('VIEW LOCAL RESULTS').click();await observe();g=await inspect();assert.equal(g.history.length,firstCount+1);assert.equal(g.history[0].shifts,'3 shifts');assert.ok(g.history.some(run=>run.shifts==='5 shifts'));
 const summaries=tab.playwright.locator('.practice-runs summary');await summaries.first().click();await summaries.last().click();await observe();assert.match(await tab.playwright.domSnapshot(),/Saved local route/);await capture('local-results-desktop');
 const beforeReload=g.history.length;await tab.reload();await observe();g=await inspect();assert.equal(g.count,4);assert.equal(g.freshSweep,false);assert.match(g.saved,/Restored local completion/);const restoredTime=g.elapsed;
 await button('VIEW LOCAL RESULTS').click();await observe();assert.equal((await inspect()).history.length,beforeReload);await capture('reload-results-desktop');await button('Close local results').click();
 checks.push('completed persistence/reload, no duplicate write, repeated practice, shift-first sorting, real local best, own previous route disclosures');
 for(const width of [320,360,390]){
  await viewport.set({width,height:844});await observe();g=await inspect();assert.equal(g.overflow,false);assert.ok(g.targets.every(height=>height>=44));
 }
 await button('VIEW LOCAL RESULTS').click();await observe();await tab.playwright.locator('.practice-runs summary').first().click();await observe();assert.equal((await inspect()).overflow,false);await capture('local-results-mobile');await button('Close local results').click();
 await button('TRY AGAIN').click();await observe();await capture('local-best-start-mobile');
 await button('Settings').click();await observe();await tab.playwright.getByRole('checkbox',{name:'Sound effects',exact:true}).uncheck();await tab.playwright.getByRole('checkbox',{name:'Reduce motion',exact:true}).check();await button('Done').click();await observe();
 await button('START').click();await observe();const long=['box','car','pool','party','food','truck','stop','sign','language','school','board','game','ball','park','bench','mark','down','town','hall','pass'];
 for(const word of long){await submit(word);assert.equal((await inspect()).focus,'next-word');}
 await observe();g=await inspect();assert.equal(g.count,21);assert.equal(g.locked,20);assert.equal(g.animation,'none');assert.equal(g.reduced,'true');assert.equal(g.overflow,false);assert.ok(g.scroll>0);assert.ok(g.current.bottom<=g.chain.bottom+1);await capture('long-chain-mobile-reduced');
 await viewport.set({width:390,height:430});await observe();g=await inspect();assert.equal(g.overflow,false);assert.ok(g.input.bottom<=g.height);assert.ok(g.current.bottom<=g.chain.bottom+1);await capture('keyboard-mobile');
 await button('← Backtrack').click();await observe();g=await inspect();assert.equal(g.count,20);assert.equal(g.locked,19);assert.equal(g.unlock,false);assert.equal(g.focus,'next-word');
 await tab.reload();await observe();g=await inspect();assert.equal(g.count,4);assert.equal(g.elapsed,restoredTime);assert.match(g.saved,/Restored local completion/);await viewport.set({width:390,height:844});await observe();
 checks.push('320/360/390px results/history, 20-shift reduced/muted chain, 430px keyboard viewport, unfinished run discarded on reload');
 await button('Settings').click();await observe();await tab.playwright.getByRole('checkbox',{name:'Reduce motion',exact:true}).uncheck();await tab.playwright.getByRole('checkbox',{name:'Sound effects',exact:true}).check();await button('Done').click();await observe();
 await readyForPuzzle(0);await button('START').click();await observe();for(const word of long)await submit(word);await observe();g=await inspect();assert.equal(g.locked,20);await capture('long-chain-mobile-motion');await button('← Backtrack').click();await observe();assert.equal((await inspect()).unlock,true);await capture('backtrack-mobile');
 // Complete other pinned candidates without expanding corpus or importing review data into UI.
 await tab.reload();await observe();for(const index of [1,3,8]){
  await readyForPuzzle(index);await button('START').click();await observe();for(const word of manifests[index].shortestCertificate.route.slice(1))await submit(word);await observe();g=await inspect();assert.equal(g.resolved,true);assert.equal(g.locked,manifests[index].shortestCertificate.shifts);assert.equal(g.overflow,false);await capture(`completed-local-${index+1}`);
 }
 checks.push('live-motion long route and unlock; SOUP–HOUSE, GAME–FOOD, STATION–LINE local completions');
 await button('NEXT LOCAL PUZZLE').click();await observe();assert.match(await tab.playwright.domSnapshot(),/Local challenge/);await readyForPuzzle(0);await viewport.reset();await observe();
 const report={passed:true,checks,limitations:['Native phone keyboard and real IME composition are not exercised.','VisualViewport shrink and IME decision logic are covered.','SFX timing, bounded pitch/volume and cleanup are verified; subjective listening is not established.'],timingEvidence:{firstFiveShiftTime:completedTime,restoredThreeShiftTime:restoredTime}};
 await writeFile(new URL('browser-report.json',evidence),JSON.stringify(report,null,2)+'\n');return report;
}
