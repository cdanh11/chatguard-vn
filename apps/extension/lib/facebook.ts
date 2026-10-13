import type {ChatMessage,Conversation} from './types';

export type FacebookThread={conversation:Conversation;root:HTMLElement;log:HTMLElement};
export function visible(element:HTMLElement):boolean {
  return element.isConnected&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden'&&getComputedStyle(element).display!=='none';
}
function peerId(href:string):string|null {
  try {const url=new URL(href,'https://www.facebook.com');
    if(!['www.facebook.com','web.facebook.com','www.messenger.com','messenger.com'].includes(url.hostname))return null;
    return url.pathname.match(/^\/(\d+)\/?$/)?.[1]|| (url.pathname==='/profile.php'?url.searchParams.get('id')?.match(/^\d+$/)?.[0]:null)||null;
  }catch{return null;}
}
// Discovery reads header metadata only, never message bodies or another person's message IDs.
export function facebookThreads(doc:Document):FacebookThread[] {
  const found:FacebookThread[]=[];
  for(const log of doc.querySelectorAll<HTMLElement>('[role="log"][aria-label]')) {
    if(!visible(log))continue;
    let root:HTMLElement|null=log.parentElement;
    for(let depth=0;root&&depth<12;depth++,root=root.parentElement) {
      if(root.querySelectorAll('[role="log"]').length!==1)break;
      // Skip the entire message subtree rather than querying aria-labels inside it.
      const pending=[...root.children];let header:Element|undefined;
      while(pending.length){const node=pending.shift()!;if(node===log)continue;
        if(node.getAttribute('role')==='button'&&['Cài đặt đoạn chat','Chat settings'].includes(node.getAttribute('aria-label')||'')){header=node;break;}
        pending.push(...node.children);
      }
      if(!header)continue;
      const name=header.querySelector('h2')?.textContent?.trim();
      const links=[...root.querySelectorAll<HTMLAnchorElement>('a[aria-label][href]')].filter(a=>!log.contains(a)&&a.getAttribute('aria-label')===name);
      const ids=new Set(links.map(a=>peerId(a.getAttribute('href')||'')).filter((id):id is string=>!!id));
      if(!name||ids.size!==1)break;
      const id=[...ids][0]!;
      found.push({conversation:{id:`facebook:${id}`,name,source:'facebook',warning:'Chỉ văn bản đã tải của cuộc được chọn. Đóng ô chat giữ lựa chọn nhưng có thể gián đoạn đọc tin.'},root,log});break;
    }
  }
  return found;
}
export function selectedThread(doc:Document,conversation:Conversation):FacebookThread|undefined {
  const matches=facebookThreads(doc).filter(t=>t.conversation.id===conversation.id);
  return matches.length===1?matches[0]:undefined;
}
export function facebookMessages(thread:FacebookThread,limit=100):{messages:ChatMessage[];error?:string} {
  const peer=thread.conversation.id.replace('facebook:','');
  const rows=[...thread.log.querySelectorAll<HTMLElement>('[data-message-id]')].slice(-limit);
  // Validate every row before extracting any text. Never trust an element retained by React alone.
  if(rows.some(row=>!row.dataset.messageId?.startsWith(`${peer}@msgr.`)||row.dataset.messageId.length>180))return {messages:[],error:'Định danh tin không khớp người đã chọn. Đã ngừng đọc.'};
  const messages:ChatMessage[]=[];
  for(const row of rows) {
    const label=row.getAttribute('aria-label')||'';
    const self=/^(?:Lúc\s+[^,]+,\s*Bạn:|At\s+[^,]+,\s*You:)/i.test(label);
    const other=/^(?:Lúc\s+[^,]+,\s*[^:]+:|At\s+[^,]+,\s*[^:]+:)/i.test(label);
    const sender=self?'self':other?'other':'unknown';
    const texts=[...row.querySelectorAll<HTMLElement>('[dir="auto"]')].filter(n=>!n.querySelector('[dir="auto"]')&&!n.closest('[role="button"],[contenteditable="true"],h2,[aria-hidden="true"]'));
    const text=texts.map(n=>n.innerText??n.textContent??'').filter(Boolean).join('\n').trim();
    if(text.length<=4000)messages.push({id:`fb:${row.dataset.messageId}`,sender,text});
  }
  return {messages};
}
export function facebookScroller(thread:FacebookThread):HTMLElement|undefined {
  return [thread.log,...thread.log.querySelectorAll<HTMLElement>('*')].find(n=>n.clientHeight>30&&n.scrollHeight>n.clientHeight+8&&/auto|scroll/.test(getComputedStyle(n).overflowY));
}
