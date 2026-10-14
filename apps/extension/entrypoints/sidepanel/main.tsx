import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, type Conversation, type Settings, type TabState } from '../../lib/types';
import './style.css';
import {SessionArchive} from './SessionArchive';

const labels = { no_signal:'Chưa thấy dấu hiệu rõ', review:'Cần kiểm chứng', high_concern:'Có dấu hiệu đáng lo', insufficient_context:'Chưa đủ ngữ cảnh' };
function Shield({small=false}:{small?:boolean}) {
  return <svg width={small?20:26} height={small?20:26} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 4.5 6v5.2c0 4.3 3 7.6 7.5 9.8 4.5-2.2 7.5-5.5 7.5-9.8V6L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m8.5 11.7 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function App() {
  const manifest=browser.runtime.getManifest();
  const [settings,setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [savedSettings,setSavedSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tabId,setTabId] = useState<number>();
  const [available,setAvailable] = useState<Conversation[]>([]);
  const [selectedId,setSelectedId] = useState('');
  const [historyLimit,setHistoryLimit] = useState<100|300>(100);
  const [state,setState] = useState<TabState>();
  const [error,setError] = useState('');
  const [connectionError,setConnectionError] = useState('');
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [configOpen,setConfigOpen] = useState(false);
  const [now,setNow] = useState(Date.now());
  const [summaryExpanded,setSummaryExpanded] = useState(false);
  const stateEpoch=useRef(0);
  useEffect(() => {
    void browser.runtime.sendMessage({type:'SETTINGS_GET'}).then(s => {if (s && !s.error) {setSettings(s);setSavedSettings(s);setConfigOpen(!s.token);}});
    void browser.runtime.sendMessage({type:'PANEL_CONTEXT'}).then(r=>{if(Number.isInteger(r?.tabId))setTabId(r.tabId);});
    const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);
  },[]);
  useEffect(() => {
    if (tabId === undefined) return;
    let alive=true,polling=false;
    const poll=async () => {
      if(polling)return;polling=true;
      const epoch=stateEpoch.current;
      const current=()=>alive&&epoch===stateEpoch.current;
      try {
        const response=await browser.runtime.sendMessage({type:'TAB_STATE',tabId});
        if(!current())return;
        if(response?.disconnected) {setConnectionError(response.error);setTabId(undefined);setState(undefined);setAvailable([]);return;}
        setState(response?.state);
        const info=await browser.runtime.sendMessage({type:'DESCRIBE',tabId});
        if(!current())return;
        if(info?.error){setConnectionError(info.error);return;}
        if (current()) {
          setConnectionError('');const choices=info?.conversations||[];setAvailable(choices);
          setSelectedId(old=>info?.snapshot?.status==='watching'?info.snapshot.conversation.id:choices.some((c:Conversation)=>c.id===old)?old:choices.length===1?choices[0].id:'');
          if(info?.snapshot?.status==='watching')setHistoryLimit(info.snapshot.historyLimit===300?300:100);
        }
      } catch {if (current()) setConnectionError('Tab đã đóng hoặc tải lại. Kết nối lại để chọn cuộc trò chuyện.');}
      finally{polling=false;}
    };
    void poll();const timer=setInterval(()=>void poll(),1000);
    return()=>{alive=false;clearInterval(timer);};
  },[tabId]);
  useEffect(()=>setSummaryExpanded(false),[state?.result?.revision,state?.snapshot.sessionId]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(timer);},[notice]);
  async function command(type:string, extra:Record<string,unknown>={}) {
    // Drop in-flight panel polls when a user changes the selected scope.
    if(['ATTACH','START','STOP','SETTINGS_SAVE'].includes(type))stateEpoch.current++;
    setBusy(true);setError('');setNotice('');
    try {
      const response=await browser.runtime.sendMessage({type,tabId,...extra});
      if (response?.error) throw new Error(response.error);
      return response;
    } catch(e) {setError(e instanceof Error ? e.message : 'Không thực hiện được.');return null;}
    finally {setBusy(false);}
  }
  async function attach() {
    const response=await command('ATTACH');
    if(response?.tabId !== undefined) {setConnectionError('');setTabId(response.tabId);setAvailable(response.conversations||[]);setSelectedId(response.conversation?.id||'');setState(previous=>previous?.snapshot.sessionId===response.snapshot.sessionId?{...previous,snapshot:response.snapshot}:{snapshot:response.snapshot});}
  }
  function closeSettings(){setSettings(savedSettings);setConfigOpen(false);setError('');setNotice('');}
  async function stop() {const r=await command('STOP');if(r?.snapshot)setState({snapshot:r.snapshot});}
  async function start() {
    if(!savedSettings.token){setConfigOpen(true);return;}
    // Only the explicit protection action enables reading the selected Facebook person.
    // Consent to send data to Groq is separate and is never enabled here.
    if(chosen?.source==='facebook'&&!savedSettings.facebookEnabled) {
      const next={...savedSettings,facebookEnabled:true};
      if(!await command('SETTINGS_SAVE',{settings:next}))return;
      setSettings(next);setSavedSettings(next);
    }
    const r=await command('START',{conversationId:chosen?.id,historyLimit});
    if(r?.snapshot){setState({snapshot:r.snapshot});setNotice('Đã bật bảo vệ. Bạn có thể đóng panel; ChatGuard sẽ hiện ! khi cần kiểm chứng.');}
  }
  const watching=state?.snapshot.status === 'watching';
  const chosen=watching?state.snapshot.conversation:available.find(c=>c.id===selectedId)||null;
  const waiting=watching&&state.snapshot.availability==='waiting';
  const result=state?.result;
  const evidenceIds=[...new Set(result?.signals.flatMap(s=>s.evidence_ids)||[])];
  const actionable=result?.level==='review'||result?.level==='high_concern';
  const problem=error||connectionError||state?.error;
  const count=state?.snapshot.messages.length||0;
  return <div className="shell">
    <header><span className="mark"><Shield small/></span><strong>ChatGuard <small>VN</small></strong><button className="icon" aria-label={configOpen?'Quay lại':'Cấu hình'} title={configOpen?'Quay lại':'Cài đặt'} onClick={()=>configOpen?closeSettings():setConfigOpen(true)}>{configOpen?'✕':<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6m6 4v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>}</button></header>
    <main>
      {configOpen ? <>
        <div className="page-heading"><p className="eyebrow">{savedSettings.token?'CÀI ĐẶT':'KẾT NỐI LẦN ĐẦU'}</p><h1>{savedSettings.token?'Cách ChatGuard hoạt động':'Thiết lập một lần'}</h1><p>{savedSettings.token?'Điều chỉnh nơi phân tích và quyền riêng tư.':'Kết nối máy chủ, sau đó chọn người bạn muốn bảo vệ.'}</p></div>
        <details open className="config"><summary>Cấu hình máy chủ & quyền riêng tư</summary><form onSubmit={async e=>{e.preventDefault();const r=await command('SETTINGS_SAVE',{settings});if(r){const saved={...settings,token:settings.token.trim()};setSettings(saved);setSavedSettings(saved);setState(undefined);setConfigOpen(false);setNotice('Đã lưu cài đặt. Chọn cuộc trò chuyện để bật bảo vệ.');}}}>
          <label>Token máy chủ local<input type="password" autoComplete="off" value={settings.token} onChange={e=>setSettings({...settings,token:e.target.value})} placeholder="Nhập token từ máy chủ"/></label>
          <p className="field-note">Token kết nối máy chủ trên máy bạn. Không nhập khóa Groq vào đây.</p>
          <label>Bộ phân tích<select value={settings.provider} onChange={e=>setSettings({...settings,provider:e.target.value as Settings['provider'],externalConsent:false})}><option value="rules">Trên máy · bộ luật cơ bản</option><option value="groq">Groq AI · gửi văn bản để phân tích</option></select></label>
          <label>Tần suất kiểm tra<select value={settings.analysisEvery} onChange={e=>setSettings({...settings,analysisEvery:Number(e.target.value)===5?5:1})}><option value="1">Sau mỗi tin nhắn</option><option value="5">Gộp 5 tin</option></select></label>
          <p className="field-note">Lượt đầu và yêu cầu tiền/OTP được ưu tiên. Nhóm chưa đủ 5 tin chờ khoảng 45 giây; Groq vẫn cách ít nhất 30 giây giữa các lượt.</p>
          {settings.provider==='groq' ? <label className="check"><input type="checkbox" checked={settings.externalConsent} onChange={e=>setSettings({...settings,externalConsent:e.target.checked})}/><span>Tôi đồng ý gửi văn bản của cuộc được chọn qua máy chủ tới Groq để phân tích, theo chính sách xử lý dữ liệu của Groq.</span></label> : <p className="setting-note"><Shield small/> Văn bản được phân tích trên máy, không gửi tới dịch vụ AI.</p>}
          {watching&&<p className="setting-note">Lưu thay đổi sẽ dừng phiên bảo vệ hiện tại. Bạn có thể bật lại sau khi lưu.</p>}
          <button type="submit" className="full" disabled={busy||!settings.token.trim()}>Lưu cấu hình</button>
          <button type="button" className="text" disabled={busy} onClick={async()=>{const r=await command('HEALTH',{token:settings.token});if(r)setNotice(`Backend sẵn sàng · ${r.groq_configured?'Có cấu hình Groq':'Bộ luật sẵn sàng'}`);}}>Kiểm tra kết nối</button>
        </form></details>
        <details className="advanced"><summary>Thông tin kỹ thuật</summary><label className="check"><input type="checkbox" checked={settings.facebookEnabled} onChange={e=>setSettings({...settings,facebookEnabled:e.target.checked})}/><span>Bật bộ đọc Facebook thử nghiệm.</span></label><p className="hint">Khi bấm bảo vệ một người trên Facebook, bộ đọc được bật cho người đó. Không đọc các cuộc khác.</p><p className="hint">Token và ngữ cảnh chỉ lưu trong phiên trình duyệt. Khóa Groq nằm trên máy chủ.</p><p className="build-info">{import.meta.env.DEV?'DEV':'Bản build'} · {manifest.version}<br/>{manifest.version_name}</p></details>
      </> : <>
        <section className={`card scope ${watching?'active':''}`}>
          {watching ? <>
            <div className="section-row"><span className={`live-status ${waiting?'waiting':''}`}><span className="dot"/>{waiting?'Giữ lựa chọn · chờ tin':'Đang bảo vệ'}</span><button className="text quiet" disabled={busy} onClick={()=>void stop()}>Đổi người</button></div>
            <div className="person"><span className="avatar">{chosen?.name?.slice(0,1).toUpperCase()}</span><div><h2>{chosen?.name}</h2><p>Chỉ cuộc trò chuyện này được đọc</p></div></div>
            {waiting&&<div className="waiting-note">Ô chat đang đóng. Vẫn giữ <strong>{chosen?.name}</strong>; mở lại cuộc này để cập nhật tin mới.</div>}
            <div className="monitor-row"><span>{count} tin trong ngữ cảnh</span><button className="text stop" disabled={busy} onClick={()=>void stop()}>Tắt & xóa</button></div>
          </> : <>
            <p className="eyebrow">CUỘC TRÒ CHUYỆN CỦA BẠN</p><h2>{chosen?.name||'Chọn người để theo dõi'}</h2>
            <p className="intro">Nhận cảnh báo khi cuộc trò chuyện có dấu hiệu lừa đảo.</p>
            {available.length>1&&<label>Đối tượng theo dõi<select aria-label="Đối tượng theo dõi" disabled={busy} value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Chọn một người…</option>{available.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
            {available.length ? <><button className="full primary-start" disabled={busy||!chosen} onClick={()=>void start()}>{busy?'Đang kết nối…':'Bật bảo vệ cuộc này'}</button><p className="scope-consent">Chỉ đọc văn bản của người bạn chọn. Không tự gửi tin nhắn.</p></> : <button className="full" onClick={attach} disabled={busy}>Kết nối tab đang mở</button>}
            {!!available.length&&<button className="text quiet" onClick={attach} disabled={busy} aria-label="Kết nối tab đang mở">Làm mới danh sách</button>}
            {!available.length&&<p className="field-note">Mở ô chat Facebook với người cần bảo vệ, rồi kết nối.</p>}
            {state&&<span className="idle-state"><span>Chưa bật</span> · <span>{count} tin trong ngữ cảnh</span></span>}
          </>}
        </section>
        {watching&&(state?.analyzing||state?.waitingUntil)&&<div className="loading" role="status"><span className="pulse"/>{state.analyzing?'Đang kiểm tra ngữ cảnh…':`Chờ phân tích · ${Math.max(0,Math.ceil(((state.waitingUntil||0)-now)/1000))} giây`}</div>}
        {result ? <section className={`card assessment ${result.level}`} aria-live="polite">
          <div className="assessment-top"><span className="assessment-icon">{actionable?'!':<Shield small/>}</span><span className="eyebrow">{actionable?'DỪNG MỘT NHỊP':'ĐÁNH GIÁ GẦN NHẤT'}</span><span className="badge">{result.provider==='rules'?'Bộ luật':'Groq API'}</span></div>
          <h2>{labels[result.level]}</h2><p className={`result-summary ${result.summary.length>200&&!summaryExpanded?'collapsed':''}`}>{result.summary}</p>{result.summary.length>200&&<button className="text" onClick={()=>setSummaryExpanded(!summaryExpanded)}>{summaryExpanded?'Thu gọn':'Đọc đầy đủ'}</button>}
          {result.revision!==state?.snapshot.revision&&<p className="stale-note">Đang cập nhật tin mới. Đây là đánh giá từ phần đã phân tích trước đó.</p>}
          {waiting&&<p className="stale-note">Kết quả từ phần đã đọc trước khi đóng chat.</p>}
          {!!result.actions.length&&<div className="next-step"><h3>{actionable?'Trước khi tiếp tục':'Bạn có thể làm gì?'}</h3><ul>{result.actions.slice(0,2).map(a=><li key={a}>{a}</li>)}</ul></div>}
          {!!evidenceIds.length&&<details className="evidence"><summary>Xem {evidenceIds.length} tin liên quan <span>↗</span></summary><ul className="signal-list">{result.signals.map((s,i)=><li key={`${s.kind}:${i}`}>{s.title}</li>)}</ul>{evidenceIds.map(id=>{const m=state?.snapshot.messages.find(m=>m.id===id);return m?<blockquote key={id}><small>{m.sender==='self'?'Bạn':m.sender==='other'?'Đối phương':'Chưa rõ bên gửi'}</small>{m.text}<button className="text" onClick={()=>void command('FOCUS',{id})}>Xem tin này</button></blockquote>:null;})}</details>}
          <div className="result-meta">Đã phân tích {result.analyzed_count}/{count} tin · {result.provider==='groq'?'Groq AI':'Bộ luật cơ bản'}</div>
        </section> : watching&&!state?.analyzing&&!state?.waitingUntil&&!problem&&<section className="empty"><Shield/><h3>{count?'Đang chuẩn bị đánh giá':'Đợi tin nhắn đầu tiên'}</h3><p>Kết quả sẽ xuất hiện ở đây khi có đủ nội dung để phân tích.</p></section>}
        {watching&&tabId!==undefined&&<SessionArchive key={state.snapshot.sessionId} state={state} tabId={tabId}/>}
        <details className="conversation-options advanced"><summary>Tùy chọn cuộc trò chuyện</summary>
          <label>Giới hạn lịch sử<select aria-label="Giới hạn lịch sử" value={historyLimit} disabled={watching||busy} onChange={e=>setHistoryLimit(Number(e.target.value) as 100|300)}><option value="100">100 tin gần nhất · mặc định</option><option value="300">300 tin gần nhất · mở rộng</option></select></label>
          {watching&&<p className="hint">Muốn đổi giới hạn, tắt bảo vệ rồi chọn lại mức lịch sử.</p>}
          {watching&&chosen?.source==='facebook'&&<button className="secondary full" aria-label="Nạp lịch sử của người đã chọn" disabled={busy||waiting||state.snapshot.historyLoading} onClick={()=>void command('HISTORY')}>{state.snapshot.historyLoading?'Đang đọc tin cũ…':'Đọc thêm tin cũ'}</button>}
          {watching&&<button className="text" onClick={attach} disabled={busy}>Kết nối tab đang mở</button>}
          {state?.snapshot.historyNote&&<p className="hint">{state.snapshot.historyNote}</p>}
          <p className="hint">Chỉ đọc tin văn bản được Facebook tải. Đóng ô chat giữ người đã chọn nhưng có thể tạm ngừng đọc tin mới.</p>
          {savedSettings.provider==='groq'&&<p className="hint">Groq nhận tối đa 40 tin, 6.000 ký tự/lượt: phần gần nhất và một số phát biểu cũ về phí còn trong bộ đệm. Các lượt cách nhau ít nhất 30 giây.</p>}
        </details>
        {result&&<details className="advanced limitations"><summary>Giới hạn đánh giá</summary><ul>{(result.limitations.filter(l=>l.trim()).length?result.limitations.filter(l=>l.trim()):['Có thể thiếu ngữ cảnh; không xác minh danh tính đối phương.']).map(l=><li key={l}>{l}</li>)}</ul></details>}
      </>}
      {notice&&<div role="status" className="notice">{notice}</div>}
      {problem&&<div role="alert" className="error"><strong>Chưa thể tiếp tục</strong><p>{problem}</p>{connectionError?<button className="secondary" onClick={attach} disabled={busy}>Kết nối lại</button>:watching?<button className="secondary" disabled={busy||!!state?.retryAt&&now<state.retryAt} onClick={()=>void command('RETRY')}>Thử phân tích lại</button>:<button className="secondary" onClick={()=>setConfigOpen(true)}>Mở cài đặt</button>}{state?.retryAt&&now<state.retryAt&&<p>Thử lại sau {Math.ceil((state.retryAt-now)/1000)} giây.</p>}</div>}
    </main><footer><Shield small/> Cảnh báo hỗ trợ kiểm chứng, không xác minh danh tính.</footer>
  </div>;
}
// Reuse the root during Vite updates instead of mounting competing panels/timers.
const root=(import.meta.hot?.data.root as ReturnType<typeof createRoot>|undefined)||createRoot(document.getElementById('root')!);
if(import.meta.hot)import.meta.hot.data.root=root;
root.render(<App/>);
