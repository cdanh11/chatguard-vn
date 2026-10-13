const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname,'../../../..');
const extension = root+'/apps/extension/.output/chrome-mv3';
const token = fs.readFileSync(root+'/apps/api/.env','utf8').match(/^CHATGUARD_API_TOKEN=(.*)$/m)[1].trim();
(async()=>{
  console.log('Launching isolated Chromium');
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chatguard-smoke-'));
  const context = await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,
    executablePath:process.env.CHROMIUM_EXECUTABLE,
    ignoreDefaultArgs:['--disable-extensions'],
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:1440,height:1000}});
  const errors=[];
  try {
    context.setDefaultTimeout(20000);
    console.log('Browser started; waiting for extension worker');
    let worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker',{timeout:20000});
    const id=new URL(worker.url()).host;
    console.log('Extension loaded');
    const demo=await context.newPage();
    demo.on('pageerror',e=>errors.push(e.message));
    await demo.goto('http://127.0.0.1:8000/demo/#ctv');
    await demo.locator('#cases button').first().waitFor();
    const panel=await context.newPage();
    panel.on('pageerror',e=>errors.push(e.message));
    await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    console.log('Demo and panel loaded');
    await panel.getByLabel('Token máy chủ local').fill(token);
    await panel.getByRole('button',{name:'Kiểm tra kết nối'}).click();
    await panel.getByRole('status').filter({hasText:'Backend sẵn sàng'}).waitFor();
    await panel.getByRole('button',{name:'Lưu cấu hình'}).click();
    await demo.bringToFront();
    // Evaluating the click keeps the conversation tab active, as in a real side panel.
    await panel.getByRole('button',{name:'Kết nối tab đang mở'}).evaluate(b=>b.click());
    await panel.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Bật bảo vệ cuộc này'&&!b.disabled));
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await panel.getByText('Đang bảo vệ',{exact:true}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);
    await demo.locator('#all').click();
    await panel.getByRole('heading',{name:'Có dấu hiệu đáng lo'}).waitFor({timeout:15000});
    assert.ok(await panel.locator('blockquote').count()>0);
    await panel.locator('details.evidence > summary').click();
    await panel.getByRole('button',{name:'Xem tin này'}).first().evaluate(b=>b.click());
    await panel.reload();
    await panel.getByRole('heading',{name:'Có dấu hiệu đáng lo'}).waitFor();
    console.log('PASS: backend readiness, evidence navigation and panel restoration');
    await panel.setViewportSize({width:420,height:1000});
    fs.mkdirSync(path.join(root,'outputs'),{recursive:true});
    await panel.screenshot({path:path.join(root,'outputs/chatguard-panel.png'),fullPage:true});
    await demo.screenshot({path:path.join(root,'outputs/chatguard-demo.png'),fullPage:true});
    console.log('PASS: consent/start -> scoped messages -> API -> evidence warning');
    await demo.locator('nav button[data-id="friend"]').click();
    await panel.getByText('Chưa bật',{exact:true}).waitFor();
    await panel.getByText('0 tin trong ngữ cảnh',{exact:true}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);
    await demo.locator('#all').click();
    await panel.getByText('0 tin trong ngữ cảnh',{exact:true}).waitFor();
    await demo.locator('nav button[data-id="ctv"]').click();
    await panel.getByText('0 tin trong ngữ cảnh',{exact:true}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);
    await demo.locator('nav button[data-id="friend"]').click();
    await panel.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Bật bảo vệ cuộc này'&&!b.disabled));
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await panel.getByRole('heading',{name:'Chưa thấy dấu hiệu rõ'}).waitFor({timeout:15000});
    console.log('PASS: switch -> pause/clear -> explicit restart -> normal chat');
    await panel.getByRole('button',{name:'Tắt & xóa'}).evaluate(b=>b.click());
    await panel.getByText('0 tin trong ngữ cảnh',{exact:true}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: stop clears evidence; no page errors');
    await demo.locator('#import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"name":"Bad","messages":[{"sender":"bad","text":"test"}]}')});
    await demo.getByRole('status').filter({hasText:'Không nhập được'}).waitFor();
    await demo.locator('#import-file').setInputFiles({name:'scenario.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({name:'Ca nhập từ nhóm',messages:[{sender:'other',text:'Đọc mã OTP để nhận quà'}]}))});
    await demo.getByRole('heading',{name:'Ca nhập từ nhóm'}).waitFor();
    await panel.waitForFunction(()=>document.querySelector('.scope h2')?.textContent==='Ca nhập từ nhóm');
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await demo.locator('#all').click();
    await panel.getByRole('heading',{name:'Có dấu hiệu đáng lo'}).waitFor();
    await demo.locator('#reset').click();
    await panel.getByText('Chưa bật',{exact:true}).waitFor();
    await panel.getByText('0 tin trong ngữ cảnh',{exact:true}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);
    console.log('PASS: invalid import rejected; valid import analyzed; reset stops and clears');
    const config=panel.locator('details.config');
    await panel.getByRole('button',{name:'Cấu hình',exact:true}).click();
    await panel.getByLabel(/^Bộ phân tích/).selectOption('groq');
    const consent=panel.getByRole('checkbox',{name:/Tôi đồng ý/});
    assert.equal(await consent.isChecked(),false);
    await panel.getByRole('button',{name:'Lưu cấu hình'}).click();
    await panel.waitForFunction(()=>!document.querySelector('details.config'));
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await panel.getByRole('alert').filter({hasText:'Chưa đồng ý gửi ngữ cảnh tới Groq.'}).waitFor();
    console.log('PASS: Groq requires explicit consent');
    const env=fs.readFileSync(root+'/apps/api/.env','utf8');
    const configured=!!env.match(/^GROQ_API_KEY=[ \t]*[^\s\r\n]+/m);
    if(!configured) {
      await panel.getByRole('button',{name:'Cấu hình',exact:true}).click();
      await consent.check();
      await panel.getByRole('button',{name:'Lưu cấu hình'}).click();
      await panel.waitForFunction(()=>!document.querySelector('details.config'));
      await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
      await panel.getByRole('alert').filter({hasText:'Groq chưa được cấu hình hợp lệ'}).waitFor({timeout:15000});
      assert.equal(await panel.locator('.assessment').count(),0);
      console.log('PASS: missing Groq key shows error, never a rules/AI assessment');
    }
    // Simulate transport failures inside the isolated test worker; no real Groq calls.
    await worker.evaluate(()=>{
      const original=globalThis.fetch;
      globalThis.testMode='ok';globalThis.testRequests=[];
      globalThis.fetch=async(input,init)=>{
        const url=String(input);
        if(url.endsWith('/api/health')){if(globalThis.testMode==='offline')throw new TypeError('Simulated network failure');return new Response(JSON.stringify({status:'ok',groq_configured:true}),{status:200});}
        if(!url.endsWith('/api/analyze'))return original(input,init);
        const req=JSON.parse(init.body);globalThis.testRequests.push(req);
        const mode=globalThis.testMode;
        if(mode==='quota')return new Response(JSON.stringify({detail:'Hết quota thử nghiệm'}),{status:429,headers:{'Retry-After':'2'}});
        if(mode==='slow')await new Promise(resolve=>setTimeout(resolve,4000));
        const evidence=req.messages.find(m=>m.sender==='other');
        const result={...req,level:'high_concern',summary:'Kết quả mô phỏng để kiểm tra luồng',provider:'groq',analyzed_count:req.messages.length,signals:[{kind:'credential',title:'Yêu cầu mã truy cập',evidence_ids:[mode==='invalid'?'outside-scope':evidence.id]}],actions:[],limitations:['Kết quả mô phỏng mạng, không đo chất lượng AI.']};
        return new Response(JSON.stringify(result),{status:200});
      };
    });
    await panel.getByRole('button',{name:'Cấu hình',exact:true}).click();
    await consent.check();
    await panel.getByRole('button',{name:'Lưu cấu hình'}).click();
    await panel.waitForFunction(()=>!document.querySelector('details.config'));
    await demo.locator('#all').click();
    await worker.evaluate(async()=>{globalThis.testMode='quota';await chrome.storage.session.set({groqNextAt:0});});
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await panel.getByRole('alert').filter({hasText:'Hết quota thử nghiệm'}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);
    await worker.evaluate(()=>{globalThis.testMode='invalid';});
    await panel.getByRole('button',{name:'Thử phân tích lại'}).waitFor({state:'visible'});
    await panel.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Thử phân tích lại').disabled);
    await panel.getByRole('button',{name:'Thử phân tích lại'}).evaluate(b=>b.click());
    await panel.getByRole('alert').filter({hasText:'bằng chứng hợp lệ'}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);
    await worker.evaluate(async()=>{globalThis.testMode='slow';await chrome.storage.session.set({groqNextAt:0});});
    await panel.getByRole('button',{name:'Thử phân tích lại'}).evaluate(b=>b.click());
    await panel.getByText('Đang kiểm tra ngữ cảnh…',{exact:true}).waitFor();
    await panel.getByRole('button',{name:'Tắt & xóa'}).evaluate(b=>b.click());
    // Delayed fake fetch deliberately ignores AbortSignal to test the session/revision barrier.
    await panel.waitForTimeout(4500);
    assert.equal(await panel.locator('.assessment').count(),0);
    await worker.evaluate(async()=>{globalThis.testMode='ok';await chrome.storage.session.set({groqNextAt:0});});
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await panel.getByRole('heading',{name:'Có dấu hiệu đáng lo'}).waitFor();
    assert.equal(await panel.locator('.assessment .badge').innerText(),'Groq API');
    await demo.locator('#message').fill('Tin mới để kiểm tra gộp lượt');await demo.locator('#composer button').click();
    await panel.getByRole('status').filter({hasText:'Chờ phân tích'}).waitFor();
    await panel.getByRole('heading',{name:'Có dấu hiệu đáng lo'}).waitFor();
    await panel.getByText('Đang cập nhật tin mới. Đây là đánh giá từ phần đã phân tích trước đó.',{exact:true}).waitFor();
    const count=await worker.evaluate(()=>globalThis.testRequests.length);
    await panel.waitForTimeout(2200);
    assert.equal(await worker.evaluate(()=>globalThis.testRequests.length),count);
    // A retained warning cannot quote newly edited text as if it were the analyzed evidence.
    await demo.locator('[data-chatguard-thread] [data-chatguard-message]').first().evaluate(el=>{el.textContent='Tin đã sửa: cần đánh giá lại nội dung này.';});
    await panel.waitForFunction(()=>!document.querySelector('.assessment'));
    const previousTab=await worker.evaluate(async()=>(await chrome.storage.session.get('selectedTab')).selectedTab);
    const secondDemo=await context.newPage();secondDemo.on('pageerror',e=>errors.push(e.message));
    await secondDemo.goto('http://127.0.0.1:8000/demo/#friend');await secondDemo.locator('#cases button').first().waitFor();
    await secondDemo.bringToFront();await panel.locator('details.conversation-options > summary').click();await panel.getByRole('button',{name:'Kết nối tab đang mở'}).evaluate(b=>b.click());
    await panel.waitForFunction(()=>document.querySelector('.scope h2')?.textContent==='Minh · bạn học giả lập');
    const old=await worker.evaluate(async tab=>chrome.tabs.sendMessage(tab,{type:'GUARD_DESCRIBE'}),previousTab);
    assert.equal(old.snapshot.status,'paused');assert.equal(old.snapshot.messages.length,0);
    assert.equal(await worker.evaluate(async()=>Object.keys(await chrome.storage.session.get(null)).filter(k=>k.startsWith('tab:')).length),0);
    await worker.evaluate(async()=>{await chrome.storage.session.set({groqNextAt:0});});
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await secondDemo.locator('#all').click();await panel.getByRole('heading',{name:'Có dấu hiệu đáng lo'}).waitFor();
    await panel.getByRole('button',{name:'Tắt & xóa'}).evaluate(b=>b.click());
    await panel.getByText('Chưa bật',{exact:true}).waitFor();
    await worker.evaluate(()=>{globalThis.testMode='offline';});
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());
    await panel.getByRole('alert').filter({hasText:'Không kết nối được backend'}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: quota cooldown/retry, invalid evidence rejection, stale result discarded, Groq result and request coalescing (simulated transport)');
    console.log('PASS: selecting a second tab stops and clears the first; offline backend blocks protection');
  } catch(e) {
    for (const p of context.pages()) if(p.url().includes('sidepanel')) console.log('Panel at failure:',await p.locator('body').innerText());
    throw e;
  } finally {await context.close();assert.ok(path.resolve(profile).startsWith(path.join(os.tmpdir(),'chatguard-smoke-')));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});


