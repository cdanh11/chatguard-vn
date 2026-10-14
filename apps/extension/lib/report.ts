import type {Assessment, TabState} from './types';

export type ReportSelection = 'evidence' | 'conversation';
export type LocalReport = {
  schema_version:1;
  product:'ChatGuard VN';
  generated_at:string;
  selection:ReportSelection;
  scope:{source:string; context_count:number; exported_count:number; history_limit:100|300; coverage:string};
  assessment:{status:'current'|'stale'|'unavailable'; update_pending:boolean; level:Assessment['level']|null;
    provider:Assessment['provider']|null; analyzed_count:number; summary:string;
    signals:{kind:string; title:string; evidence_ids:string[]}[]; actions:string[]; limitations:string[]};
  messages:{id:string; sender:'self'|'other'|'unknown'; text:string}[];
};

export function buildReport(state:TabState, selection:ReportSelection='evidence', at=new Date()):LocalReport {
  const {snapshot,result}=state;
  if(snapshot.status!=='watching'||!snapshot.conversation||!snapshot.sessionId)throw new Error('Phiên đã kết thúc. Không thể xuất báo cáo cũ.');
  if(selection!=='evidence'&&selection!=='conversation')throw new Error('Phạm vi xuất không hợp lệ.');
  const source=new Map(snapshot.messages.map(m=>[m.id,m]));
  if(source.size!==snapshot.messages.length)throw new Error('Bản nháp có định danh trùng. Chưa thể xuất báo cáo.');
  const aliases=new Map(snapshot.messages.map((m,i)=>[m.id,`m${i+1}`]));
  const usable=result&&result.session_id===snapshot.sessionId&&result.conversation_id===snapshot.conversation.id
    &&result.revision<=snapshot.revision&&result.analyzed_count<=snapshot.messages.length
    &&result.signals.every(s=>s.evidence_ids.length>0&&s.evidence_ids.every(id=>source.get(id)?.sender==='other'))?result:undefined;
  const evidence=new Set(usable?.signals.flatMap(s=>s.evidence_ids)||[]);
  const messages=snapshot.messages.filter(m=>selection==='conversation'||evidence.has(m.id))
    .map(m=>({id:aliases.get(m.id)!,sender:m.sender,text:m.text}));
  // Allowlist fields: no settings, tokens, names, Facebook IDs, session IDs or raw errors.
  return {
    schema_version:1,product:'ChatGuard VN',generated_at:at.toISOString(),selection,
    scope:{source:snapshot.conversation.source,context_count:snapshot.messages.length,exported_count:messages.length,
      history_limit:snapshot.historyLimit===300?300:100,coverage:snapshot.coverage},
    assessment:{status:usable?(usable.revision===snapshot.revision&&snapshot.availability!=='waiting'?'current':'stale'):'unavailable',
      update_pending:!!(state.analyzing||state.waitingUntil),level:usable?.level||null,provider:usable?.provider||null,
      analyzed_count:usable?.analyzed_count||0,summary:usable?.summary||'Chưa có kết quả phân tích hợp lệ tại thời điểm xuất.',
      signals:usable?.signals.map(s=>({kind:s.kind,title:s.title,evidence_ids:s.evidence_ids.map(id=>aliases.get(id)!)}))||[],
      actions:usable?[...usable.actions]:[],limitations:[...(usable?.limitations||[]),
        'Báo cáo chỉ chứa phần văn bản được quan sát; không xác minh danh tính hoặc chứng nhận an toàn.',
        'File có thể chứa thông tin riêng tư trong văn bản. Xóa phiên không xóa file đã tải hoặc dữ liệu nhà cung cấp đã nhận.']},
    messages,
  };
}

export const reportLabels={no_signal:'Chưa thấy dấu hiệu rõ',review:'Cần kiểm chứng',high_concern:'Có dấu hiệu đáng lo',insufficient_context:'Chưa đủ ngữ cảnh'};
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function reportHtml(report:LocalReport):string {
  const a=report.assessment;
  const list=(items:string[])=>`<ul>${items.map(item=>`<li>${escape(item)}</li>`).join('')}</ul>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Báo cáo ChatGuard VN</title><style>body{font:16px/1.65 system-ui,sans-serif;max-width:820px;margin:32px auto;padding:0 20px;color:#244437;background:#fafcf9}h1,h2{line-height:1.3}small{color:#65796d}.note,article{padding:16px;border:1px solid #dce6df;border-radius:12px;background:#fff;margin:12px 0}.text{white-space:pre-wrap;overflow-wrap:anywhere}li{overflow-wrap:anywhere}@media print{body{margin:0;max-width:none}article{break-inside:avoid}}</style></head><body>
<h1>ChatGuard VN · Báo cáo phiên</h1><small>Xuất lúc ${escape(report.generated_at)} · Phiên bản định dạng ${report.schema_version}</small>
<p>Phạm vi: ${report.selection==='evidence'?'Cảnh báo và bằng chứng':'Toàn bộ bản nháp trong bộ đệm'} · ${report.scope.exported_count}/${report.scope.context_count} tin được xuất.</p>
<p>${escape(report.scope.coverage)}</p>
<section class="note"><h2>${a.level?reportLabels[a.level]:'Chưa có đánh giá'}</h2>
<p>${a.status==='stale'?'Đánh giá trước, chưa cập nhật toàn bộ ngữ cảnh hiện tại.':a.status==='unavailable'?'Chưa có kết quả hợp lệ.':'Đánh giá khớp phiên bản ngữ cảnh tại thời điểm xuất.'}</p>
${a.update_pending?'<p>Có lượt cập nhật đang chờ hoặc đang xử lý.</p>':''}
<p class="text">${escape(a.summary)}</p><small>Đã phân tích ${a.analyzed_count}/${report.scope.context_count} tin · ${a.provider==='groq'?'Groq API':a.provider==='rules'?'Bộ luật minh họa':'Chưa phân tích'}</small></section>
<h2>Dấu hiệu và nguồn</h2>${list(a.signals.map(s=>`${s.title} · ${s.evidence_ids.join(', ')}`))}
<h2>Hành động được đề xuất</h2>${list(a.actions)}
<h2>Văn bản được xuất</h2>${report.messages.length?report.messages.map(m=>`<article><small>${escape(m.id)} · ${m.sender==='self'?'Bạn':m.sender==='other'?'Đối phương':'Chưa rõ bên gửi'}</small><div class="text">${escape(m.text)}</div></article>`).join(''):'<p>Không có tin bằng chứng trong đánh giá hợp lệ hiện tại.</p>'}
<h2>Giới hạn và dữ liệu</h2>${list(a.limitations)}
</body></html>`;
}
