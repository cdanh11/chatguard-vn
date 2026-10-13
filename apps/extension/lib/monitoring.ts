import type {ChatMessage,Indicator,TabState} from './types';

export const BATCH_WAIT_MS=45000;
export function changedIds(before:ChatMessage[],after:ChatMessage[]):string[] {
  const old=new Map(before.map(m=>[m.id,m]));const current=new Set(after.map(m=>m.id));
  return [...after.filter(m=>{const p=old.get(m.id);return !p||p.text!==m.text||p.sender!==m.sender;}).map(m=>m.id),...before.filter(m=>!current.has(m.id)).map(m=>m.id)];
}
export function nextAnalysisAt(now:number,every:1|5,count:number,since:number,hasAnalyzed:boolean,priority:boolean,previousDue?:number):number {
  const ready=!hasAnalyzed||every===1||count>=every||priority;
  const target=ready?Math.min(now+1800,previousDue??Infinity):since+BATCH_WAIT_MS;
  return Math.max(now,target);
}
export function priorityChange(messages:ChatMessage[],ids:string[]):boolean {
  const changed=new Set(ids);
  return messages.some(m=>m.sender!=='self'&&changed.has(m.id)&&/\b(otp|ck)\b|chuyển khoản|chuyen khoan|nạp tiền|nap tien|mật khẩu|mat khau/i.test(m.text));
}
export function indicatorFor(state?:TabState):Indicator {
  if(state?.snapshot.status!=='watching')return {kind:'off',text:'',color:'#64748b',label:'Mở ChatGuard VN'};
  const stale=state.result?.revision!==state.snapshot.revision||state.snapshot.availability==='waiting'?' · Đánh giá trước, chưa cập nhật tin mới':'';
  if(state.result?.level==='high_concern')return {kind:'high_concern',text:'!',color:'#b64429',label:`ChatGuard: có dấu hiệu đáng lo${stale}. Mở để xem.`};
  if(state.result?.level==='review')return {kind:'review',text:'!',color:'#a37412',label:`ChatGuard: cần kiểm chứng${stale}. Mở để xem.`};
  if(state.error)return {kind:'error',text:'?',color:'#8a6a3d',label:'ChatGuard: chưa cập nhật được đánh giá. Mở để kiểm tra.'};
  if(state.snapshot.availability==='waiting')return {kind:'waiting',text:'Ⅱ',color:'#8b7954',label:'ChatGuard: vẫn giữ người đã chọn, chờ mở lại ô chat.'};
  if(state.analyzing||state.waitingUntil)return {kind:'pending',text:'…',color:'#687b75',label:'ChatGuard: đang chờ cập nhật đánh giá.'};
  if(state.result?.level==='insufficient_context')return {kind:'error',text:'?',color:'#8a6a3d',label:'ChatGuard: chưa đủ ngữ cảnh để đánh giá.'};
  return {kind:'watching',text:'•',color:'#287451',label:'ChatGuard: đang theo dõi. Chưa thấy dấu hiệu không có nghĩa là an toàn.'};
}
