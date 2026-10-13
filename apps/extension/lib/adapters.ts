import type { ChatMessage, Conversation } from './types';
import {facebookThreads,selectedThread,facebookMessages} from './facebook';

export function conversations(doc:Document,url:URL):Conversation[] {
  if(['www.facebook.com','web.facebook.com','www.messenger.com','messenger.com'].includes(url.hostname))return facebookThreads(doc).map(t=>t.conversation);
  const current=describe(doc,url);return current?[current]:[];
}

export function describe(doc: Document, url: URL): Conversation | null {
  if (url.hostname === '127.0.0.1' && url.port === '8000' && url.pathname.startsWith('/demo/')) {
    const root = doc.querySelector<HTMLElement>('[data-chatguard-thread]');
    const id = root?.dataset.chatguardThread;
    if (!id || url.hash.slice(1) !== id.replace('demo:', '')) return null;
    return {id, name:root.dataset.chatguardName || 'Hội thoại thử', source:'demo'};
  }
  if (!['www.facebook.com', 'web.facebook.com', 'www.messenger.com', 'messenger.com'].includes(url.hostname)) return null;
  const threads=facebookThreads(doc);if(threads.length===1)return threads[0]!.conversation;
  const id = url.pathname.match(/\/(?:messages\/)?t\/([a-zA-Z0-9_-]+)\/?$/)?.[1];
  if (!id) return null;
  return {id:`facebook:${id}`, name:'Cuộc đang mở trên Facebook', source:'facebook',
    warning:'Bộ đọc Facebook thử nghiệm, chưa kiểm chứng trên tài khoản của bạn. Chỉ nhận văn bản và nhãn người gửi có thể xác minh.'};
}

function visible(element: HTMLElement) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}

export function readMessages(doc: Document, conversation: Conversation): { messages: ChatMessage[]; error?:string } {
  if (conversation.source === 'demo') {
    const root = doc.querySelector<HTMLElement>('[data-chatguard-thread]');
    if (root?.dataset.chatguardThread !== conversation.id) return {messages:[],error:'Phạm vi hội thoại thay đổi.'};
    return {messages:[...root.querySelectorAll<HTMLElement>('[data-chatguard-message]')].slice(-100).map(row => ({
      id:row.dataset.chatguardMessage!,
      sender:row.dataset.sender === 'self' ? 'self' : row.dataset.sender === 'other' ? 'other' : 'unknown',
      text:row.querySelector<HTMLElement>('[data-chatguard-text]')?.innerText || '',
    }))};
  }
  const thread=selectedThread(doc,conversation);
  return thread?facebookMessages(thread):{messages:[],error:'Cuộc đã chọn hiện chưa có vùng tin được xác minh.'};
}
