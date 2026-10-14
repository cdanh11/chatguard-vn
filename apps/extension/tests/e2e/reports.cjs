const {chromium}=require('playwright');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {pathToFileURL}=require('node:url');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..');
const token=fs.readFileSync(root+'/apps/api/.env','utf8').match(/^CHATGUARD_API_TOKEN=(.*)$/m)[1].trim();
(async()=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'chatguard-reports-'));
  const extension=root+'/apps/extension/.output/chrome-mv3';
  const context=await chromium.launchPersistentContext(path.join(temporary,'profile'),{channel:'chromium',headless:true,acceptDownloads:true,
    executablePath:process.env.CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-extensions'],args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:360,height:800}});
  const errors=[];
  try{
    context.setDefaultTimeout(20000);
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
    const demo=await context.newPage();await demo.goto('http://127.0.0.1:8000/demo/#fee-change');await demo.locator('#all').click();
    const panel=await context.newPage();panel.on('pageerror',e=>errors.push(e.message));await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    await panel.getByLabel('Token máy chủ local').fill(token);await panel.getByRole('button',{name:'Lưu cấu hình'}).click();
    await demo.bringToFront();await panel.getByRole('button',{name:'Kết nối tab đang mở'}).evaluate(b=>b.click());await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await panel.getByRole('heading',{name:'Cần kiểm chứng',exact:true}).waitFor();
    const tab=await worker.evaluate(async()=> (await chrome.storage.session.get('selectedTab')).selectedTab);
    const getState=()=>worker.evaluate(async tab=>(await chrome.storage.session.get(`tab:${tab}`))[`tab:${tab}`],tab);
    const original=await getState();
    await panel.locator('.session-archive > summary').click();await panel.locator('.draft-view > summary').click();
    assert.equal(await panel.locator('.draft-list li').count(),3);
    assert.ok((await panel.locator('.draft-list').innerText()).includes('Dạ cho em xin lịch làm việc.'));
    const download=async()=>{const [file]=await Promise.all([panel.waitForEvent('download'),panel.getByRole('button',{name:'Tải báo cáo',exact:true}).click()]);return file;};
    const completed=async()=> (await (await context.request.get('http://127.0.0.1:8000/api/status',{headers:{'X-ChatGuard-Token':token}})).json()).completed;
    const before=await completed();const evidence=await download();assert.match(evidence.suggestedFilename(),/^chatguard-vn-report-.*\.json$/);
    const evidencePath=path.join(temporary,'evidence.json');await evidence.saveAs(evidencePath);
    const json=fs.readFileSync(evidencePath,'utf8');const report=JSON.parse(json);
    assert.equal(report.selection,'evidence');assert.equal(report.scope.context_count,3);assert.equal(report.messages.length,2);
    assert.deepEqual(report.assessment.signals.find(s=>s.kind==='changed_fee_condition').evidence_ids,['m1','m3']);
    assert.ok(report.messages.every(m=>m.sender==='other'));
    for(const hidden of [token,original.snapshot.sessionId,original.snapshot.conversation.id,'fee-change:0','Dạ cho em xin lịch làm việc.'])assert.ok(!json.includes(hidden));
    assert.equal(await completed(),before);console.log('PASS: draft, actual evidence-only JSON download, temporary IDs, no metadata secrets and no extra analysis.');
    const dangerous='<script>globalThis.reportExecuted=true</script><img src="https://evil.example/track" onerror="alert(1)">';
    await demo.locator('#sender').selectOption('self');await demo.locator('#message').fill(dangerous);await demo.locator('#composer button').click();
    const until=Date.now()+20000;let state;while(Date.now()<until){state=await getState();if(state?.snapshot.messages.length===4&&state.result?.revision===state.snapshot.revision)break;await new Promise(r=>setTimeout(r,150));}
    assert.equal(state.snapshot.messages.length,4);assert.equal(state.result.revision,state.snapshot.revision);
    await panel.getByLabel('Nội dung báo cáo').selectOption('conversation');const all=await download();const allPath=path.join(temporary,'all.json');await all.saveAs(allPath);
    assert.equal(JSON.parse(fs.readFileSync(allPath,'utf8')).messages.length,4);
    await panel.getByLabel('Định dạng báo cáo').selectOption('html');const html=await download();const htmlPath=path.join(temporary,'report.html');await html.saveAs(htmlPath);
    const preview=await context.newPage();const requests=[];preview.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await preview.goto(pathToFileURL(htmlPath).href);
    assert.equal(await preview.locator('article').count(),4);assert.equal(await preview.locator('img,script').count(),0);
    assert.equal(await preview.evaluate(()=>globalThis.reportExecuted),undefined);assert.deepEqual(requests,[]);assert.ok((await preview.locator('body').innerText()).includes(dangerous));await preview.close();
    assert.ok(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    fs.mkdirSync(root+'/outputs',{recursive:true});await panel.screenshot({path:root+'/outputs/chatguard-session-report.png',fullPage:true});
    console.log('PASS: explicit full-buffer JSON/HTML, untrusted chat stays inert, no remote requests and 360px panel does not overflow.');
    // Hold one real poll response from the old session until after STOP completes.
    // Only the isolated test extension page is modified, never a user browser.
    await panel.evaluate(()=>{
      const original=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__reportSendOriginal=original;
      chrome.runtime.sendMessage=(...args)=>{
        const response=original(...args);
        if(args[0]?.type==='TAB_STATE'&&!globalThis.__reportPollHeld){
          globalThis.__reportPollHeld=true;
          return response.then(value=>new Promise(resolve=>{globalThis.__reportPollRelease=()=>resolve(value);}));
        }
        return response;
      };
    });
    await panel.waitForFunction(()=>typeof globalThis.__reportPollRelease==='function');
    await panel.getByRole('button',{name:'Tắt & xóa'}).click();
    const oldRequest={type:'EXPORT_SNAPSHOT',tabId:tab,sessionId:original.snapshot.sessionId,conversationId:original.snapshot.conversation.id};
    assert.ok((await panel.evaluate(message=>chrome.runtime.sendMessage(message),oldRequest)).error);
    await panel.locator('.session-archive').waitFor({state:'detached'});assert.ok(fs.existsSync(htmlPath));
    await panel.evaluate(()=>{globalThis.__reportPollRelease();chrome.runtime.sendMessage=globalThis.__reportSendOriginal;});
    await panel.waitForTimeout(200);assert.equal(await panel.locator('.session-archive').count(),0);
    await demo.goto('http://127.0.0.1:8000/demo/#friend');await demo.locator('#message').waitFor();await demo.bringToFront();
    await panel.getByRole('button',{name:'Kết nối tab đang mở'}).first().evaluate(b=>b.click());await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    assert.ok((await panel.evaluate(message=>chrome.runtime.sendMessage(message),oldRequest)).error);
    assert.deepEqual(errors,[]);console.log('PASS: stop clears draft, late poll cannot restore it, files remain user-managed, and old-session export is rejected after stop/change.');
  }finally{await context.close();assert.ok(path.resolve(temporary).startsWith(path.join(os.tmpdir(),'chatguard-reports-')));fs.rmSync(temporary,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
