import {test} from 'vitest';import assert from 'node:assert/strict';import {devToolsPort} from './cdp-port.mjs';
test('does not turn an empty or partially written port file into HTTP port 80',()=>{for(const value of ['','49','49152','\n/devtools/browser/id','0\n','65536\n','abc\n'])assert.equal(devToolsPort(value),undefined);});
test('accepts only a complete valid first line',()=>{assert.equal(devToolsPort('49152\n/devtools/browser/id'),49152);assert.equal(devToolsPort('65535\r\n/devtools/browser/id'),65535);});
test('startup can wait through file creation and partial writes within its existing polling bound',()=>{const writes=['','4','49152','49152\n/devtools/browser/id'];assert.deepEqual(writes.map(devToolsPort),[undefined,undefined,undefined,49152]);});
