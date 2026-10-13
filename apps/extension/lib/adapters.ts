import type { ChatMessage, Conversation } from './types';

export function describe(doc: Document, url: URL): Conversation | null {
  if (url.hostname === '127.0.0.1' && url.port === '8000' && url.pathname.startsWith('/demo/')) {
    const root = doc.querySelector<HTMLElement>('[data-chatguard-thread]');
    const id = root?.dataset.chatguardThread;
    if (!id || url.hash.slice(1) !== id.replace('demo:', '')) return null;
    return {id, name:root.dataset.chatguardName || 'Hội thoại thử', source:'demo'};
  }
  if (!['www.facebook.com', 'web.facebook.com', 'www.messenger.com', 'messenger.com'].includes(url.hostname)) return null;
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
  // Deliberately fail closed on ambiguous layout. No network interception or hidden APIs.
  const grids = [...doc.querySelectorAll<HTMLElement>('[role="main"] [role="grid"]')]
    .filter(grid => visible(grid) && grid.querySelector('[role="row"]'));
  if (grids.length !== 1) return {messages:[],error:'Không xác định được duy nhất vùng tin nhắn. Chưa thu thập nội dung.'};
  const messages: ChatMessage[] = [];
  for (const row of [...grids[0]!.querySelectorAll<HTMLElement>('[role="row"]')].slice(-100)) {
    const label = row.getAttribute('aria-label') || '';
    const sender = /^(you sent|bạn đã gửi|bạn:)/i.test(label) ? 'self' : /^(message from|tin nhắn từ)/i.test(label) ? 'other' : 'unknown';
    const rawId = row.getAttribute('data-message-id') || row.getAttribute('data-id');
    // Without a stable ID, collecting virtualized rows could silently merge or duplicate messages.
    if (!rawId || rawId.length > 150) continue;
    const texts = [...row.querySelectorAll<HTMLElement>('[dir="auto"]')]
      .filter(el => !el.querySelector('[dir="auto"]') && !el.closest('[role="button"], [contenteditable="true"]'));
    const text = texts.map(el => el.innerText).filter(Boolean).join('\n').trim();
    if (text && text.length <= 4000) messages.push({id:`fb:${rawId}`, sender, text});
  }
  if (!messages.length) return {messages:[],error:'Giao diện chưa cung cấp ID tin ổn định cho bộ đọc này. Cần hiệu chỉnh trên Facebook thật; không đoán nội dung.'};
  return {messages};
}
