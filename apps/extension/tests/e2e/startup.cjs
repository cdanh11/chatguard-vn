const {chromium}=require('playwright');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..');
const token=fs.readFileSync(root+'/apps/api/.env','utf8').match(/^CHATGUARD_API_TOKEN=(.*)$/m)[1].trim();
const build=process.env.CHATGUARD_TEST_BUILD||'chrome-mv3';

async function check(withAlarms){
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'chatguard-startup-'));
  const extension=path.join(temporary,'extension');fs.cpSync(root+'/apps/extension/.output/'+build,extension,{recursive:true});
  const manifestPath=path.join(extension,'manifest.json');const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(!withAlarms)manifest.permissions=manifest.permissions.filter(p=>p!=='alarms');
  fs.writeFileSync(manifestPath,JSON.stringify(manifest));
  const context=await chromium.launchPersistentContext(path.join(temporary,'profile'),{channel:'chromium',headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-extensions'],args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  const errors=[];
  try{
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    worker.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const id=new URL(worker.url()).host;
    const panel=await context.newPage();panel.on('pageerror',e=>errors.push(e.message));
    // A dev server can request one manifest reload as the first worker reconnects.
    for(let attempt=0;attempt<5;attempt++){
      try{await panel.goto(`chrome-extension://${id}/sidepanel.html`);break;}
      catch(error){if(attempt===4||!String(error).includes('ERR_BLOCKED_BY_CLIENT'))throw error;await new Promise(r=>setTimeout(r,500));}
    }
    await panel.getByLabel('Token máy chủ local').waitFor();
    const send=(message)=>panel.evaluate(message=>chrome.runtime.sendMessage(message),message);
    assert.equal((await send({type:'SETTINGS_GET'})).provider,'rules');
    assert.ok(!(await send({type:'SETTINGS_SAVE',settings:{token,provider:'rules',externalConsent:false,facebookEnabled:false,analysisEvery:1}})).error);
    const demo=await context.newPage();await demo.goto('http://127.0.0.1:8000/demo/#friend');await demo.locator('#message').waitFor();
    const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({url:'http://127.0.0.1:8000/demo/*'}))[0].id);
    const attached=await send({type:'ATTACH',activeTabId:tabId});assert.ok(!attached.error,attached.error);
    assert.equal(attached.readerBuild,manifest.version_name);
    const started=await send({type:'START',tabId,conversationId:attached.conversation.id});
    if(withAlarms){assert.equal(started.snapshot.status,'watching');await send({type:'STOP',tabId});}
    else{
      assert.match(started.error,/thiếu quyền chạy nền/);
      const info=await send({type:'DESCRIBE',tabId});assert.notEqual(info.snapshot.status,'watching');assert.equal(info.snapshot.messages.length,0);
      assert.equal((await send({type:'SETTINGS_GET'})).provider,'rules');
    }
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${build}, ${withAlarms?'normal startup and matching reader':'missing alarms keeps panel usable, refuses reading and returns recovery instructions'}.`);
  }finally{
    await context.close();assert.ok(path.resolve(temporary).startsWith(path.join(os.tmpdir(),'chatguard-startup-')));fs.rmSync(temporary,{recursive:true,force:true});
  }
}
(async()=>{await check(false);await check(true);})().catch(e=>{console.error(e);process.exitCode=1;});
