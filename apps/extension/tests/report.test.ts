import {describe,it,expect} from 'vitest';
import {buildReport,reportHtml} from '../lib/report';
import {EMPTY,type TabState} from '../lib/types';

const state:TabState={snapshot:{...EMPTY,status:'watching',conversation:{id:'fb:private-person-id',name:'Private profile name',source:'facebook'},
  sessionId:'private-session-id',revision:3,historyLimit:300,messages:[
    {id:'fb:message-one',sender:'self',text:'Lịch làm việc thế nào?'},
    {id:'fb:message-two',sender:'other',text:'Em đóng phí kích hoạt 300k nhé.'},
    {id:'fb:message-three',sender:'unknown',text:'Chưa rõ vai gửi.'},
  ]},result:{conversation_id:'fb:private-person-id',session_id:'private-session-id',revision:3,provider:'rules',analyzed_count:3,
    level:'review',summary:'Cần xác minh yêu cầu phí.',signals:[{kind:'payment',title:'Yêu cầu phí',evidence_ids:['fb:message-two']}],actions:['Xác minh độc lập.'],limitations:[]}};
const at=new Date('2026-10-14T00:00:00Z');
describe('local reports',()=>{
  it('exports evidence by default and allowlists metadata, without mutating the session',()=>{
    const before=structuredClone(state);
    const extra={...state,settings:{token:'never-export-token'},error:'raw-private-error'};
    const report=buildReport(extra,'evidence',at);const json=JSON.stringify(report);
    expect(report.messages).toEqual([{id:'m2',sender:'other',text:state.snapshot.messages[1]!.text}]);
    expect(report.assessment.signals[0]?.evidence_ids).toEqual(['m2']);
    for(const hidden of ['private-person-id','private-session-id','Private profile name','fb:message','never-export-token','raw-private-error'])expect(json).not.toContain(hidden);
    expect(json).not.toContain(state.snapshot.messages[0]!.text);expect(state).toEqual(before);
  });
  it('includes self and unknown only when full-buffer export is selected',()=>{
    const report=buildReport(state,'conversation',at);
    expect(report.messages.map(m=>m.sender)).toEqual(['self','other','unknown']);
    expect(report.scope.context_count).toBe(3);expect(report.scope.exported_count).toBe(3);expect(report.scope.history_limit).toBe(300);
  });
  it('marks retained or waiting assessments as stale without presenting them as current',()=>{
    const report=buildReport({...state,snapshot:{...state.snapshot,revision:4},waitingUntil:Date.now()+10000},'evidence',at);
    expect(report.assessment.status).toBe('stale');expect(report.assessment.update_pending).toBe(true);
    expect(buildReport({...state,snapshot:{...state.snapshot,availability:'waiting'}}).assessment.status).toBe('stale');
  });
  it('omits mismatched-session or missing-source assessments and cannot invent evidence',()=>{
    const mismatch=buildReport({...state,result:{...state.result!,session_id:'another-session'}},'evidence',at);
    expect(mismatch.assessment.status).toBe('unavailable');expect(mismatch.messages).toEqual([]);
    const invalid=buildReport({...state,result:{...state.result!,signals:[{kind:'bad',title:'bad',evidence_ids:['unrelated']}]}},'evidence',at);
    expect(invalid.assessment.signals).toEqual([]);
  });
  it('renders untrusted text as escaped inert HTML with no external dependencies',()=>{
    const dangerous='<script>globalThis.reportExecuted=true</script><img src="https://evil.example/track" onerror="alert(1)">';
    const edited=structuredClone(state);edited.snapshot.messages[1]!.text=dangerous;edited.result!.summary=dangerous;edited.result!.actions=[dangerous];
    const html=reportHtml(buildReport(edited,'conversation',at));
    expect(html).toContain('&lt;script&gt;');expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("default-src 'none'");expect(html).not.toContain('<script>');expect(html).not.toContain('<img');
    expect(html).not.toContain('private-person-id');
  });
  it('refuses terminated sessions and ambiguous duplicate IDs',()=>{
    expect(()=>buildReport({...state,snapshot:{...EMPTY}})).toThrow('Phiên đã kết thúc');
    expect(()=>buildReport({...state,snapshot:{...state.snapshot,messages:[state.snapshot.messages[0]!,state.snapshot.messages[0]!]}})).toThrow('định danh trùng');
  });
});
