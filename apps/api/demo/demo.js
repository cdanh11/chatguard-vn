const cases = await fetch('./scenarios.json').then(r => r.json());
const $ = id => document.getElementById(id);
const histories = new Map();
let active;
let emitted = 0;
let custom = 0;
function renderMessages() {
  const fragment = document.createDocumentFragment();
  for (const m of histories.get(active.id) || []) {
    const bubble = document.createElement('article');
    bubble.className = `bubble ${m.sender}`;
    bubble.dataset.chatguardMessage = m.id;
    bubble.dataset.sender = m.sender;
    const who = document.createElement('small'); who.textContent = m.sender === 'self' ? 'Tôi' : m.sender==='other'?'Đối phương':'Chưa rõ bên gửi';
    const text = document.createElement('p'); text.dataset.chatguardText = ''; text.textContent = m.text;
    bubble.append(who, text); fragment.append(bubble);
  }
  $('thread').replaceChildren(fragment);
  $('thread').scrollTop = $('thread').scrollHeight;
  $('progress').textContent = `${emitted}/${active.messages.length} tin kịch bản`;
  $('next').disabled = emitted >= active.messages.length;
}
function choose(id) {
  active = cases.find(c => c.id === id) || cases[0];
  if (!histories.has(active.id)) histories.set(active.id, []);
  emitted = histories.get(active.id).filter(m => !m.id.includes('custom')).length;
  $('name').textContent = active.name;
  $('category').textContent = active.category;
  $('avatar').textContent = active.name[0];
  $('thread').dataset.chatguardThread = `demo:${active.id}`;
  $('thread').dataset.chatguardName = active.name;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.id === active.id));
  renderMessages();
}
function next() {
  if (emitted >= active.messages.length) return;
  histories.get(active.id).push({...active.messages[emitted], id: `${active.id}:${emitted}`});
  emitted++; renderMessages();
}
for (const c of cases) {
  const button = document.createElement('button'); button.dataset.id = c.id;
  const label = document.createElement('strong'); label.textContent = c.name;
  const sub = document.createElement('small'); sub.textContent = c.category;
  button.append(label, sub); button.onclick = () => { location.hash = c.id; };
  $('cases').append(button);
}
$('case-count').textContent = cases.length;
$('next').onclick = next;
$('all').onclick = () => { while (emitted < active.messages.length) next(); };
$('reset').onclick = () => { window.dispatchEvent(new Event('chatguard-demo-reset'));histories.set(active.id, []); emitted = 0; renderMessages(); };
$('composer').onsubmit = event => {
  event.preventDefault(); const text = $('message').value.trim(); if (!text) return;
  histories.get(active.id).push({id:`${active.id}:custom:${++custom}`, sender:$('sender').value, text});
  $('message').value = ''; renderMessages();
};
window.addEventListener('hashchange', () => choose(location.hash.slice(1)));
choose(location.hash.slice(1));

$('import-file').onchange=async event=>{
  try {
    const file=event.target.files[0];if(!file)return;
    if(file.size>160000)throw new Error('File vượt 160 KB.');
    const data=JSON.parse(await file.text());
    if(typeof data.name!=='string'||!data.name.trim()||data.name.length>100||!Array.isArray(data.messages)||!data.messages.length||data.messages.length>100)throw new Error('Cần tên và từ 1 đến 100 tin nhắn.');
    let total=0;
    const messages=data.messages.map(m=>{
      if(!m||!['self','other','unknown'].includes(m.sender)||typeof m.text!=='string'||!m.text.trim()||m.text.length>4000)throw new Error('Tin cần sender hợp lệ và text từ 1 đến 4.000 ký tự.');
      total+=m.text.length;return {sender:m.sender,text:m.text};
    });
    if(total>24000)throw new Error('Hội thoại vượt 24.000 ký tự.');
    const c={id:`import-${crypto.randomUUID()}`,name:data.name.trim(),category:'Hội thoại nhập · chưa xác minh nhãn',messages};
    cases.push(c);
    const button=document.createElement('button');button.dataset.id=c.id;button.textContent=c.name;button.onclick=()=>{location.hash=c.id;};$('cases').append(button);$('case-count').textContent=cases.length;
    location.hash=c.id;$('import-status').textContent='Đã nhập. Kết nối và bật bảo vệ rồi phát kịch bản.';
  }catch(error){$('import-status').textContent=`Không nhập được: ${error.message}`;}
  finally{event.target.value='';}
};
$('export-case').onclick=()=>{
  const messages=(histories.get(active.id)||[]).map(({sender,text})=>({sender,text}));
  if(!messages.length){$('import-status').textContent='Phát ít nhất một tin trước khi xuất.';return;}
  const url=URL.createObjectURL(new Blob([JSON.stringify({name:active.name,messages},null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='chatguard-conversation.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
