import {describe,it,expect} from 'vitest';
import {changedIds,nextAnalysisAt,priorityChange,indicatorFor} from '../lib/monitoring';
import {EMPTY,type TabState} from '../lib/types';
const a={id:'a',sender:'other' as const,text:'Chào bạn'};
const active:TabState={snapshot:{...EMPTY,status:'watching',conversation:{id:'demo:a',name:'A',source:'demo'},sessionId:'s',revision:2,messages:[a]}};
describe('background monitoring',()=>{
  it('counts additions, edits and removals without counting repeated DOM captures',()=>{
    expect(changedIds([a],[a])).toEqual([]);
    expect(changedIds([a],[a,{...a,id:'b'}])).toEqual(['b']);
    expect(changedIds([a],[{...a,text:'Đã sửa'}])).toEqual(['a']);
    expect(changedIds([a],[])).toEqual(['a']);
  });
  it('batches without resetting its deadline, and expedites first scan, 5 messages or priority',()=>{
    expect(nextAnalysisAt(10000,5,1,10000,true,false)).toBe(55000);
    expect(nextAnalysisAt(20000,5,2,10000,true,false)).toBe(55000);
    expect(nextAnalysisAt(10000,5,1,10000,false,false)).toBe(11800);
    expect(nextAnalysisAt(20000,5,5,10000,true,false,55000)).toBe(21800);
    expect(nextAnalysisAt(20000,5,1,10000,true,true,55000)).toBe(21800);
    expect(nextAnalysisAt(20000,1,1,10000,true,false,21000)).toBe(21000);
  });
  it('prioritizes incoming requests without treating that as a verdict or counting own OTP text',()=>{
    expect(priorityChange([{...a,text:'Gửi OTP cho chị'}],['a'])).toBe(true);
    expect(priorityChange([{...a,text:'Gửi OTP cho chị',sender:'self'}],['a'])).toBe(false);
    expect(priorityChange([{...a,text:'Giao hộ chiếu bản gốc cho chị'}],['a'])).toBe(true);
    expect(priorityChange([{...a,text:'Gửi OTP',sender:'unknown'}],['a'])).toBe(false);
    expect(priorityChange([{...a,text:'ck 300k'}],['unrelated'])).toBe(false);
  });
  it('never presents a safe checkmark, clears on stop and keeps a stale warning visible',()=>{
    expect(indicatorFor().text).toBe('');
    expect(indicatorFor(active).text).toBe('•');
    expect(indicatorFor({...active,error:'offline'}).text).toBe('?');
    expect(indicatorFor({...active,waitingUntil:123}).text).toBe('…');
    const result={conversation_id:'demo:a',session_id:'s',revision:1,provider:'rules' as const,analyzed_count:1,level:'high_concern' as const,summary:'Cảnh báo',signals:[],actions:[],limitations:[]};
    const indicator=indicatorFor({...active,result,error:'offline'});
    expect(indicator.text).toBe('!');expect(indicator.label).toContain('chưa cập nhật');
    expect(indicatorFor({...active,result,snapshot:{...active.snapshot,status:'paused'}}).text).toBe('');
  });
});
