import {describe,it,expect} from 'vitest';
import {selectContext,retryDelay,validAssessment} from '../lib/analysis-policy';
const messages=Array.from({length:100},(_,i)=>({id:`m${i}`,sender:'other' as const,text:'a'.repeat(200)}));
describe('analysis policy',()=>{
  it('uses whole recent messages within a bounded Groq context',()=>{
    const selected=selectContext(messages,'groq');expect(selected.length).toBe(30);expect(selected[0]?.id).toBe('m70');expect(selected.at(-1)?.id).toBe('m99');
    expect(selectContext(messages,'rules')).toEqual(messages);
  });
  it('limits message count even when texts are short',()=>{expect(selectContext(messages.map(m=>({...m,text:'hi'})),'groq')).toHaveLength(40);});
  it('honors retry after without infinite or negative waits',()=>{expect(retryDelay('60')).toBe(60000);expect(retryDelay(null)).toBe(60000);expect(retryDelay('-1')).toBe(1000);expect(retryDelay('999999')).toBe(3600000);});
  it('requires evidence belonging to this request and exact count/provider',()=>{
    const r={level:'high_concern',provider:'groq',analyzed_count:100,summary:'Cần kiểm chứng',actions:[],limitations:[],signals:[{kind:'payment',title:'Yêu cầu nạp tiền',evidence_ids:['m99']}]};
    expect(validAssessment(r,messages,'groq')).toBe(true);
    expect(validAssessment({...r,signals:[]},messages,'groq')).toBe(false);
    expect(validAssessment({...r,analyzed_count:30},messages,'groq')).toBe(false);
    expect(validAssessment({...r,signals:[{...r.signals[0],evidence_ids:['other-chat']}]},messages,'groq')).toBe(false);
  });
});
