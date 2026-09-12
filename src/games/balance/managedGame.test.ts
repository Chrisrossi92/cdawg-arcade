import {afterEach,it,expect,vi} from 'vitest';
import {setMaxListeners} from 'node:events';
import {ownVisibility} from './managedGame';
afterEach(()=>vi.unstubAllGlobals());
it('owns visibility and focus listeners across overlapping Phaser lifetimes',()=>{
 const doc=new EventTarget(),win=Object.assign(new EventTarget(),{onblur:vi.fn(),onfocus:vi.fn()});vi.stubGlobal('document',doc);vi.stubGlobal('window',win);
 setMaxListeners(0,doc,win);const oldBlur=win.onblur,oldFocus=win.onfocus,add=doc.addEventListener;const hits=vi.fn();const cleanup:(()=>void)[]=[];
 for(let i=0;i<100;i++)ownVisibility(()=>{doc.addEventListener('visibilitychange',hits);win.onblur=vi.fn();win.onfocus=vi.fn();},f=>cleanup.push(f));
 expect(doc.addEventListener).toBe(add);expect(win.onblur).toBe(oldBlur);expect(win.onfocus).toBe(oldFocus);doc.dispatchEvent(new Event('visibilitychange'));expect(hits).toHaveBeenCalledTimes(1);cleanup.reverse().forEach(f=>f());doc.dispatchEvent(new Event('visibilitychange'));expect(hits).toHaveBeenCalledTimes(1);
});
it('restores globals and releases captured listeners when renderer start fails',()=>{
 const doc=new EventTarget(),win=Object.assign(new EventTarget(),{onblur:null,onfocus:null});vi.stubGlobal('document',doc);vi.stubGlobal('window',win);const add=doc.addEventListener,hit=vi.fn();
 expect(()=>ownVisibility(()=>{doc.addEventListener('visibilitychange',hit);throw Error('renderer');},()=>{})).toThrow('renderer');expect(doc.addEventListener).toBe(add);doc.dispatchEvent(new Event('visibilitychange'));expect(hit).not.toHaveBeenCalled();
});
