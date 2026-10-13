import { browser } from 'wxt/browser';
import { API, DEFAULT_SETTINGS, type Assessment, type Settings, type Snapshot, type TabState } from '../lib/types';
import { isCurrent } from '../lib/scope';
import { GROQ_INTERVAL_MS, retryDelay, selectContext, validAssessment } from '../lib/analysis-policy';

export default defineBackground(() => {
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  const aborters = new Map<number, AbortController>();
  // Serialize state changes so a late response cannot overwrite a stop or newer revision.
  let pending:Promise<unknown> = Promise.resolve();
  function transaction<T>(operation:()=>Promise<T>):Promise<T> {
    const next = pending.then(operation);
    pending = next.catch(()=>undefined);
    return next;
  }
  const stateKey = (tab:number) => `tab:${tab}`;
  const getSettings = async ():Promise<Settings> => {
    const settings={...DEFAULT_SETTINGS, ...((await browser.storage.session.get('settings')).settings as Partial<Settings> | undefined)};
    // Provider changes revoke external consent, including settings saved by an older extension build.
    if (!['rules','groq'].includes(settings.provider)) {
      settings.provider='rules';settings.externalConsent=false;
      await browser.storage.session.set({settings});
    }
    return settings;
  };
  const getState = async (tab:number):Promise<TabState | undefined> => (await browser.storage.session.get(stateKey(tab)))[stateKey(tab)] as TabState | undefined;
  const putState = async (tab:number, value:TabState) => browser.storage.session.set({[stateKey(tab)]:value});
  const cancel = (tab:number) => {clearTimeout(timers.get(tab)); timers.delete(tab); aborters.get(tab)?.abort(); aborters.delete(tab);};
  async function health(token:string) {
    if(!token.trim()) throw new Error('Nhập token máy chủ trước.');
    let response:Response;
    try {response=await fetch(`${API}/api/health`,{headers:{'X-ChatGuard-Token':token.trim()},signal:AbortSignal.timeout(5000)});}
    catch {throw new Error('Không kết nối được backend. Chạy scripts/start-backend.ps1 rồi thử lại.');}
    if(!response.ok) throw new Error(response.status===401?'Token máy chủ không đúng.':'Backend chưa sẵn sàng.');
    const data=await response.json();
    if(data.status!=='ok'||typeof data.groq_configured!=='boolean') throw new Error('Phản hồi backend không hợp lệ.');
    return data;
  }
  function arm(tab:number,snapshot:Snapshot,due:number) {
    clearTimeout(timers.get(tab));
    timers.set(tab,setTimeout(()=>{timers.delete(tab);void analyze(tab,snapshot);},Math.max(0,due-Date.now())));
  }
  async function queue(tab:number,snapshot:Snapshot) {
    const settings=await getSettings();
    const cooldown=Number((await browser.storage.session.get('groqNextAt')).groqNextAt)||0;
    const due=Math.max(Date.now()+1800,settings.provider==='groq'?cooldown:0);
    await putState(tab,{snapshot,waitingUntil:due});arm(tab,snapshot,due);
  }
  function supported(url:string) {
    try {
      const u = new URL(url);
      return (u.origin === API && u.pathname.startsWith('/demo/')) ||
        (u.protocol === 'https:' && ['www.facebook.com','web.facebook.com','www.messenger.com','messenger.com'].includes(u.hostname));
    } catch {return false;}
  }
  async function readerInfo(tab:number) {
    const info=await browser.tabs.sendMessage(tab,{type:'GUARD_DESCRIBE'});
    if(info?.readerBuild!==browser.runtime.getManifest().version_name) {
      throw new Error('Bộ đọc trong tab khác bản extension. Tải lại Facebook rồi bấm biểu tượng ChatGuard và chọn lại người cần bảo vệ.');
    }
    return info;
  }
  async function analyze(tab:number, snapshot:Snapshot) {
    const context = {conversation_id:snapshot.conversation!.id, session_id:snapshot.sessionId, revision:snapshot.revision};
    const abort = new AbortController();
    const settings = await transaction(async()=>{
      const current = await getState(tab);
      if (!current || !isCurrent(current.snapshot,context)) return;
      const settings = await getSettings();
      if (!settings.token) {await putState(tab,{snapshot,error:'Nhập token máy chủ trong cấu hình trước khi phân tích.'});return;}
      if(settings.provider==='groq') {
        const next=Number((await browser.storage.session.get('groqNextAt')).groqNextAt)||0;
        if(next>Date.now()) {await putState(tab,{snapshot,waitingUntil:next});arm(tab,snapshot,next);return;}
        await browser.storage.session.set({groqNextAt:Date.now()+GROQ_INTERVAL_MS});
      }
      aborters.set(tab,abort);
      await putState(tab,{snapshot,analyzing:true,startedAt:Date.now()});
      return settings;
    });
    if (!settings || abort.signal.aborted) return;
    const messages=selectContext(snapshot.messages,settings.provider);
    let retryAt:number|undefined;
    try {
      const response = await fetch(`${API}/api/analyze`, {
        method:'POST', headers:{'Content-Type':'application/json','X-ChatGuard-Token':settings.token},
        body:JSON.stringify({...context,messages,history_limit:snapshot.historyLimit||100,provider:settings.provider,external_consent:settings.externalConsent}),
        signal:AbortSignal.any([abort.signal,AbortSignal.timeout(28000)]),
      });
      if (!response.ok) {
        if(response.status===429) {
          retryAt=Date.now()+retryDelay(response.headers.get('Retry-After'));
          if(settings.provider==='groq') await browser.storage.session.set({groqNextAt:retryAt});
        }
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Máy chủ trả lỗi ${response.status}.`);
      }
      const result = await response.json() as Assessment;
      if(!validAssessment(result,messages,settings.provider)) throw new Error('Kết quả không có cấu trúc hoặc bằng chứng hợp lệ. Chưa có đánh giá mới.');
      if(!isCurrent(snapshot,result)) throw new Error('Kết quả không khớp phiên phân tích. Bấm thử lại.');
      await transaction(async()=>{
        const latest = await getState(tab);
        if (!abort.signal.aborted && latest && isCurrent(latest.snapshot,result)) await putState(tab,{snapshot:latest.snapshot,result,completedAt:Date.now()});
      });
    } catch (error) {
      await transaction(async()=>{
        const latest = await getState(tab);
        if (!abort.signal.aborted && latest && isCurrent(latest.snapshot,context)) {
          await putState(tab,{snapshot:latest.snapshot,retryAt,error:error instanceof Error ? error.message : 'Không kết nối được máy chủ.'});
        }
      });
    } finally {if (aborters.get(tab) === abort) aborters.delete(tab);}
  }
  async function handle(message:any, sender:any) {
    if (message?.type === 'GUARD_STATE') {
      const tab = sender.tab?.id;
      if (typeof tab !== 'number' || !supported(sender.tab.url || '') || !(await browser.storage.session.get(`attached:${tab}`))[`attached:${tab}`]) return;
      const snapshot = message.snapshot as Snapshot;
      if (!snapshot || !Array.isArray(snapshot.messages) || snapshot.messages.length > 300) return;
      const previous = await getState(tab);
      if (snapshot.status === 'watching' && previous?.snapshot.sessionId === snapshot.sessionId && previous.snapshot.revision > snapshot.revision) return;
      if(previous&&snapshot.status==='watching'&&previous.snapshot.sessionId===snapshot.sessionId&&previous.snapshot.revision===snapshot.revision) {
        if(snapshot.availability==='waiting'){cancel(tab);await putState(tab,{snapshot,result:previous.result,completedAt:previous.completedAt});}
        else if(previous.snapshot.availability==='waiting'&&!previous.result&&snapshot.messages.length)await queue(tab,snapshot);
        else await putState(tab,{...previous,snapshot});
        return {ok:true};
      }
      cancel(tab);
      await putState(tab,{snapshot});
      if (snapshot.status === 'watching' && snapshot.availability!=='waiting' && snapshot.messages.length) {
        await queue(tab,snapshot);
      }
      return {ok:true};
    }
    // Control commands only from our own extension pages, never content scripts or websites.
    if (!sender.url?.startsWith(browser.runtime.getURL('/'))) return;
    if (message?.type === 'SETTINGS_GET') return getSettings();
    if (message?.type === 'PANEL_CONTEXT') return {tabId:(await browser.storage.session.get('selectedTab')).selectedTab};
    if (message?.type === 'HEALTH') return health(String(message.token||''));
    if (message?.type === 'SETTINGS_SAVE') {
      const s = message.settings as Settings;
      if (!s || typeof s.token !== 'string' || s.token.length > 200 || !['rules','groq'].includes(s.provider)) throw new Error('Cấu hình không hợp lệ.');
      for (const tab of timers.keys()) cancel(tab);
      for (const tab of aborters.keys()) cancel(tab);
      // Changing provider/consent stops all sessions; the next start requires an explicit action.
      const stored = await browser.storage.session.get(null);
      for (const key of Object.keys(stored).filter(k=>k.startsWith('tab:'))) {
        const tab=Number(key.slice(4));
        try {await browser.tabs.sendMessage(tab,{type:'GUARD_STOP'});} catch {}
        await browser.storage.session.remove(key);
      }
      await browser.storage.session.set({settings:{token:s.token.trim(),provider:s.provider,externalConsent:!!s.externalConsent,facebookEnabled:!!s.facebookEnabled}});
      return {ok:true};
    }
    if (message?.type === 'ATTACH') {
      const tab=Number.isInteger(message.activeTabId)?await browser.tabs.get(message.activeTabId):(await browser.tabs.query({active:true,currentWindow:true}))[0];
      if (!tab?.id || !supported(tab.url || '')) return {error:'Mở http://127.0.0.1:8000/demo/#ctv hoặc một cuộc Facebook web.'};
      const stored=await browser.storage.session.get(null);
      for(const key of Object.keys(stored).filter(key=>key.startsWith('tab:')&&key!==stateKey(tab.id!))) {
        const old=Number(key.slice(4));cancel(old);
        try {await browser.tabs.sendMessage(old,{type:'GUARD_STOP'});} catch {}
        await browser.storage.session.remove([key,`attached:${old}`,`attachedUrl:${old}`]);
      }
      await browser.storage.session.set({selectedTab:tab.id});
      cancel(tab.id);await browser.storage.session.remove(stateKey(tab.id));
      await browser.storage.session.set({[`attached:${tab.id}`]:true,[`attachedUrl:${tab.id}`]:tab.url});
      await browser.scripting.executeScript({target:{tabId:tab.id},files:['/content-scripts/guard.js']});
      const info = await readerInfo(tab.id);
      return {tabId:tab.id,...info};
    }
    const tab = Number(message?.tabId);
    if (!Number.isInteger(tab) || tab < 0 || !(await browser.storage.session.get(`attached:${tab}`))[`attached:${tab}`]) return {disconnected:true,error:'Tab đã đóng hoặc tải lại. Bấm kết nối lại.'};
    if (message.type === 'TAB_STATE') {
      let state=await getState(tab);
      if(state?.snapshot.status==='watching') {
        if(state.analyzing&&Date.now()-(state.startedAt||0)>35000) {
          cancel(tab);state={snapshot:state.snapshot,error:'Lượt phân tích bị gián đoạn. Bấm thử lại để tiếp tục.'};await putState(tab,state);
        } else if(state.waitingUntil&&!timers.has(tab)) arm(tab,state.snapshot,state.waitingUntil);
      }
      return {state};
    }
    if (message.type === 'DESCRIBE') return readerInfo(tab);
    if (message.type === 'START') {
      await readerInfo(tab);
      const s=await getSettings();
      if (!s.token) return {error:'Nhập và lưu token máy chủ trước.'};
      if (s.provider === 'groq' && !s.externalConsent) return {error:'Chưa đồng ý gửi ngữ cảnh tới Groq.'};
      const ready=await health(s.token);
      if(s.provider==='groq'&&!ready.groq_configured) return {error:'Groq chưa được cấu hình hợp lệ; điền GROQ_API_KEY rồi khởi động lại backend.'};
      return browser.tabs.sendMessage(tab,{type:'GUARD_START',allowFacebook:s.facebookEnabled,conversationId:message.conversationId,historyLimit:message.historyLimit===300?300:100});
    }
    if (message.type === 'STOP') {cancel(tab); await browser.storage.session.remove(stateKey(tab)); return browser.tabs.sendMessage(tab,{type:'GUARD_STOP'});}
    if (message.type === 'RETRY') {
      const state = await getState(tab);
      if(state?.retryAt&&state.retryAt>Date.now()) return {error:'Đang chờ hết hạn mức. Thử lại sau thời gian hiển thị.'};
      if (state?.snapshot.status === 'watching' && state.snapshot.messages.length) {cancel(tab);await queue(tab,state.snapshot);}
      return {ok:true};
    }
    if(message.type==='FOCUS') return browser.tabs.sendMessage(tab,{type:'GUARD_FOCUS',id:String(message.id||'')});
    if(message.type==='HISTORY') return browser.tabs.sendMessage(tab,{type:'GUARD_HISTORY'});
  }
  browser.runtime.onMessage.addListener((message,sender) => transaction(()=>handle(message,sender)).catch(error => ({error:error instanceof Error ? error.message : 'Không thực hiện được. Tải lại tab, kết nối lại hoặc kiểm tra máy chủ.'})));
  browser.action.onClicked.addListener(tab => {if(tab.id){void browser.sidePanel.open({tabId:tab.id});void transaction(()=>handle({type:'ATTACH',activeTabId:tab.id},{url:browser.runtime.getURL('/sidepanel.html')})).catch(()=>{});}});
  browser.tabs.onRemoved.addListener(tab => {void transaction(async()=>{cancel(tab);await browser.storage.session.remove([stateKey(tab),`attached:${tab}`,`attachedUrl:${tab}`]);});});
  browser.tabs.onUpdated.addListener((tab,change,info) => {
    if (change.status !== 'loading') return;
    void transaction(async()=>{
      const key=`attachedUrl:${tab}`;
      const oldUrl=(await browser.storage.session.get(key))[key] as string | undefined;
      const nextUrl=change.url || info.url;
      // Chrome reports a loading event for hash changes too. The content script pauses these sessions.
      if (oldUrl && nextUrl && oldUrl !== nextUrl && oldUrl.split('#')[0] === nextUrl.split('#')[0]) {
        await browser.storage.session.set({[key]:nextUrl});return;
      }
      cancel(tab);await browser.storage.session.remove([stateKey(tab),`attached:${tab}`,key]);
    });
  });
});
