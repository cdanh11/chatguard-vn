import {describe,it,expect} from 'vitest';
import {selectContext,retryDelay,validAssessment} from '../lib/analysis-policy';
const messages=Array.from({length:100},(_,i)=>({id:`m${i}`,sender:'other' as const,text:'a'.repeat(200)}));
describe('analysis policy',()=>{
  it('uses whole recent messages within a bounded Groq context',()=>{
    const selected=selectContext(messages,'groq');expect(selected.length).toBe(30);expect(selected[0]?.id).toBe('m70');expect(selected.at(-1)?.id).toBe('m99');
    expect(selectContext(messages,'rules')).toEqual(messages);
  });
  it('limits message count even when texts are short',()=>{expect(selectContext(messages.map(m=>({...m,text:'hi'})),'groq')).toHaveLength(40);});
  it('keeps an earlier fee promise with the recent demand, in source order and within budget',()=>{
    const input=messages.map(m=>({...m,text:'Trao đổi lịch làm việc.'}));
    input[0]!.text='Bên mình không thu bất kỳ khoản phí nào.';
    input[99]!.text='Em nộp phí kích hoạt 300k để nhận việc.';
    const selected=selectContext(input,'groq');
    expect(selected.length).toBeLessThanOrEqual(40);expect(selected.reduce((n,m)=>n+m.text.length,0)).toBeLessThanOrEqual(6000);
    expect(selected[0]?.id).toBe('m0');expect(selected.at(-1)?.id).toBe('m99');
    expect(new Set(selected.map(m=>m.id)).size).toBe(selected.length);
    expect(selectContext(input.map(m=>({...m,sender:'self' as const})),'groq').some(m=>m.id==='m0')).toBe(false);
  });
  it('honors retry after without infinite or negative waits',()=>{expect(retryDelay('60')).toBe(60000);expect(retryDelay(null)).toBe(60000);expect(retryDelay('-1')).toBe(1000);expect(retryDelay('999999')).toBe(3600000);});
  it('requires evidence belonging to this request and exact count/provider',()=>{
    const r={level:'high_concern',provider:'groq',analyzed_count:100,summary:'Cần kiểm chứng',actions:[],limitations:[],signals:[{kind:'payment',title:'Yêu cầu nạp tiền',evidence_ids:['m99']}]};
    expect(validAssessment(r,messages,'groq')).toBe(true);
    expect(validAssessment({...r,signals:[]},messages,'groq')).toBe(false);
    expect(validAssessment({...r,analyzed_count:30},messages,'groq')).toBe(false);
    expect(validAssessment({...r,signals:[{...r.signals[0],evidence_ids:['other-chat']}]},messages,'groq')).toBe(false);
    expect(validAssessment(r,messages.map(m=>({...m,sender:'self' as const})),'groq')).toBe(false);
    expect(validAssessment(r,messages.map(m=>({...m,sender:'unknown' as const})),'groq')).toBe(false);
  });
});
