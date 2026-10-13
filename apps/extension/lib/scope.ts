import { EMPTY, type ChatMessage, type Conversation, type Snapshot } from './types';

export class Scope {
  state: Snapshot = structuredClone(EMPTY);
  start(conversation: Conversation, sessionId: string) {
    this.state = { ...structuredClone(EMPTY), conversation, sessionId, revision:1, status:'watching',
      reason:'Đang bảo vệ cuộc trò chuyện đã chọn.', coverage:'Chỉ văn bản đã được trang tải; không bảo đảm đầy đủ lịch sử.' };
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
  capture(conversation: Conversation | null, incoming: ChatMessage[]): boolean {
    if (!this.verify(conversation)) return false;
    const byId = new Map(this.state.messages.map(m => [m.id, m]));
    for (const m of incoming) {
      if (m.id && m.text.trim() && m.text.length <= 4000) byId.set(m.id, {...m});
    }
    let messages = [...byId.values()].slice(-100);
    while (messages.reduce((n,m) => n + m.text.length, 0) > 24000) messages.shift();
    if (JSON.stringify(messages) === JSON.stringify(this.state.messages)) return false;
    this.state = {...this.state, messages, revision:this.state.revision + 1};
    return true;
  }
}

export function isCurrent(snapshot: Snapshot, result: {session_id:string; revision:number; conversation_id:string}) {
  return snapshot.status === 'watching' && snapshot.sessionId === result.session_id
    && snapshot.revision === result.revision && snapshot.conversation?.id === result.conversation_id;
}
