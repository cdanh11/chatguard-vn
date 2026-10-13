export type ChatMessage = { id: string; sender: 'self' | 'other' | 'unknown'; text: string };
export type Conversation = { id: string; name: string; source: 'demo' | 'facebook'; warning?: string };
export type Snapshot = {
  status: 'idle' | 'watching' | 'paused';
  conversation: Conversation | null;
  sessionId: string;
  revision: number;
  messages: ChatMessage[];
  reason: string;
  coverage: string;
  availability?: 'reading' | 'waiting';
  historyLimit?: 100 | 300;
  historyLoading?: boolean;
  historyNote?: string;
};
export type Assessment = {
  conversation_id: string; session_id: string; revision: number;
  provider: 'rules' | 'groq'; analyzed_count: number;
  level: 'no_signal' | 'review' | 'high_concern' | 'insufficient_context';
  summary: string;
  signals: { kind: string; title: string; evidence_ids: string[] }[];
  actions: string[]; limitations: string[];
};
export type Settings = { token: string; provider: 'rules' | 'groq'; externalConsent: boolean; facebookEnabled: boolean };
export type TabState = { snapshot: Snapshot; result?: Assessment; error?: string; analyzing?: boolean; waitingUntil?:number; startedAt?:number; retryAt?:number; completedAt?:number };
export type Health = {status:'ok'; groq_configured:boolean; groq_model:string; version:string};
export const API = 'http://127.0.0.1:8000';
export const EMPTY: Snapshot = {status:'idle', conversation:null, sessionId:'', revision:0, messages:[], reason:'Chưa chọn cuộc trò chuyện.', coverage:'Chưa đọc nội dung.'};
export const DEFAULT_SETTINGS: Settings = { token:'', provider:'rules', externalConsent:false, facebookEnabled:false };
