const {chromium}=require('playwright');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..');
const token=fs.readFileSync(root+'/apps/api/.env','utf8').match(/^CHATGUARD_API_TOKEN=(.*)$/m)[1].trim();
// Synthetic DOM fixture mirrors observed semantic attributes, never real names, IDs or private history.
const fixture=`<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body><h1>Facebook popup fixture · synthetic</h1><div id="threads"></div><button id="reopen">Mở lại A</button><button id="addA">Thêm tin A</button><button id="addB">Thêm tin B</button><button id="lazyA">Lịch sử tải từng phần A</button><script>
function popup(id,name,count){const root=document.createElement('section');root.id='peer'+id;root.innerHTML='<a href="/'+id+'/" aria-label="'+name+'"></a><button role="button" aria-label="Cài đặt đoạn chat"><h2>'+name+'</h2></button><button aria-label="Đóng '+name+'">Đóng</button><div role="log" aria-label="Tin nhắn trong cuộc trò chuyện với '+name+'" style="height:160px;overflow:auto"></div><div role="textbox" contenteditable="true" aria-label="Viết cho '+name+'"></div>';root.querySelector('button[aria-label^="Đóng"]').onclick=()=>root.remove();document.querySelector('#threads').append(root);for(let i=0;i<count;i++)append(id,i,i===count-1?'e ck 300k kích hoạt tk, làm nhiệm vụ hoa hồng, chuyển ngay rồi hoàn lại':'Tin '+i);return root;}
function append(id,i,text){const log=document.querySelector('#peer'+id+' [role="log"]');const article=document.createElement('div');article.setAttribute('role','article');const row=document.createElement('div');row.dataset.messageId=id+'@msgr.'+i;row.setAttribute('aria-label','Lúc 22:22, Người gửi: '+text);const span=document.createElement('span');span.dir='auto';span.textContent=text;row.append(span);article.append(row);log.append(article);}
popup(1001,'A',320);for(let i=2;i<=5;i++)popup(1000+i,String.fromCharCode(64+i),2);
document.querySelector('#reopen').onclick=()=>{if(!document.querySelector('#peer1001'))popup(1001,'A',320);};document.querySelector('#addA').onclick=()=>append(1001,320,'Đọc mã OTP để nhận quà');document.querySelector('#addB').onclick=()=>append(1002,99,'PRIVATE B do not read');
document.querySelector('#lazyA').onclick=()=>{const log=document.querySelector('#peer1001 [role="log"]');log.replaceChildren();let start=290,busy=false;for(let i=start;i<320;i++)append(1001,i,'Lịch sử A '+i);log.scrollTop=log.scrollHeight;log.onscroll=()=>{if(log.scrollTop>1||busy||start===0)return;busy=true;setTimeout(()=>{const end=start;start=Math.max(0,start-30);for(let i=end-1;i>=start;i--){append(1001,i,'Lịch sử A '+i);log.insertBefore(log.lastElementChild,log.firstElementChild);}log.scrollTop=200;busy=false;},100);};};
</script></body></html>`;
(async()=>{
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'chatguard-facebook-'));
  const fixtureExtension=path.join(profile,'fixture-extension');fs.cpSync(root+'/apps/extension/.output/chrome-mv3',fixtureExtension,{recursive:true});
  // Headless page clicks cannot grant activeTab via the real toolbar. Simulate that grant ONLY in
  // this disposable build/profile. All Facebook requests are fulfilled with the synthetic fixture.
  const manifest=JSON.parse(fs.readFileSync(path.join(fixtureExtension,'manifest.json'),'utf8'));manifest.host_permissions.push('https://www.facebook.com/*');fs.writeFileSync(path.join(fixtureExtension,'manifest.json'),JSON.stringify(manifest));
  const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-extensions'],args:[`--disable-extensions-except=${fixtureExtension}`,`--load-extension=${fixtureExtension}`]});
  const errors=[];
  let worker;
  try{
    context.setDefaultTimeout(20000);
    // Fulfill locally: this test does not contact Facebook or any real account.
    await context.route('https://www.facebook.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:fixture}));
    worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
    const chat=await context.newPage();chat.on('pageerror',e=>errors.push(e.message));await chat.goto('https://www.facebook.com/');
    const panel=await context.newPage();panel.on('pageerror',e=>errors.push(e.message));await panel.goto('chrome-extension://'+id+'/sidepanel.html');
    await panel.getByLabel('Token máy chủ local').fill(token);await panel.getByRole('checkbox',{name:/Bật bộ đọc Facebook/}).check();await panel.getByRole('button',{name:'Lưu cấu hình'}).click();
    await chat.bringToFront();await panel.getByRole('button',{name:'Kết nối tab đang mở'}).evaluate(b=>b.click());
    await panel.waitForFunction(()=>document.querySelector('[aria-label="Đối tượng theo dõi"]')?.options.length===6);
    // Reinjecting must retire the old listener; a stale idle reader must not answer START.
    await panel.getByRole('button',{name:'Kết nối tab đang mở'}).evaluate(b=>b.click());
    await panel.waitForFunction(()=>document.querySelector('[aria-label="Đối tượng theo dõi"]')?.options.length===6);
    assert.equal(await worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).filter(v=>v?.snapshot?.messages?.length).length),0);
    await panel.getByLabel('Đối tượng theo dõi',{exact:true}).selectOption('facebook:1001');await panel.getByLabel('Giới hạn lịch sử').selectOption('300');
    await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());await panel.getByText('300 tin trong ngữ cảnh',{exact:true}).waitFor();
    await panel.getByRole('heading',{name:'Có dấu hiệu đáng lo'}).waitFor();
    await panel.reload();await panel.getByText('300 tin trong ngữ cảnh',{exact:true}).waitFor();
    assert.equal(await panel.getByLabel('Giới hạn lịch sử').inputValue(),'300');
    let state=await worker.evaluate(async()=>{const s=await chrome.storage.session.get(null);return Object.values(s).find(v=>v?.snapshot)?.snapshot;});
    assert.equal(state.messages.length,300);assert.ok(state.messages.every(m=>m.id.startsWith('fb:1001@msgr.')));assert.equal(state.messages[0].id,'fb:1001@msgr.20');
    const sessionBeforeReattach=state.sessionId;
    await panel.getByRole('button',{name:'Kết nối tab đang mở'}).evaluate(b=>b.click());
    await panel.getByText('300 tin trong ngữ cảnh',{exact:true}).waitFor();
    state=await worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).find(v=>v?.snapshot)?.snapshot);
    assert.equal(state.sessionId,sessionBeforeReattach);assert.equal(state.conversation.id,'facebook:1001');
    await panel.getByRole('button',{name:'Xem tin này'}).first().evaluate(b=>b.click());
    await chat.locator('#addB').click();await panel.waitForTimeout(1400);
    state=await worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).find(v=>v?.snapshot)?.snapshot);
    assert.ok(!JSON.stringify(state).includes('PRIVATE B'));assert.equal(state.messages.length,300);
    await chat.getByRole('button',{name:'Đóng A',exact:true}).click();await panel.getByText('Giữ lựa chọn · chờ tin',{exact:true}).waitFor();
    await panel.getByRole('button',{name:'Kết nối tab đang mở'}).evaluate(b=>b.click());
    await panel.getByText('Giữ lựa chọn · chờ tin',{exact:true}).waitFor();
    assert.equal(await panel.getByLabel('Đối tượng theo dõi',{exact:true}).inputValue(),'facebook:1001');
    await chat.locator('#addB').click();await panel.waitForTimeout(1200);
    state=await worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).find(v=>v?.snapshot)?.snapshot);
    assert.equal(state.conversation.id,'facebook:1001');assert.equal(state.status,'watching');assert.equal(state.availability,'waiting');assert.ok(!JSON.stringify(state).includes('PRIVATE B'));
    await chat.locator('#reopen').click();await panel.getByText('Đang bảo vệ',{exact:true}).waitFor();await chat.locator('#addA').click();
    await panel.waitForFunction(()=>Array.from(document.querySelectorAll('blockquote')).some(n=>n.textContent.includes('Đọc mã OTP')));
    state=await worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).find(v=>v?.snapshot)?.snapshot);assert.equal(state.messages.length,300);assert.equal(state.messages.at(-1).id,'fb:1001@msgr.320');
    await panel.getByRole('button',{name:'Nạp lịch sử của người đã chọn'}).evaluate(b=>b.click());await panel.getByText(/Đã giữ 300\/300 tin văn bản/).waitFor();
    await panel.getByRole('button',{name:'Tắt & xóa'}).evaluate(b=>b.click());await panel.getByText('0 tin trong ngữ cảnh',{exact:true}).waitFor();
    await chat.locator('#lazyA').click();await panel.getByRole('button',{name:'Bật bảo vệ cuộc này'}).evaluate(b=>b.click());await panel.getByText('30 tin trong ngữ cảnh',{exact:true}).waitFor();
    await panel.getByRole('button',{name:'Nạp lịch sử của người đã chọn'}).evaluate(b=>b.click());await panel.getByText(/Đã giữ 300\/300 tin văn bản/).waitFor();
    state=await worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).find(v=>v?.snapshot)?.snapshot);assert.equal(state.messages[0].id,'fb:1001@msgr.20');assert.equal(state.messages.at(-1).id,'fb:1001@msgr.319');assert.equal(state.messages.length,300);
    await panel.getByRole('button',{name:'Tắt & xóa'}).evaluate(b=>b.click());await panel.getByText('0 tin trong ngữ cảnh',{exact:true}).waitFor();
    assert.equal(await panel.locator('.assessment').count(),0);assert.deepEqual(errors,[]);
    console.log('PASS: discover 5 headers without collection; select only A; last 300; API/evidence; ignore B; close keeps A; remount resumes; lazy history 30 -> 300 in order; history/stop clears. Synthetic DOM fixture.');
  }catch(e){console.log('Page errors:',errors);for(const p of context.pages()){if(p.url().includes('sidepanel'))console.log(await p.locator('body').innerText());if(p.url().includes('facebook'))console.log('Fixture metadata:',await p.evaluate(()=>({logs:document.querySelectorAll('[role="log"]').length,headers:Array.from(document.querySelectorAll('h2')).map(h=>h.textContent),links:Array.from(document.querySelectorAll('a')).map(a=>({href:a.getAttribute('href'),label:a.getAttribute('aria-label')}))})));}console.log('Session keys:',await worker?.evaluate(async()=>Object.keys(await chrome.storage.session.get(null))));throw e;}
  finally{await context.close();assert.ok(path.resolve(profile).startsWith(path.join(os.tmpdir(),'chatguard-facebook-')));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
