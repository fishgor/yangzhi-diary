import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 使用相对路径，便于部署到任意子路径（如 GitHub Pages 的 /repo/）
export default defineConfig({
  base: './',
  plugins: [react()],
});
