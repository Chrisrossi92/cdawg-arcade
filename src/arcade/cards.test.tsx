import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {GameCard} from './GameCard';
import {displayName} from './model';
describe('accessible reusable game cards',()=>{
 it.each(['official','practice','loading','unavailable','error','soon'] as const)('renders honest %s state',state=>{const html=renderToStaticMarkup(<GameCard state={state}/>);expect(html).toContain(state==='soon'?'COMING SOON':'CDAWG BALANCE');expect(html).toContain('<button');expect(html.includes('disabled=""')).toBe(['loading','unavailable','soon'].includes(state));if(state==='official')expect(html).toContain('VERIFIED RUNS');else expect(html).not.toContain('VERIFIED RUNS');if(state==='error')expect(html).toContain('Retry connection');});
 it('React escapes decoded leaderboard names',()=>{const html=renderToStaticMarkup(<span>{displayName('&lt;img src=x onerror=alert(1)&gt;')}</span>);expect(html).not.toContain('<img');expect(html).toContain('&lt;img');});
});
