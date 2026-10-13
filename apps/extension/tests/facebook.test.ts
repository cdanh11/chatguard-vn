import {beforeEach,describe,expect,it,vi} from 'vitest';
import {facebookThreads,facebookMessages,selectedThread} from '../lib/facebook';
import {Scope} from '../lib/scope';

function popup(id:string,name:string,text='private',sender='Bạn') {
  return `<section><a href="/${id}/" aria-label="${name}"></a><button role="button" aria-label="Cài đặt đoạn chat"><h2>${name}</h2></button><div role="log" aria-label="Tin nhắn trong cuộc trò chuyện với ${name}"><div role="article"><div data-message-id="${id}@msgr.1" aria-label="Lúc 22:22, ${sender}: ${text}"><span dir="auto"><div dir="auto">${text}</div></span></div><button role="button"><span dir="auto">Nhập, bản sao trợ năng</span></button></div></div><div role="textbox" contenteditable="true" aria-label="Viết cho ${name}"></div></section>`;
}
beforeEach(()=>{vi.spyOn(HTMLElement.prototype,'getClientRects').mockImplementation(function(this:HTMLElement){return (this.hidden?[]:[{width:300,height:400}]) as unknown as DOMRectList;});});
describe('Facebook popup adapter',()=>{
  it('discovers five headers without accessing their message text',()=>{
    document.body.innerHTML=Array.from({length:5},(_,i)=>popup(String(1001+i),`Person ${i}`)).join('');
    for(const el of document.querySelectorAll('[data-message-id]'))Object.defineProperty(el,'innerText',{get(){throw new Error('message read during discovery');}});
    for(const el of document.querySelectorAll('[role="log"] [role="button"]')) {
      const original=el.getAttribute.bind(el);vi.spyOn(el,'getAttribute').mockImplementation(name=>{if(name==='aria-label')throw new Error('message accessibility label read during discovery');return original(name);});
    }
    expect(facebookThreads(document)).toHaveLength(5);
  });
  it('reads only selected A even when five chats are mounted',()=>{
    document.body.innerHTML=Array.from({length:5},(_,i)=>popup(String(1001+i),`Person ${i}`,i===0?'hello':'secret-other','Person')).join('');
    const a=facebookThreads(document)[0]!;const messages=facebookMessages(a).messages;
    expect(messages).toEqual([{id:'fb:1001@msgr.1',sender:'other',text:'hello'}]);
    expect(JSON.stringify(messages)).not.toContain('secret-other');
  });
  it('does not trust equal names and rejects a mismatched message prefix',()=>{
    document.body.innerHTML=popup('1001','Same')+popup('1002','Same');const a=facebookThreads(document)[0]!;
    expect(selectedThread(document,a.conversation)?.conversation.id).toBe('facebook:1001');
    a.log.querySelector('[data-message-id]')!.setAttribute('data-message-id','1002@msgr.1');expect(facebookMessages(a).error).toBeTruthy();expect(facebookMessages(a).messages).toEqual([]);
  });
  it('deduplicates remounts and retains selection while closed without reading B',()=>{
    document.body.innerHTML=popup('1001','A','one')+popup('1002','B','secret');const a=facebookThreads(document)[0]!;
    const scope=new Scope();scope.start(a.conversation,'s');scope.capture(a.conversation,facebookMessages(a).messages);
    a.root.remove();scope.availability(false);expect(selectedThread(document,a.conversation)).toBeUndefined();expect(scope.state.status).toBe('watching');expect(scope.state.messages).toHaveLength(1);
    document.body.insertAdjacentHTML('beforeend',popup('1001','A','one'));const restored=selectedThread(document,a.conversation)!;
    scope.availability(true);scope.capture(restored.conversation,facebookMessages(restored).messages);expect(scope.state.messages).toHaveLength(1);expect(scope.state.conversation?.id).toBe('facebook:1001');
  });
  it('keeps chronological order while backfilling and caps the last 300',()=>{
    const a={id:'facebook:1001',name:'A',source:'facebook' as const};const scope=new Scope();scope.start(a,'s',300);
    const msg=(i:number)=>({id:`m${i}`,sender:'other' as const,text:`message ${i}`});
    scope.capture(a,Array.from({length:30},(_,i)=>msg(i+370)));
    scope.capture(a,Array.from({length:400},(_,i)=>msg(i)),true);
    expect(scope.state.messages).toHaveLength(300);expect(scope.state.messages[0]?.id).toBe('m100');expect(scope.state.messages.at(-1)?.id).toBe('m399');
    scope.capture(a,[{id:'m399',sender:'other',text:''}]);expect(scope.state.messages.some(m=>m.id==='m399')).toBe(false);
  });
  it('does not infer unknown layouts or select duplicate identities',()=>{
    document.body.innerHTML=popup('1001','A')+popup('1001','A');expect(selectedThread(document,facebookThreads(document)[0]!.conversation)).toBeUndefined();
    document.body.innerHTML='<div role="log" aria-label="Someone">private</div>';expect(facebookThreads(document)).toEqual([]);
  });
});
