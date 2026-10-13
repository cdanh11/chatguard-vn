import {browser} from 'wxt/browser';
import {describe,conversations,readMessages} from '../lib/adapters';
import {selectedThread,facebookMessages,facebookScroller} from '../lib/facebook';
import {Scope} from '../lib/scope';
import {READER_BUILD} from '../lib/reader-version';

export default defineContentScript({
  matches:['http://127.0.0.1:8000/*'],registration:'runtime',
  main(ctx) {
    const win=window as unknown as Record<string,unknown>;
    if(win.__chatguardInstalled)return;win.__chatguardInstalled=true;
    const scope=new Scope();let lastLocation=location.href,lastSnapshot='',loading=false;
    let timer:ReturnType<typeof ctx.setTimeout>|undefined;
    const choices=()=>conversations(document,new URL(location.href));
    const publish=()=>{const key=JSON.stringify(scope.state);if(key!==lastSnapshot){lastSnapshot=key;void browser.runtime.sendMessage({type:'GUARD_STATE',snapshot:scope.state}).catch(()=>{});}};
    const capture=(prepend=false)=>{
      if(scope.state.status!=='watching')return;
      const chosen=scope.state.conversation!;
      if(chosen.source==='facebook') {
        const thread=selectedThread(document,chosen);scope.availability(!!thread);
        if(!thread){publish();return;}
        const read=facebookMessages(thread,scope.state.historyLimit);
        if(read.error){scope.stop(read.error);publish();return;}
        scope.capture(thread.conversation,read.messages,prepend);
      }else {
        const current=describe(document,new URL(location.href));
        if(!scope.verify(current)){publish();return;}
        const read=readMessages(document,current!);
        if(read.error){scope.stop(read.error);publish();return;}
        scope.capture(current,read.messages);
      }
      publish();
    };
    const verifyRoute=()=>{
      if(lastLocation!==location.href){lastLocation=location.href;if(scope.state.status==='watching')scope.stop('Đường dẫn đã đổi. Đã dừng và xóa phiên; chọn lại cuộc để tiếp tục.');publish();}
    };
    async function history() {
      if(loading||scope.state.status!=='watching'||scope.state.conversation?.source!=='facebook')return;
      loading=true;const session=scope.state.sessionId;let unchanged=0,previous='';
      scope.state={...scope.state,historyLoading:true,historyNote:'Đang nạp lịch sử của đúng người đã chọn…'};publish();
      try {
        for(let attempt=0;attempt<32;attempt++) {
          if(scope.state.sessionId!==session||scope.state.status!=='watching')break;
          const thread=selectedThread(document,scope.state.conversation!);if(!thread)break;
          capture(true);
          if(scope.state.messages.length>=(scope.state.historyLimit||100))break;
          const scroller=facebookScroller(thread);if(!scroller)break;
          const key=scope.state.messages.map(m=>m.id).join('|');unchanged=key===previous?unchanged+1:0;previous=key;
          if(unchanged>=4)break;
          scroller.scrollTop=0;
          await new Promise<void>(resolve=>ctx.setTimeout(resolve,600));
        }
        if(scope.state.sessionId===session) {
          capture(true);
          const thread=scope.state.conversation&&selectedThread(document,scope.state.conversation);
          const scroller=thread&&facebookScroller(thread);if(scroller)scroller.scrollTop=scroller.scrollHeight;
          scope.state={...scope.state,historyLoading:false,historyNote:`Đã giữ ${scope.state.messages.length}/${scope.state.historyLimit||100} tin văn bản. Có thể ít hơn do giới hạn ký tự, lịch sử hoặc giao diện Facebook.`};publish();
        }
      }catch {
        if(scope.state.sessionId===session){scope.state={...scope.state,historyLoading:false,historyNote:'Nạp lịch sử bị gián đoạn. Mở lại đúng cuộc và thử lại.'};publish();}
      }finally{loading=false;}
    }
    const observer=new MutationObserver(()=>{verifyRoute();if(scope.state.status!=='watching')return;clearTimeout(timer);timer=ctx.setTimeout(()=>capture(loading),450);});
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','data-message-id','hidden','style']});
    ctx.setInterval(()=>{verifyRoute();if(scope.state.status==='watching')capture(loading);},1000);
    ctx.onInvalidated(()=>{observer.disconnect();clearTimeout(timer);scope.stop();delete win.__chatguardInstalled;});
    ctx.addEventListener(window,'chatguard-demo-reset',()=>{if(scope.state.conversation?.source==='demo'){scope.stop('Đã làm lại kịch bản. Bật lại bảo vệ để bắt đầu phiên mới.');publish();}});
    const onMessage=(message:{type:string;allowFacebook?:boolean;id?:string;conversationId?:string;historyLimit?:number},sender:{id?:string})=>{
      if(sender.id!==browser.runtime.id)return;
      if(message.type==='GUARD_DESCRIBE') {
        const available=choices();return Promise.resolve({readerBuild:READER_BUILD,conversations:available,conversation:scope.state.conversation||(available.length===1?available[0]:null),snapshot:scope.state});
      }
      if(message.type==='GUARD_START') {
        const available=choices();const current=message.conversationId?available.find(c=>c.id===message.conversationId):available.length===1?available[0]:undefined;
        if(!current)return Promise.resolve({error:'Chọn đúng một người trong các ô chat đang mở. Mở lại ô chat nếu chưa thấy đối tượng.'});
        if(current.source==='facebook'&&!message.allowFacebook)return Promise.resolve({error:'Chưa bật bộ đọc Facebook trong cấu hình.'});
        lastLocation=location.href;scope.start(current,crypto.randomUUID(),message.historyLimit===300?300:100);publish();capture();return Promise.resolve({snapshot:scope.state});
      }
      if(message.type==='GUARD_STOP'){scope.stop();publish();return Promise.resolve({snapshot:scope.state});}
      if(message.type==='GUARD_HISTORY'){void history();return Promise.resolve({ok:true});}
      if(message.type==='GUARD_FOCUS') {
        const chosen=scope.state.conversation;
        if(scope.state.status!=='watching'||!chosen||!scope.state.messages.some(m=>m.id===message.id))return Promise.resolve({error:'Tin không còn trong phạm vi đang bảo vệ.'});
        let row:HTMLElement|undefined;
        if(chosen.source==='facebook') {
          const thread=selectedThread(document,chosen);
          row=thread&&[...thread.log.querySelectorAll<HTMLElement>('[data-message-id]')].find(n=>`fb:${n.dataset.messageId}`===message.id);
        }else if(scope.verify(describe(document,new URL(location.href))))row=[...document.querySelectorAll<HTMLElement>('[data-chatguard-thread] [data-chatguard-message]')].find(n=>n.dataset.chatguardMessage===message.id);
        if(!row)return Promise.resolve({error:'Tin chưa được tải trên màn hình. Mở lại đúng cuộc hoặc cuộn tìm tin.'});
        row.scrollIntoView({block:'center',behavior:'smooth'});row.animate([{outline:'3px solid #dd9c28'},{outline:'3px solid transparent'}],{duration:2200});return Promise.resolve({ok:true});
      }
    };
    browser.runtime.onMessage.addListener(onMessage);
    ctx.onInvalidated(()=>browser.runtime.onMessage.removeListener(onMessage));
  },
});
