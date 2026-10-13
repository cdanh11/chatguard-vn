import { describe,expect,it } from 'vitest';
import { Scope,isCurrent } from '../lib/scope';
import { describe as describeConversation,readMessages } from '../lib/adapters';
import type { ChatMessage,Conversation } from '../lib/types';

const a:Conversation={id:'demo:a',name:'A',source:'demo'};
const b:Conversation={id:'demo:b',name:'B',source:'demo'};
const message=(id:string,text='hello'):ChatMessage=>({id,sender:'other',text});
describe('selected conversation lifecycle',()=>{
  it('does not capture before consent',()=>{const scope=new Scope();scope.capture(a,[message('private')]);expect(scope.state.messages).toEqual([]);});
  it('stops and clears on A → B, does not resume automatically on A',()=>{
    const scope=new Scope();scope.start(a,'s1');scope.capture(a,[message('a1')]);
    scope.capture(b,[message('private-b')]);expect(scope.state.messages).toEqual([]);expect(scope.state.status).toBe('paused');
    scope.capture(a,[message('a2')]);expect(scope.state.messages).toEqual([]);
  });
  it('deduplicates rerenders and updates edited messages',()=>{
    const scope=new Scope();scope.start(a,'s1');scope.capture(a,[message('m1')]);const revision=scope.state.revision;
    scope.capture(a,[message('m1')]);expect(scope.state.revision).toBe(revision);
    scope.capture(a,[message('m1','edited')]);expect(scope.state.messages).toHaveLength(1);expect(scope.state.messages[0]?.text).toBe('edited');
  });
  it('bounds both count and characters',()=>{
    const scope=new Scope();scope.start(a,'s1');scope.capture(a,Array.from({length:1000},(_,i)=>message(String(i))));
    expect(scope.state.messages).toHaveLength(100);expect(scope.state.messages[0]?.id).toBe('900');
    scope.capture(a,Array.from({length:100},(_,i)=>message(`long${i}`,'a'.repeat(4000))));
    expect(scope.state.messages).toHaveLength(6);
  });
  it('rejects late results after new message, stop, or new session',()=>{
    const scope=new Scope();scope.start(a,'s1');scope.capture(a,[message('m1')]);
    const result={conversation_id:a.id,session_id:'s1',revision:scope.state.revision};
    expect(isCurrent(scope.state,result)).toBe(true);
    scope.capture(a,[message('m2')]);expect(isCurrent(scope.state,result)).toBe(false);
    scope.stop();expect(isCurrent(scope.state,result)).toBe(false);
    scope.start(a,'s2');expect(isCurrent(scope.state,result)).toBe(false);
  });
  it('stops on loss of identity',()=>{const scope=new Scope();scope.start(a,'s1');expect(scope.verify(null)).toBe(false);expect(scope.state.messages).toEqual([]);});
});
describe('adapters',()=>{
  it('reads only demo thread, never the sidebar',()=>{
    document.body.innerHTML='<aside>private sidebar</aside><section data-chatguard-thread="demo:a" data-chatguard-name="A"><article data-chatguard-message="m1" data-sender="other"><p data-chatguard-text>hello</p></article></section>';
    const text=document.querySelector<HTMLElement>('[data-chatguard-text]')!;Object.defineProperty(text,'innerText',{value:'hello'});
    const c=describeConversation(document,new URL('http://127.0.0.1:8000/demo/#a'))!;
    expect(c.id).toBe('demo:a');expect(readMessages(document,c).messages).toEqual([message('m1')]);
    expect(readMessages(document,b).messages).toEqual([]);
  });
  it('rejects conflicting route identity and unsupported hosts',()=>{
    document.body.innerHTML='<section data-chatguard-thread="demo:a"></section>';
    expect(describeConversation(document,new URL('http://127.0.0.1:8000/demo/#b'))).toBeNull();
    expect(describeConversation(document,new URL('https://evil.example/t/123'))).toBeNull();
  });
  it('facebook ambiguous DOM returns no content',()=>{
    document.body.innerHTML='<main role="main"><p>private text</p></main>';
    const c=describeConversation(document,new URL('https://www.facebook.com/messages/t/123'))!;
    expect(c.source).toBe('facebook');expect(readMessages(document,c).messages).toEqual([]);
  });
});
