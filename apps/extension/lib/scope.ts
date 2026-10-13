import { EMPTY, type ChatMessage, type Conversation, type Snapshot } from './types';

export class Scope {
  state: Snapshot = structuredClone(EMPTY);
  start(conversation: Conversation, sessionId: string, historyLimit:100|300=100) {
    this.state = { ...structuredClone(EMPTY), conversation, sessionId, revision:1, status:'watching',
      historyLimit,availability:'reading',reason:'Đang bảo vệ cuộc trò chuyện đã chọn.', coverage:'Chỉ văn bản đã được trang tải; không bảo đảm đầy đủ lịch sử.' };
  }
  stop(reason = 'Đã tắt bảo vệ và xóa dữ liệu phiên.') {
    this.state = { ...structuredClone(EMPTY), status:'paused', reason };
  }
  verify(conversation: Conversation | null): boolean {
    if (this.state.status !== 'watching') return false;
    if (!conversation || conversation.id !== this.state.conversation?.id) {
      this.stop('Đã đổi cuộc hoặc không xác minh được phạm vi. Nội dung phiên đã xóa; bấm bật lại nếu muốn.');
      return false;
    }
    return true;
  }
  availability(reading:boolean) {
    if(this.state.status!=='watching')return;
    this.state={...this.state,availability:reading?'reading':'waiting',reason:reading?'Đang đọc đúng người đã chọn.':'Vẫn giữ người đã chọn · chờ cuộc này được Facebook tải lại. Không đọc người khác.'};
  }
  capture(conversation: Conversation | null, incoming: ChatMessage[], prepend=false): boolean {
    if (!this.verify(conversation)) return false;
    const ordered=this.state.messages.map(m=>({...m}));
    for (let i=0;i<incoming.length;i++) {
      const m=incoming[i]!;if(!m.id||m.text.length>4000)continue;
      const existing=ordered.findIndex(item=>item.id===m.id);
      if(!m.text.trim()){if(existing>=0)ordered.splice(existing,1);continue;}
      if(existing>=0){ordered[existing]={...m};continue;}
      const next=incoming.slice(i+1).find(item=>ordered.some(old=>old.id===item.id));
      const previous=incoming[i-1];const previousIndex=ordered.findIndex(old=>old.id===previous?.id);
      const index=next?ordered.findIndex(old=>old.id===next.id):previousIndex>=0?previousIndex+1:prepend?0:ordered.length;
      ordered.splice(index,0,{...m});
    }
    const limit=this.state.historyLimit||100;
    const messages = ordered.slice(-limit);
    while (messages.reduce((n,m) => n + m.text.length, 0) > limit*240) messages.shift();
    if (JSON.stringify(messages) === JSON.stringify(this.state.messages)) return false;
    this.state = {...this.state, messages, revision:this.state.revision + 1};
    return true;
  }
}

export function isCurrent(snapshot: Snapshot, result: {session_id:string; revision:number; conversation_id:string}) {
  return snapshot.status === 'watching' && snapshot.sessionId === result.session_id
    && snapshot.revision === result.revision && snapshot.conversation?.id === result.conversation_id;
}
