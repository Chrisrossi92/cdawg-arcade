// Chromium may create DevToolsActivePort before writing its contents.
export function devToolsPort(text){
 const match=/^([1-9][0-9]{0,4})\r?\n/.exec(text);
 if(!match)return undefined;
 const port=Number(match[1]);return port<=65535?port:undefined;
}
