import { defineConfig } from 'wxt';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readerBuild() {
  const hash=createHash('sha256');
  for(const file of ['entrypoints/guard.content.ts','lib/adapters.ts','lib/facebook.ts','lib/scope.ts','lib/types.ts','lib/reader-version.ts','lib/page-indicator.ts']) {
    hash.update(file).update(readFileSync(resolve(__dirname,file)));
  }
  return `reader-${hash.digest('hex').slice(0,10)}`;
}

function outputFingerprint(outDir:string) {
  try {
    return createHash('sha256').update(readFileSync(resolve(outDir,'manifest.json'))).update(readFileSync(resolve(outDir,'content-scripts/guard.js'))).digest('hex');
  }catch{return undefined;}
}

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Use the user's existing Brave profile, loaded manually once. Never launch a second profile.
  webExt: {disabled:true},
  dev: {server:{host:'127.0.0.1',port:3001}},
  hooks: {
    // WXT's Vite builder retains its initial config during partial dev rebuilds.
    // Stamp at each actual build, then derive manifest version from that artifact.
    'vite:build:extendConfig': (_entries,config) => {
      config.define={...config.define,__CHATGUARD_READER_BUILD__:JSON.stringify(readerBuild())};
    },
    'build:manifestGenerated': (wxt,manifest) => {
      const reader=readFileSync(resolve(wxt.config.outDir,'content-scripts/guard.js'),'utf8');
      const stamp=reader.match(/["'`](reader-[a-f0-9]{10})["'`]/)?.[1];
      if(!stamp)throw new Error('Missing compiled reader build stamp');
      manifest.version_name=stamp;
    },
    'server:created': (wxt,server) => {
      const original=server.reloadContentScript.bind(server);
      let previous=outputFingerprint(wxt.config.outDir);
      server.reloadContentScript=payload=>{
        if(payload.registration!=='runtime'){original(payload);return;}
        // Our reader is injected with activeTab, not registered. WXT's default runtime
        // reloader therefore has no registered script to update. Reload this dev extension
        // when its compiled reader changes; never reload or inspect unrelated Facebook tabs.
        const next=outputFingerprint(wxt.config.outDir);const changed=previous!==undefined&&next!==undefined&&previous!==next;previous=next;
        // No default runtime-reloader call: it cannot update executeScript readers.
        // Including manifest content catches permission/version changes on restart.
        if(changed)server.reloadExtension();
      };
    },
  },
  manifest: () => ({
    name: 'ChatGuard VN',
    version: '0.1.0',
    version_name: readerBuild(),
    description: 'Bật bảo vệ cho một cuộc trò chuyện và xem cảnh báo có bằng chứng.',
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel', 'alarms'],
    host_permissions: ['http://127.0.0.1:8000/*'],
    action: { default_title: 'Mở ChatGuard VN' },
    minimum_chrome_version: '120',
  }),
});
