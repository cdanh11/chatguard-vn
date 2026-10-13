import type { Assessment, ChatMessage, Settings } from './types';

export const GROQ_INTERVAL_MS=30000;
export function selectContext(messages:ChatMessage[], provider:Settings['provider']):ChatMessage[] {
  if(provider==='rules') return messages;
  const selected:ChatMessage[]=[];let chars=0;
  for(const message of messages.slice(-40).reverse()) {
    if(chars+message.text.length>6000) break;
    selected.unshift(message);chars+=message.text.length;
  }
  return selected;
}

export function retryDelay(value:string|null):number {
  if(!value) return 60000;
  const seconds=Number(value);
  const milliseconds=Number.isFinite(seconds)?seconds*1000:Date.parse(value)-Date.now();
  return Number.isFinite(milliseconds)?Math.min(3600000,Math.max(1000,milliseconds)):60000;
}

export function validAssessment(value:unknown,messages:ChatMessage[],provider:Settings['provider']):value is Assessment {
  if(!value||typeof value!=='object') return false;
  const v=value as Assessment;
  const strings=(items:unknown,max:number)=>Array.isArray(items)&&items.length<=max&&items.every(i=>typeof i==='string');
  if(!['no_signal','review','high_concern','insufficient_context'].includes(v.level)
    ||v.provider!==provider||v.analyzed_count!==messages.length||typeof v.summary!=='string'||!v.summary||v.summary.length>1200
    ||!strings(v.actions,6)||!strings(v.limitations,6)||!Array.isArray(v.signals)||v.signals.length>12) return false;
  const ids=new Set(messages.map(m=>m.id));
  if(v.signals.some(s=>!s||typeof s.kind!=='string'||!s.kind||s.kind.length>80||typeof s.title!=='string'||!s.title||s.title.length>160
    ||!strings(s.evidence_ids,8)||!s.evidence_ids.length||s.evidence_ids.some(id=>!ids.has(id)))) return false;
  return !['review','high_concern'].includes(v.level)||v.signals.length>0;
}
