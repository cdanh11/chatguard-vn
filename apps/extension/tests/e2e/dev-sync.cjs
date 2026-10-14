// Requires the local WXT dev server. Temporarily changes only a source comment,
// restores it in finally, and never reads an authenticated browser/account.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const extension=path.resolve(__dirname,'../..');
const file=path.join(extension,'lib/reader-version.ts');const original=fs.readFileSync(file,'utf8');
const output=path.join(extension,'.output/chrome-mv3-dev');
const version=()=>JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8')).version_name;
const consistent=()=>fs.readFileSync(path.join(output,'content-scripts/guard.js'),'utf8').includes(version());
const socket=new WebSocket('ws://127.0.0.1:3001','vite-hmr');const seen=[];
socket.addEventListener('message',event=>{try{seen.push(JSON.parse(event.data));}catch{}});
const wait=async(predicate)=>{const until=Date.now()+15000;while(!predicate()){if(Date.now()>until)throw new Error('Timed out waiting for dev synchronization');await new Promise(r=>setTimeout(r,100));}};
(async()=>{
  const before=version();
  try{
    await wait(()=>socket.readyState===1);socket.send(JSON.stringify({type:'custom',event:'wxt:background-initialized'}));
    await new Promise(r=>setTimeout(r,700));assert.ok(consistent());seen.length=0;
    fs.writeFileSync(file,original+'\n// Temporary local dev synchronization check.\n');
    await wait(()=>seen.some(m=>m.event==='wxt:reload-extension'));
    assert.notEqual(version(),before);assert.ok(consistent(),'Manifest must use the compiled reader stamp, including on partial rebuild');
    seen.length=0;socket.send(JSON.stringify({type:'custom',event:'wxt:background-initialized'}));
    await new Promise(r=>setTimeout(r,700));
    assert.ok(!seen.some(m=>m.event==='wxt:reload-extension'),'No reconnect reload loop');
    assert.ok(!seen.some(m=>m.event==='wxt:reload-content-script'),'No registered-script no-op for executeScript readers');
    console.log('PASS: partial rebuild updates both stamps, requests one extension reload, and reconnect creates no loop or unregistered-script update.');
  }finally{
    fs.writeFileSync(file,original);
    try{await wait(()=>version()===before&&consistent());}finally{socket.close();}
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
