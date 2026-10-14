const {chromium}=require('playwright');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..');
const token=fs.readFileSync(root+'/apps/api/.env','utf8').match(/^CHATGUARD_API_TOKEN=(.*)$/m)[1].trim();
(async()=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'chatguard-recruitment-'));
  const extension=root+'/apps/extension/.output/chrome-mv3';
  const context=await chromium.launchPersistentContext(temporary,{channel:'chromium',headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-extensions'],args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:360,height:800}});
  try{
    context.setDefaultTimeout(20000);
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
    const panel=await context.newPage();const errors=[];panel.on('pageerror',e=>errors.push(e.message));await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    await panel.getByLabel('Token máy chủ local').fill(token);await panel.getByRole('button',{name:'Lưu cấu hình'}).click();
    const demo=await context.newPage();
    for(const [scenario,heading] of [['fee-change','Cần kiểm chứng'],['physical-control','Có dấu hiệu đáng lo'],['normal-interview','Chưa thấy dấu hiệu rõ']]){
      await demo.goto(`http://127.0.0.1:8000/demo/#${scenario}`);await demo.locator('#all').click();await demo.bringToFront();
      await panel.getByRole('button',{name:'Kết nối tab đang mở'}).first().evaluate(b=>b.click());
      await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
      await panel.getByRole('heading',{name:heading,exact:true}).waitFor();
      const state=await worker.evaluate(async()=>{const tab=(await chrome.storage.session.get('selectedTab')).selectedTab;return (await chrome.storage.session.get(`tab:${tab}`))[`tab:${tab}`];});
      if(scenario==='fee-change'){
        const pair=state.result.signals.find(s=>s.kind==='changed_fee_condition');assert.deepEqual(pair.evidence_ids,['fee-change:0','fee-change:2']);
        await panel.locator('details.evidence > summary').click();
        assert.ok((await panel.locator('blockquote').allTextContents()).some(t=>t.includes('không thu bất kỳ khoản phí')));
        assert.ok((await panel.locator('blockquote').allTextContents()).some(t=>t.includes('phí kích hoạt 300k')));
      }
      if(scenario==='physical-control')assert.ok((await panel.locator('.next-step').innerText()).includes('không tiếp tục hỏi thử'));
      if(scenario==='normal-interview')assert.equal(state.result.signals.length,0);
      console.log(`PASS: ${scenario}, actual local API result and panel evidence/actions.`);
      await panel.getByRole('button',{name:'Tắt & xóa'}).click();
    }
    assert.deepEqual(errors,[]);
  }finally{await context.close();assert.ok(path.resolve(temporary).startsWith(path.join(os.tmpdir(),'chatguard-recruitment-')));fs.rmSync(temporary,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
