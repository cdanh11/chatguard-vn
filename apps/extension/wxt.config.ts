import { defineConfig } from 'wxt';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readerBuild() {
  const hash=createHash('sha256');
  for(const file of ['entrypoints/guard.content.ts','lib/adapters.ts','lib/facebook.ts','lib/scope.ts','lib/types.ts','lib/reader-version.ts']) {
    hash.update(file).update(readFileSync(resolve(__dirname,file)));
  }
  return `reader-${hash.digest('hex').slice(0,10)}`;
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Use the user's existing Brave profile, loaded manually once. Never launch a second profile.
  webExt: {disabled:true},
  dev: {server:{host:'127.0.0.1',port:3001}},
  vite: () => ({define:{__CHATGUARD_READER_BUILD__:JSON.stringify(readerBuild())}}),
  hooks: {
    'server:created': (_wxt,server) => {
      const original=server.reloadContentScript.bind(server);
      let previous:string|undefined;
      server.reloadContentScript=payload=>{
        if(payload.registration!=='runtime'){original(payload);return;}
        // Our reader is injected with activeTab, not registered. WXT's default runtime
        // reloader therefore has no registered script to update. Reload this dev extension
        // when its compiled reader changes; never reload or inspect unrelated Facebook tabs.
        const next=readerBuild();const changed=previous!==undefined&&previous!==next;previous=next;
        if(changed)server.reloadExtension();else original(payload);
      };
    },
  },
  manifest: () => ({
    name: 'ChatGuard VN',
    version: '0.1.0',
    version_name: readerBuild(),
    description: 'Bật bảo vệ cho một cuộc trò chuyện và xem cảnh báo có bằng chứng.',
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
    host_permissions: ['http://127.0.0.1:8000/*'],
    action: { default_title: 'Mở ChatGuard VN' },
    minimum_chrome_version: '116',
  }),
});
