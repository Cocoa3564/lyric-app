import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // 「@」を「src」フォルダの絶対パスに置き換える設定
      '@': path.resolve(__dirname, './src'),
    },
  },
});
