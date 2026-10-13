import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ChatGuard VN',
    description: 'Bật bảo vệ cho một cuộc trò chuyện và xem cảnh báo có bằng chứng.',
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
    host_permissions: ['http://127.0.0.1:8000/*'],
    action: { default_title: 'Mở ChatGuard VN' },
    minimum_chrome_version: '116',
  },
});
