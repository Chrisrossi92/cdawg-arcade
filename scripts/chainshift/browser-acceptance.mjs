// Run through the Browser skill's existing session. Review certificates stay in
// this offline test harness; the candidate build explicitly rejects their import.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=new URL('../../',import.meta.url);
const manifests=JSON.parse(await readFile(new URL('shared/chainshift/enrichment/LOCAL_PUZZLES_V2.json',base),'utf8'));
const evidence=new URL('tmp/chainshift/evidence/',base);
export async function accept(tab,viewport){
 await mkdir(evidence,{recursive:true});const checks=[];
 const capture=async name=>writeFile(new URL(name+'.jpg',evidence),await tab.screenshot({fullPage:name.startsWith('completed')}));
 const dom=()=>tab.playwright.domSnapshot();
 const input=()=>tab.playwright.getByRole('textbox',{name:'Next word',exact:true});
 const button=name=>tab.playwright.getByRole('button',{name,exact:true});
 const geometry=()=>tab.playwright.evaluate(()=>{
  const rect=selector=>document.querySelector(selector)?.getBoundingClientRect().toJSON();
  const list=document.querySelector('.word-chain');
  return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,
   focus:document.activeElement?.id,input:rect('#next-word'),current:rect('.word-node.current'),chain:rect('.word-chain'),
   count:document.querySelectorAll('.word-node').length,scroll:list?.scrollTop,scrollHeight:list?.scrollHeight,
   shifts:document.querySelector('.score-strip dd')?.textContent,status:document.querySelector('[role=status]')?.textContent,
   reduced:document.querySelector('.chainshift-shell')?.getAttribute('data-reduced'),
   animation:document.querySelector('.word-node')?getComputedStyle(document.querySelector('.word-node')).animationName:null,
   elapsed:document.querySelector('.result-panel dd:last-child')?.textContent,
   portraits:document.querySelectorAll('.host-presence img,.complete-heading img').length,
   targets:[...document.querySelectorAll('button,select')].filter(e=>e.getClientRects().length).map(e=>({height:e.getBoundingClientRect().height,label:e.textContent})),
  };
 });
 const submit=async word=>{await input().fill(word);await input().press('Enter');};
 await viewport.set({width:1280,height:900});await tab.reload();assert.match(await dom(),/Local challenge/);
 await button('Settings').click();await tab.playwright.getByRole('checkbox',{name:'Sound effects',exact:true}).check();await tab.playwright.getByRole('checkbox',{name:'Reduce motion',exact:true}).uncheck();await button('Done').click();
 await capture('start-desktop');assert.equal((await geometry()).overflow,false);checks.push('desktop branded start, deliberate Start');
 await button('START').click();assert.equal((await geometry()).focus,'next-word');assert.equal((await geometry()).portraits,0);
 await submit('cold');let g=await geometry();assert.equal(g.count,2);assert.equal(g.focus,'next-word');await capture('active-desktop');
 await submit('nope');g=await geometry();assert.equal(g.count,2);assert.match(g.status,/Not a recognized shift/);assert.equal(g.focus,'next-word');await capture('invalid-desktop');
 await submit('nope');assert.equal((await geometry()).count,2);
 await button('← Backtrack').click();g=await geometry();assert.equal(g.count,1);assert.equal(g.shifts,'0');assert.equal(g.focus,'next-word');assert.equal(await button('← Backtrack').isEnabled(),false);await capture('backtrack-desktop');checks.push('Enter, rejection/repeated rejection, fast retry, Backtrack, input focus');
 for(const word of ['cold','war','room'])await submit(word);
 assert.match(await dom(),/CHAIN COMPLETE/);g=await geometry();assert.equal(g.count,4);assert.equal(g.shifts,'3');assert.equal(await input().count(),0);assert.equal(g.portraits,1);const recorded=g.elapsed;await capture('completed-desktop');
 await button('Settings').click();await button('Done').click();assert.equal((await geometry()).elapsed,recorded);checks.push('immediate completion, frozen time, full route, result focus, earned portrait');
 await button('PLAY ANOTHER LOCAL PUZZLE').click();assert.match(await dom(),/LOCAL 02/);
 for(const width of [320,360,390]){
  await viewport.set({width,height:844});await tab.playwright.getByRole('combobox',{name:'Local puzzle',exact:true}).selectOption('8');
  g=await geometry();assert.equal(g.overflow,false);assert.ok(g.targets.every(t=>t.height>=44));
 }
 await capture('start-mobile-station');await tab.playwright.getByRole('combobox',{name:'Local puzzle',exact:true}).selectOption('0');await capture('start-mobile');
 await button('Settings').click();await tab.playwright.getByRole('checkbox',{name:'Sound effects',exact:true}).uncheck();await tab.playwright.getByRole('checkbox',{name:'Reduce motion',exact:true}).check();await button('Done').click();
 await button('START').click();await submit('box');g=await geometry();assert.equal(g.reduced,'true');assert.equal(g.animation,'none');await capture('active-mobile');
 const route=['car','pool','party','food','truck','stop','sign','language','school','board','game','ball','park','bench','mark','down','town','hall','pass'];
 for(const word of route){await submit(word);g=await geometry();assert.equal(g.focus,'next-word');assert.doesNotMatch(g.status,/Not a recognized/);}
 g=await geometry();assert.equal(g.count,21);assert.equal(g.overflow,false);assert.ok(g.scroll>0);assert.ok(g.current.bottom<=g.chain.bottom+1);await capture('long-chain-mobile');
 await viewport.set({width:390,height:430});g=await geometry();assert.ok(g.input.bottom<=g.height);assert.ok(g.current.bottom<=g.chain.bottom+1);assert.equal(g.overflow,false);await dom();await capture('keyboard-mobile');
 await submit('unrecognized');assert.equal((await geometry()).count,21);await capture('invalid-mobile');await button('← Backtrack').click();assert.equal((await geometry()).count,20);assert.equal((await geometry()).focus,'next-word');await capture('backtrack-mobile');checks.push('320/360/390px, longest endpoint, 20-shift scroll, 430px keyboard viewport, 44px targets, mute, explicit reduced motion');
 await viewport.set({width:390,height:844});await tab.reload();assert.match(await dom(),/Local challenge/);
 for(const index of [0,1,3,8]){
  await tab.playwright.getByRole('combobox',{name:'Local puzzle',exact:true}).selectOption(String(index));await button('START').click();
  for(const word of manifests[index].shortestCertificate.route.slice(1))await submit(word);
  assert.match(await dom(),/CHAIN COMPLETE/);assert.equal((await geometry()).shifts,String(manifests[index].shortestCertificate.shifts));
  assert.equal((await geometry()).overflow,false);await capture(index===0?'completed-mobile':`completed-local-${index+1}`);
  await button('PLAY ANOTHER LOCAL PUZZLE').click();
 }
 checks.push('ICE–ROOM, SOUP–HOUSE, GAME–FOOD, STATION–LINE complete using pinned referee');
 await button('Settings').click();assert.equal(await tab.playwright.getByRole('checkbox',{name:'Sound effects',exact:true}).getAttribute('checked'),null);
 await tab.playwright.getByRole('checkbox',{name:'Sound effects',exact:true}).check();await tab.playwright.getByRole('checkbox',{name:'Reduce motion',exact:true}).uncheck();await button('Done').click();
 await tab.playwright.getByRole('combobox',{name:'Local puzzle',exact:true}).selectOption('0');await viewport.reset();
 await writeFile(new URL('browser-report.json',evidence),JSON.stringify({checks,passed:true,limitations:['Viewport shrink simulates keyboard space, not native iOS/Android keyboard behavior.','IME guard unit-tested; native composition event delivery not synthesized by read-only browser evaluation.','Web Audio scheduling/lifecycle tested; subjective sound character requires listening.']},null,2)+'\n');
 return {passed:true,checks};
}
