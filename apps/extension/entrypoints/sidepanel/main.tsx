import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, type Conversation, type Settings, type TabState } from '../../lib/types';
import './style.css';

const labels = { no_signal:'Chưa thấy dấu hiệu rõ', review:'Cần kiểm chứng', high_concern:'Có dấu hiệu đáng lo', insufficient_context:'Chưa đủ ngữ cảnh' };
function App() {
  const manifest=browser.runtime.getManifest();
  const [settings,setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [savedSettings,setSavedSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tabId,setTabId] = useState<number>();
  const [conversation,setConversation] = useState<Conversation | null>(null);
  const [available,setAvailable] = useState<Conversation[]>([]);
  const [selectedId,setSelectedId] = useState('');
  const [historyLimit,setHistoryLimit] = useState<100|300>(100);
  const [state,setState] = useState<TabState>();
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);
  const [configOpen,setConfigOpen] = useState(false);
  const [now,setNow] = useState(Date.now());
  useEffect(() => {
    void browser.runtime.sendMessage({type:'SETTINGS_GET'}).then(s => {if (s && !s.error) {setSettings(s);setSavedSettings(s);setConfigOpen(!s.token);}});
    void browser.runtime.sendMessage({type:'PANEL_CONTEXT'}).then(r=>{if(Number.isInteger(r?.tabId))setTabId(r.tabId);});
    const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);
  },[]);
  useEffect(() => {
    if (tabId === undefined) return;
    let alive=true;
    const poll=async () => {
      try {
        const response=await browser.runtime.sendMessage({type:'TAB_STATE',tabId});
        if(response?.disconnected) {if(alive){setError(response.error);setTabId(undefined);setState(undefined);setConversation(null);}return;}
        if (alive) setState(response?.state);
        const info=await browser.runtime.sendMessage({type:'DESCRIBE',tabId});
        if(info?.error){if(alive)setError(info.error);return;}
        if (alive) {
          setConversation(info?.conversation || null);const choices=info?.conversations||[];setAvailable(choices);
          setSelectedId(old=>info?.snapshot?.status==='watching'?info.snapshot.conversation.id:choices.some((c:Conversation)=>c.id===old)?old:choices.length===1?choices[0].id:'');
          if(info?.snapshot?.status==='watching')setHistoryLimit(info.snapshot.historyLimit===300?300:100);
        }
      } catch {if (alive) setError('Tab đã đóng hoặc tải lại. Bấm kết nối lại.');}
    };
    void poll();const timer=setInterval(()=>void poll(),1000);
    return()=>{alive=false;clearInterval(timer);};
  },[tabId]);
  async function command(type:string, extra:Record<string,unknown>={}) {
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
    if(response?.tabId !== undefined) {setTabId(response.tabId);setConversation(response.conversation);setAvailable(response.conversations||[]);setSelectedId(response.conversation?.id||'');setState({snapshot:response.snapshot});}
  }
  const watching=state?.snapshot.status === 'watching';
  const chosen=watching?state.snapshot.conversation:available.find(c=>c.id===selectedId)||null;
  const waiting=watching&&state.snapshot.availability==='waiting';
  const dirty=JSON.stringify(settings)!==JSON.stringify(savedSettings);
  const result=state?.result;
  return <div className="shell">
    <header><span className="mark">◈</span><div><strong>ChatGuard <small>VN</small></strong><span className="subtitle">Bảo vệ cuộc trò chuyện</span></div><button className="icon" aria-label="Cấu hình" onClick={()=>setConfigOpen(!configOpen)}>⚙</button></header>
    <div className="privacy"><span className="dot"/> Chỉ cuộc bạn chọn · Không tự gửi tin</div>
    <main>
      <section className="welcome"><p className="eyebrow">DỪNG MỘT NHỊP. KIỂM CHỨNG TRƯỚC.</p><h1>Giữ quyền<br/>quyết định của bạn.</h1><p>Cảnh báo dựa trên câu chữ và ngữ cảnh đã đọc, không xác minh danh tính đối phương.</p></section>
      <details open={configOpen} className="config">
        <summary onClick={e=>{e.preventDefault();setConfigOpen(!configOpen);}}>Cấu hình máy chủ & quyền riêng tư</summary>
        <form onSubmit={async e=>{e.preventDefault(); const r=await command('SETTINGS_SAVE',{settings});if(r){const saved={...settings,token:settings.token.trim()};setSettings(saved);setSavedSettings(saved);setNotice('Đã lưu trong phiên trình duyệt. Bật lại bảo vệ để dùng cấu hình mới.');setState(undefined);setConfigOpen(false);}}}>
          <label>Token máy chủ local<input type="password" autoComplete="off" value={settings.token} onChange={e=>setSettings({...settings,token:e.target.value})} placeholder="Lấy từ cửa sổ chạy backend"/></label>
          <label>Bộ phân tích<select value={settings.provider} onChange={e=>setSettings({...settings,provider:e.target.value as Settings['provider'],externalConsent:false})}><option value="rules">Bộ luật minh họa · không gửi ra ngoài</option><option value="groq">Groq API · cần khóa trên backend</option></select></label>
          {settings.provider==='groq' && <label className="check"><input type="checkbox" checked={settings.externalConsent} onChange={e=>setSettings({...settings,externalConsent:e.target.checked})}/><span>Tôi đồng ý gửi phần hội thoại được chọn qua backend tới Groq để phân tích. Dữ liệu được xử lý theo chính sách Groq. Chỉ dùng dữ liệu tổng hợp khi demo.</span></label>}
          <label className="check"><input type="checkbox" checked={settings.facebookEnabled} onChange={e=>setSettings({...settings,facebookEnabled:e.target.checked})}/><span>Bật bộ đọc Facebook thử nghiệm. Chỉ đọc người tôi chọn trong ô chat được xác minh; giao diện khác có thể chưa hỗ trợ.</span></label>
          <button type="submit" disabled={busy}>Lưu cấu hình</button>
          <button type="button" className="secondary" disabled={busy} onClick={async()=>{const r=await command('HEALTH',{token:settings.token});if(r)setNotice(`Backend sẵn sàng · ${r.groq_configured?'Có cấu hình Groq (chưa kiểm tra quota)':'Bộ luật sẵn sàng, chưa có khóa Groq'}`);}}>Kiểm tra kết nối</button>
          <p className="hint">Token và ngữ cảnh chỉ lưu trong phiên trình duyệt. Không đưa khóa Groq vào đây.</p>
        </form>
      </details>
      <section className="card scope"><div className="section-row"><span className="eyebrow">PHẠM VI ĐƯỢC CHỌN</span><span className={`badge ${watching?'on':''}`}>{waiting?'Giữ lựa chọn · chờ tin':watching?'Đang bảo vệ':'Chưa bật'}</span></div>
        <h2>{chosen?.name || 'Chọn cuộc trò chuyện'}</h2>
        <p>{chosen?.source==='demo'?'Phòng thử · dữ liệu tổng hợp':chosen?.source==='facebook'?'Facebook web · chỉ người đã chọn':'Mở ô chat Facebook cần theo dõi, rồi kết nối tab.'}</p>
        <button className="secondary full" onClick={attach} disabled={busy}>Kết nối tab đang mở</button>
        <label>Đối tượng theo dõi<select aria-label="Đối tượng theo dõi" disabled={watching||busy} value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Chọn một người…</option>{available.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}{chosen&&!available.some(c=>c.id===chosen.id)&&<option value={chosen.id}>{chosen.name} · ô chat đang đóng</option>}</select></label>
        <label>Lịch sử giữ trong phiên<select aria-label="Giới hạn lịch sử" value={historyLimit} disabled={watching||busy} onChange={e=>setHistoryLimit(Number(e.target.value) as 100|300)}><option value="100">Mức 1 · tối đa 100 tin / 24.000 ký tự</option><option value="300">Mức 2 · tối đa 300 tin / 72.000 ký tự</option></select></label>
        <div className="actions"><button disabled={busy || dirty || !chosen || watching} onClick={()=>void command('START',{conversationId:chosen?.id,historyLimit})}>Bật bảo vệ cuộc này</button><button className="danger" disabled={busy || !watching} onClick={()=>void command('STOP')}>Tắt & xóa</button></div>
        {watching&&chosen?.source==='facebook'&&<button className="secondary full" disabled={busy||waiting||state.snapshot.historyLoading} onClick={()=>void command('HISTORY')}>{state.snapshot.historyLoading?'Đang nạp lịch sử…':'Nạp lịch sử của người đã chọn'}</button>}
        {waiting&&<p className="hint">Vẫn giữ {chosen?.name}. Ô chat chưa có nội dung được xác minh nên chưa đọc tin mới. Mở lại đúng cuộc để tự tiếp tục; không chuyển sang người khác.</p>}
        {dirty && <p className="hint">Cấu hình đang sửa chưa được áp dụng. Lưu cấu hình trước khi bật; phiên đang chạy vẫn dùng cấu hình đã lưu.</p>}
        {chosen?.warning && <p className="hint">{chosen.warning}</p>}
      </section>
      {notice && <div role="status" className="notice">{notice}</div>}
      {(error || state?.error) && <div role="alert" className="error">{error || state?.error}<button className="text" disabled={!watching || busy || !!state?.retryAt && now<state.retryAt} onClick={()=>void command('RETRY')}>Thử phân tích lại</button>{state?.retryAt && now<state.retryAt && <p>Thử lại sau {Math.ceil((state.retryAt-now)/1000)} giây.</p>}</div>}
      {state && <div className="coverage"><strong>{state.snapshot.messages.length} tin trong ngữ cảnh</strong><span>{state.snapshot.reason}</span><span>{state.snapshot.coverage}</span></div>}
      {state?.snapshot.historyNote&&<p className="hint">{state.snapshot.historyNote}</p>}
      {state?.analyzing && <div className="loading" role="status"><span className="dot"/> Đang kiểm tra ngữ cảnh…</div>}
      {state?.waitingUntil && <div className="loading" role="status">Chờ phân tích · {Math.max(0,Math.ceil((state.waitingUntil-now)/1000))} giây. Tin mới được gộp vào lượt tiếp theo.</div>}
      {result ? <section className={`card assessment ${result.level}`} aria-live="polite">
        <div className="section-row"><span className="eyebrow">KẾT QUẢ</span><span className="badge">{result.provider==='rules'?'Bộ luật · chưa train':'Groq API'}</span></div>
        <h2>{labels[result.level]}</h2><p>{result.summary}</p>
        {waiting&&<p className="hint">Đánh giá từ phần đã đọc, chưa cập nhật tin mới khi ô chat đóng.</p>}
        <p className="hint">Đã phân tích {result.analyzed_count}/{state?.snapshot.messages.length} tin trong bộ đệm. {result.provider==='groq'?'Tối đa 40 tin gần nhất, 6.000 ký tự mỗi lượt; tối thiểu 30 giây giữa các lượt.':''}</p>
        {result.signals.map((signal,index)=><div className="signal" key={`${signal.kind}:${index}`}><h3>{signal.title}</h3>{signal.evidence_ids.map(id=>{
          const m=state?.snapshot.messages.find(m=>m.id===id);
          return m ? <blockquote key={id}><small>{m.sender==='self'?'Bạn':m.sender==='other'?'Đối phương':'Chưa rõ bên gửi'}</small>{m.text}<button className="text" onClick={()=>void command('FOCUS',{id})}>Xem tin này</button></blockquote> : null;
        })}</div>)}
        {result.actions.length>0 && <><h3>Bước kiểm chứng tiếp theo</h3><ul>{result.actions.map(a=><li key={a}>{a}</li>)}</ul></>}
        <details><summary>Giới hạn đánh giá</summary><ul>{(result.limitations.filter(l=>l.trim()).length?result.limitations.filter(l=>l.trim()):['Chỉ đánh giá văn bản đã đọc; có thể thiếu ngữ cảnh và không xác minh danh tính.']).map(l=><li key={l}>{l}</li>)}</ul></details>
      </section> : !state?.analyzing && <section className="empty"><div>◎</div><h3>Chưa có đánh giá</h3><p>Bật bảo vệ rồi thêm tin vào cuộc đã chọn. Kết quả chỉ xuất hiện khi có nội dung để phân tích.</p></section>}
    </main><footer>Bản MVP · Chưa thay thế xác minh độc lập.<br/><span>{import.meta.env.DEV?'DEV':'Bản build'} · {manifest.version} · {manifest.version_name}</span></footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
