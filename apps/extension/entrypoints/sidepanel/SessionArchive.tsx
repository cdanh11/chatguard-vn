import React,{useEffect,useRef,useState} from 'react';
import {browser} from 'wxt/browser';
import {buildReport,reportHtml,type ReportSelection} from '../../lib/report';
import type {TabState} from '../../lib/types';

export function SessionArchive({state,tabId}:{state:TabState;tabId:number}) {
  const [visible,setVisible]=useState(25);
  const [selection,setSelection]=useState<ReportSelection>('evidence');
  const [format,setFormat]=useState<'json'|'html'>('json');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const {snapshot}=state;
  const offset=Math.max(0,snapshot.messages.length-visible);
  async function download(){
    setBusy(true);setError('');setNotice('');
    try{
      // Recheck the selected session in background. Never export a stale panel copy.
      const response=await browser.runtime.sendMessage({type:'EXPORT_SNAPSHOT',tabId,sessionId:snapshot.sessionId,conversationId:snapshot.conversation?.id});
      if(!mounted.current)return;
      if(response?.error||!response?.state)throw new Error(response?.error||'Không lấy được phiên hiện tại.');
      const report=buildReport(response.state,selection);
      const blob=new Blob([format==='html'?reportHtml(report):JSON.stringify(report,null,2)],{type:format==='html'?'text/html;charset=utf-8':'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      try{
        const link=document.createElement('a');link.href=url;link.download=`chatguard-vn-report-${report.generated_at.replace(/[:.]/g,'-')}.${format}`;
        document.body.append(link);link.click();link.remove();
      }finally{setTimeout(()=>URL.revokeObjectURL(url),1500);}
      setNotice(`Đã tạo báo cáo ${report.scope.exported_count} tin. File tải xuống do bạn quản lý.`);
    }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Chưa thể xuất báo cáo.');}
    finally{if(mounted.current)setBusy(false);}
  }
  return <details className="advanced session-archive">
    <summary>Bản nháp & báo cáo</summary>
    <p className="hint">Chỉ phần văn bản đã đọc của cuộc được chọn. Bản nháp được xóa khi tắt bảo vệ.</p>
    <details className="draft-view">
      <summary>Xem bản nháp ({snapshot.messages.length} tin)</summary>
      {snapshot.messages.length?<>
        <p className="hint">Đang hiển thị tin {offset+1}–{snapshot.messages.length} trong bộ đệm.</p>
        {offset>0&&<button type="button" className="text" onClick={()=>setVisible(n=>n+25)}>Xem thêm 25 tin trước</button>}
        <ol className="draft-list" start={offset+1}>{snapshot.messages.slice(offset).map(m=><li key={m.id}><small>{m.sender==='self'?'Bạn':m.sender==='other'?'Đối phương':'Chưa rõ bên gửi'}</small><p>{m.text}</p></li>)}</ol>
      </>:<p className="hint">Chưa có tin trong bộ đệm.</p>}
    </details>
    <label>Nội dung báo cáo<select value={selection} onChange={e=>{setSelection(e.target.value as ReportSelection);setNotice('');}}><option value="evidence">Chỉ cảnh báo và bằng chứng</option><option value="conversation">Toàn bộ bản nháp trong bộ đệm</option></select></label>
    <label>Định dạng báo cáo<select value={format} onChange={e=>{setFormat(e.target.value as 'json'|'html');setNotice('');}}><option value="json">JSON · dùng để kiểm tra dữ liệu</option><option value="html">HTML · mở để đọc hoặc in</option></select></label>
    <p className="field-note">Tạo file trên máy, không gọi AI. Không kèm token, tên hồ sơ hoặc ID Facebook từ metadata; văn bản vẫn có thể chứa thông tin riêng tư. Tắt & xóa không xóa file đã tải.</p>
    {state.result&&state.result.revision!==snapshot.revision&&<p className="stale-note">Đánh giá đang chờ cập nhật; báo cáo sẽ ghi rõ trạng thái này.</p>}
    <button type="button" className="secondary full" disabled={busy||!snapshot.messages.length} onClick={()=>void download()}>{busy?'Đang tạo file…':'Tải báo cáo'}</button>
    {notice&&<p className="hint" role="status">{notice}</p>}
    {error&&<p className="error" role="alert">{error}</p>}
  </details>;
}
