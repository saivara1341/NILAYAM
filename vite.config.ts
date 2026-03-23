import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const base =
    env.BASE_PATH ||
    (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/');

  return {
    base,
    server: {
      port: 5173,
        host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        injectRegister: 'auto',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'logo.svg'],
        manifest: {
          name: 'Nilayam Property Management',
          short_name: 'Nilayam',
          description: 'Intelligent Property Management Platform',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'home.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'home.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: 'home.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('@google/genai') || id.includes('@google/generative-ai')) return 'ai-sdk';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
