import { browser } from 'wxt/browser';
import { describe, readMessages } from '../lib/adapters';
import { Scope } from '../lib/scope';
import type { Snapshot } from '../lib/types';

export default defineContentScript({
  // WXT also derives persistent host permissions from matches. Real chat sites use activeTab only.
  matches:['http://127.0.0.1:8000/*'],
  registration:'runtime',
  main(ctx) {
    const marker = '__chatguardInstalled';
    const win = window as unknown as Record<string, unknown>;
    if (win[marker]) return;
    win[marker] = true;
    const scope = new Scope();
    let lastLocation = location.href;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastSnapshot = '';
    const conversation = () => describe(document, new URL(location.href));
    const publish = () => {
      const key = JSON.stringify(scope.state);
      if (key !== lastSnapshot) {
        lastSnapshot = key;
        void browser.runtime.sendMessage({type:'GUARD_STATE', snapshot:scope.state}).catch(() => {});
      }
    };
    const capture = () => {
      if (scope.state.status !== 'watching') return;
      const current = conversation();
      if (!scope.verify(current)) {publish(); return;}
      const read = readMessages(document, current!);
      if (read.error) {scope.stop(read.error); publish(); return;}
      scope.capture(current, read.messages); publish();
    };
    const verifyRoute = () => {
      if (lastLocation !== location.href) {
        lastLocation = location.href;
        if (scope.state.status === 'watching') scope.stop('Đường dẫn đã đổi. Đã dừng và xóa phiên; chọn lại cuộc để tiếp tục.');
        publish();
      }
    };
    const observer = new MutationObserver(() => {
      verifyRoute();
      if (scope.state.status !== 'watching') return;
      // Verify identity before reading any message nodes, even when only the DOM changed.
      if (!scope.verify(conversation())) {publish();return;}
      clearTimeout(timer); timer = ctx.setTimeout(capture, 500);
    });
    observer.observe(document.body, {childList:true, subtree:true, characterData:true});
    ctx.setInterval(() => {verifyRoute(); if (scope.state.status === 'watching' && !scope.verify(conversation())) publish();}, 350);
    ctx.onInvalidated(() => {observer.disconnect(); clearTimeout(timer); scope.stop(); delete win[marker];});
    window.addEventListener('chatguard-demo-reset',()=>{if(conversation()?.source==='demo'){scope.stop('Đã làm lại kịch bản. Bật lại bảo vệ để bắt đầu phiên mới.');publish();}});
    browser.runtime.onMessage.addListener((message: {type:string; allowFacebook?:boolean; id?:string}, sender) => {
      if (sender.id !== browser.runtime.id) return;
      if (message.type === 'GUARD_DESCRIBE') return Promise.resolve({conversation:conversation(), snapshot:scope.state});
      if (message.type === 'GUARD_START') {
        const current = conversation();
        if (!current) return Promise.resolve({error:'Mở trang chat thử hoặc cuộc Facebook dạng /messages/t/… trước.'});
        if (current.source === 'facebook' && !message.allowFacebook) return Promise.resolve({error:'Bộ đọc Facebook chưa được bạn bật trong cấu hình thử nghiệm.'});
        lastLocation = location.href;
        scope.start(current, crypto.randomUUID());
        const initial: Snapshot = structuredClone(scope.state);
        publish(); capture();
        return Promise.resolve({snapshot:scope.state, startedSession:initial.sessionId});
      }
      if (message.type === 'GUARD_STOP') {scope.stop(); publish(); return Promise.resolve({snapshot:scope.state});}
      if(message.type==='GUARD_FOCUS') {
        const current=conversation();
        if(scope.state.status!=='watching'||!scope.verify(current)||current?.source!=='demo'||!scope.state.messages.some(m=>m.id===message.id)) return Promise.resolve({error:'Tin không còn trong phạm vi đang bảo vệ.'});
        const row=[...document.querySelectorAll<HTMLElement>('[data-chatguard-thread] [data-chatguard-message]')].find(row=>row.dataset.chatguardMessage===message.id);
        if(!row)return Promise.resolve({error:'Tin hiện không có trên màn hình.'});
        row.scrollIntoView({block:'center',behavior:'smooth'});row.animate([{outline:'3px solid #dd9c28'},{outline:'3px solid transparent'}],{duration:2200});
        return Promise.resolve({ok:true});
      }
    });
  },
});
