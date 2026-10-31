import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',

        includeAssets: [
          'favicon.svg',
          'icons/*.png',
        ],

        manifest: false,

        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,

          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,json}'],

          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/rest/, /supabase/],

          // Aucune réponse Supabase ne sera mise en cache.
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.hostname.endsWith('.supabase.co'),
              handler: 'NetworkOnly',
            },
          ],
        },

        devOptions: {
          enabled: false,
        },
      }),
    ],

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
