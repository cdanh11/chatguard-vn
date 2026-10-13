import { browser } from 'wxt/browser';
import { API, DEFAULT_SETTINGS, type Assessment, type Settings, type Snapshot, type TabState } from '../lib/types';
import { isCurrent } from '../lib/scope';
import { GROQ_INTERVAL_MS, retryDelay, selectContext, validAssessment } from '../lib/analysis-policy';
import {changedIds,indicatorFor,nextAnalysisAt,priorityChange} from '../lib/monitoring';

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
  const alarmKey = (tab:number) => `chatguard:analyze:${tab}`;
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
  async function updateIndicator(tab:number,state?:TabState) {
    const indicator=indicatorFor(state);
    await Promise.allSettled([
      browser.action.setBadgeText({tabId:tab,text:indicator.text}),
      browser.action.setBadgeBackgroundColor({tabId:tab,color:indicator.color}),
      browser.action.setTitle({tabId:tab,title:indicator.label}),
      browser.tabs.sendMessage(tab,{type:'GUARD_STATUS',sessionId:state?.snapshot.sessionId,conversationId:state?.snapshot.conversation?.id,indicator}),
    ]);
  }
  const putState = async (tab:number, value:TabState) => {await browser.storage.session.set({[stateKey(tab)]:value});await updateIndicator(tab,value);};
  const cancel = async (tab:number) => {clearTimeout(timers.get(tab)); timers.delete(tab); aborters.get(tab)?.abort(); aborters.delete(tab);await browser.alarms.clear(alarmKey(tab));};
  async function removeState(tab:number) {await cancel(tab);await browser.storage.session.remove(stateKey(tab));await updateIndicator(tab);}
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
  async function fire(tab:number) {
    const snapshot=await transaction(async()=>{
      const state=await getState(tab);
      if(!state||state.snapshot.status!=='watching'||state.snapshot.availability==='waiting'||!state.waitingUntil){await browser.alarms.clear(alarmKey(tab));return;}
      if(state.waitingUntil>Date.now()+50){await arm(tab,state.waitingUntil);return;}
      clearTimeout(timers.get(tab));timers.delete(tab);await browser.alarms.clear(alarmKey(tab));return state.snapshot;
    });
    if(snapshot)await analyze(tab,snapshot);
  }
  async function arm(tab:number,due:number) {
    clearTimeout(timers.get(tab));
    // Timers are responsive while awake; the persisted alarm survives worker suspension.
    await browser.alarms.create(alarmKey(tab),{when:Math.max(Date.now()+30000,due)});
    timers.set(tab,setTimeout(()=>{timers.delete(tab);void fire(tab);},Math.max(0,due-Date.now())));
  }
  async function queue(tab:number,snapshot:Snapshot,previous?:TabState) {
    const settings=await getSettings();
    const cooldownKey=settings.provider==='groq'?'groqNextAt':'rulesNextAt';
    const cooldown=Number((await browser.storage.session.get(cooldownKey))[cooldownKey])||0;
    const now=Date.now();const pendingIds=previous?.pendingIds||snapshot.messages.map(m=>m.id);
    const pendingSince=previous?.pendingSince||now;
    const due=Math.max(nextAnalysisAt(now,settings.analysisEvery===5?5:1,pendingIds.length,pendingSince,!!previous?.hasAnalyzed,priorityChange(snapshot.messages,pendingIds),previous?.waitingUntil),cooldown);
    await putState(tab,{snapshot,waitingUntil:due,result:previous?.result,completedAt:previous?.completedAt,pendingIds,pendingSince,hasAnalyzed:previous?.hasAnalyzed});await arm(tab,due);
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
      if(current.analyzing)return;
      const settings = await getSettings();
      if (!settings.token) {await putState(tab,{snapshot,error:'Nhập token máy chủ trong cấu hình trước khi phân tích.'});return;}
      {
        const cooldownKey=settings.provider==='groq'?'groqNextAt':'rulesNextAt';
        const next=Number((await browser.storage.session.get(cooldownKey))[cooldownKey])||0;
        if(next>Date.now()) {await putState(tab,{...current,waitingUntil:next});await arm(tab,next);return;}
        await browser.storage.session.set({[cooldownKey]:Date.now()+(settings.provider==='groq'?GROQ_INTERVAL_MS:3100)});
      }
      aborters.set(tab,abort);
      await putState(tab,{...current,waitingUntil:undefined,analyzing:true,startedAt:Date.now()});
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
        if (!abort.signal.aborted && latest && isCurrent(latest.snapshot,result)) await putState(tab,{snapshot:latest.snapshot,result,completedAt:Date.now(),hasAnalyzed:true,pendingIds:[]});
      });
    } catch (error) {
      await transaction(async()=>{
        const latest = await getState(tab);
        if (!abort.signal.aborted && latest && isCurrent(latest.snapshot,context)) {
          await putState(tab,{...latest,analyzing:undefined,startedAt:undefined,retryAt,error:error instanceof Error ? error.message : 'Không kết nối được máy chủ.'});
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
        if(snapshot.availability==='waiting'){await cancel(tab);await putState(tab,{...previous,snapshot,waitingUntil:undefined,analyzing:undefined});}
        else if(previous.snapshot.availability==='waiting'&&(previous.pendingIds?.length||!previous.result)&&snapshot.messages.length)await queue(tab,snapshot,previous);
        else await putState(tab,{...previous,snapshot});
        return {ok:true};
      }
      // Keep the last assessment while new messages are appended. Edits, removals,
      // scope changes and truncated old context invalidate its supporting text.
      const retain=previous?.result&&previous.snapshot.sessionId===snapshot.sessionId&&previous.snapshot.conversation?.id===snapshot.conversation?.id
        &&previous.snapshot.messages.every(old=>snapshot.messages.some(m=>m.id===old.id&&m.sender===old.sender&&m.text===old.text))?previous:undefined;
      const sameSession=previous?.snapshot.sessionId===snapshot.sessionId;
      const pendingIds=[...new Set([...(sameSession?previous?.pendingIds||[]:[]),...changedIds(sameSession?previous?.snapshot.messages||[]:[],snapshot.messages)])].slice(-300);
      const next:TabState={snapshot,result:retain?.result,completedAt:retain?.completedAt,pendingIds,pendingSince:sameSession?previous?.pendingSince:undefined,hasAnalyzed:sameSession?previous?.hasAnalyzed:false,waitingUntil:sameSession?previous?.waitingUntil:undefined};
      await cancel(tab);
      await putState(tab,next);
      if (snapshot.status === 'watching' && snapshot.availability!=='waiting' && snapshot.messages.length) {
        await queue(tab,snapshot,next);
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
      for (const tab of new Set([...timers.keys(),...aborters.keys()])) await cancel(tab);
      // Changing provider/consent stops all sessions; the next start requires an explicit action.
      const stored = await browser.storage.session.get(null);
      for (const key of Object.keys(stored).filter(k=>k.startsWith('tab:'))) {
        const tab=Number(key.slice(4));
        try {await browser.tabs.sendMessage(tab,{type:'GUARD_STOP'});} catch {}
        await removeState(tab);
      }
      await browser.storage.session.set({settings:{token:s.token.trim(),provider:s.provider,externalConsent:!!s.externalConsent,facebookEnabled:!!s.facebookEnabled,analysisEvery:s.analysisEvery===5?5:1}});
      return {ok:true};
    }
    if (message?.type === 'ATTACH') {
      const tab=Number.isInteger(message.activeTabId)?await browser.tabs.get(message.activeTabId):(await browser.tabs.query({active:true,currentWindow:true}))[0];
      if (!tab?.id || !supported(tab.url || '')) return {error:'Mở http://127.0.0.1:8000/demo/#ctv hoặc một cuộc Facebook web.'};
      const stored=await browser.storage.session.get(null);
      for(const key of Object.keys(stored).filter(key=>key.startsWith('tab:')&&key!==stateKey(tab.id!))) {
        const old=Number(key.slice(4));await removeState(old);
        try {await browser.tabs.sendMessage(old,{type:'GUARD_STOP'});} catch {}
        await browser.storage.session.remove([key,`attached:${old}`,`attachedUrl:${old}`]);
      }
      await browser.storage.session.set({selectedTab:tab.id});
      // Opening the toolbar panel is also ATTACH. Reuse the verified reader on this
      // tab so opening the panel never resets the chosen person or their buffer.
      const alreadyAttached=(await browser.storage.session.get(`attached:${tab.id}`))[`attached:${tab.id}`];
      if(alreadyAttached) {
        try { const info=await readerInfo(tab.id);return {tabId:tab.id,...info}; }
        catch { /* A missing/older reader needs a fresh explicit attachment. */ }
      }
      await removeState(tab.id);
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
          await cancel(tab);state={...state,analyzing:undefined,error:'Lượt phân tích bị gián đoạn. Bấm thử lại để tiếp tục.'};await putState(tab,state);
        } else if(state.waitingUntil&&!timers.has(tab)) await arm(tab,state.waitingUntil);
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
    if (message.type === 'STOP') {await removeState(tab);return browser.tabs.sendMessage(tab,{type:'GUARD_STOP'});}
    if (message.type === 'RETRY') {
      const state = await getState(tab);
      if(state?.retryAt&&state.retryAt>Date.now()) return {error:'Đang chờ hết hạn mức. Thử lại sau thời gian hiển thị.'};
      if (state?.snapshot.status === 'watching' && state.snapshot.messages.length) {await cancel(tab);await queue(tab,state.snapshot,{...state,hasAnalyzed:false,waitingUntil:undefined});}
      return {ok:true};
    }
    if(message.type==='FOCUS') return browser.tabs.sendMessage(tab,{type:'GUARD_FOCUS',id:String(message.id||'')});
    if(message.type==='HISTORY') return browser.tabs.sendMessage(tab,{type:'GUARD_HISTORY'});
  }
  browser.runtime.onMessage.addListener((message,sender) => {
    if(message?.type==='GUARD_OPEN_PANEL'&&sender.id===browser.runtime.id&&typeof sender.tab?.id==='number'&&supported(sender.tab.url||'')) {
      // Called directly from the in-page button's user gesture, before any asynchronous work.
      return browser.sidePanel.open({tabId:sender.tab.id}).then(()=>({ok:true})).catch(()=>({error:'Bấm biểu tượng ChatGuard trên thanh tiện ích để mở.'}));
    }
    return transaction(()=>handle(message,sender)).catch(error => ({error:error instanceof Error ? error.message : 'Không thực hiện được. Tải lại tab, kết nối lại hoặc kiểm tra máy chủ.'}));
  });
  browser.alarms.onAlarm.addListener(alarm=>{if(alarm.name.startsWith('chatguard:analyze:')){const tab=Number(alarm.name.slice('chatguard:analyze:'.length));if(Number.isInteger(tab))void fire(tab);}});
  // Rehydrate scheduling once on every worker start, independently of a side panel.
  void transaction(async()=>{
    const stored=await browser.storage.session.get(null);
    for(const key of Object.keys(stored).filter(k=>k.startsWith('tab:'))) {
      const tab=Number(key.slice(4));const state=stored[key] as TabState;
      if(state.snapshot?.status!=='watching'){await updateIndicator(tab);continue;}
      try {
        const info=await readerInfo(tab);
        if(info.snapshot?.status!=='watching'||info.snapshot.sessionId!==state.snapshot.sessionId) {await removeState(tab);continue;}
        if(state.analyzing){await queue(tab,state.snapshot,{...state,analyzing:undefined,waitingUntil:undefined});}
        else if(state.waitingUntil&&state.snapshot.availability!=='waiting'){await arm(tab,state.waitingUntil);await updateIndicator(tab,state);}
        else await updateIndicator(tab,state);
      }catch{await removeState(tab);}
    }
  });
  browser.action.onClicked.addListener(tab => {if(tab.id){void browser.sidePanel.open({tabId:tab.id});void transaction(()=>handle({type:'ATTACH',activeTabId:tab.id},{url:browser.runtime.getURL('/sidepanel.html')})).catch(()=>{});}});
  browser.tabs.onRemoved.addListener(tab => {void transaction(async()=>{await removeState(tab);await browser.storage.session.remove([`attached:${tab}`,`attachedUrl:${tab}`]);});});
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
      await removeState(tab);await browser.storage.session.remove([`attached:${tab}`,key]);
    });
  });
});
