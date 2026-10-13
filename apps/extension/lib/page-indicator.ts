import type {Indicator} from './types';

export class PageIndicator {
  private host?:HTMLElement;
  private button?:HTMLButtonElement;
  private previous='';
  constructor(private open:()=>void) {}
  render(indicator:Indicator) {
    if(indicator.kind==='off'){this.destroy();return;}
    const key=JSON.stringify(indicator);if(this.previous===key&&this.host?.isConnected)return;
    this.previous=key;
    if(!this.host?.isConnected) {
      this.host=document.createElement('div');this.host.dataset.chatguardIndicator='';
      this.host.style.cssText='position:fixed;bottom:18px;left:18px;z-index:2147483646;display:block;width:max-content;height:auto;';
      const shadow=this.host.attachShadow({mode:'closed'});
      const style=document.createElement('style');style.textContent=`:host{all:initial}button{all:initial;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:8px;font:600 12px/1.4 system-ui,sans-serif;background:#fff;color:#476357;border:1px solid #d8e3dc;border-radius:24px;padding:5px 12px 5px 5px;box-shadow:0 3px 16px #102a2520;max-width:240px}button:focus-visible{outline:3px solid #78b19a;outline-offset:3px}.symbol{display:grid;place-items:center;min-width:28px;height:28px;border-radius:50%;font-size:19px;background:var(--color);color:#fff}.review,.high_concern{border-color:var(--color)}.review .symbol,.high_concern .symbol{animation:ping .8s ease-out 2}@keyframes ping{50%{box-shadow:0 0 0 5px #d8895030}}@media(prefers-reduced-motion:reduce){.symbol{animation:none!important}}`;
      this.button=document.createElement('button');this.button.type='button';this.button.addEventListener('click',this.open);
      shadow.append(style,this.button);document.documentElement.append(this.host);
    }
    this.host!.dataset.state=indicator.kind;
    this.host!.title=indicator.label;
    const button=this.button!;button.className=indicator.kind;button.style.setProperty('--color',indicator.color);button.title=indicator.label;button.setAttribute('aria-label',indicator.label);
    const symbol=document.createElement('span');symbol.className='symbol';symbol.textContent=indicator.text;symbol.setAttribute('aria-hidden','true');
    const text=document.createElement('span');text.textContent=indicator.kind==='high_concern'||indicator.kind==='review'?'Cần kiểm chứng':indicator.kind==='error'?'Chưa cập nhật':'ChatGuard';
    button.replaceChildren(symbol,text);
  }
  destroy(){this.host?.remove();this.host=undefined;this.button=undefined;this.previous='';}
  hint(text:string){if(this.button){this.button.title=text;this.button.setAttribute('aria-label',text);if(this.button.lastChild)this.button.lastChild.textContent=text;}}
}
