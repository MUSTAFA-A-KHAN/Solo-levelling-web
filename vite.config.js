import { defineConfig } from 'vite';
import { resolve } from 'path';

const repo = 'Solo-levelling-web';

export default defineConfig(({ command, mode }) => {
  const isProd = mode === 'production';
  return {
    base: isProd ? `/${repo}/` : '/',
    server: {
      open: true,
      host: true
    },
    build: {
      outDir: 'dist',
      assetsInlineSize: 5000,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          privacy: resolve(__dirname, 'privacy.html'),
          terms: resolve(__dirname, 'terms.html'),
          contact: resolve(__dirname, 'contact.html')
        }
      },
      assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.webp'],
      cssCodeSplit: true
    }
  };
});
