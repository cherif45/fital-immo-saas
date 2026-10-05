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
        // Le SW se met � jour automatiquement quand une nouvelle version est d�ploy�e
        registerType: 'autoUpdate',

        // Injecte automatiquement l'enregistrement du SW dans le build
        injectRegister: 'auto',

        // Fichiers inclus dans le pr�-cache (uniquement des assets statiques)
        includeAssets: [
          'favicon.svg',
          'icons/*.png',
        ],

        // R�f�rence au manifest existant (public/manifest.json)
        manifest: false, // On utilise notre propre manifest.json dans public/

        // Configuration du Service Worker (Workbox)
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // Pattern des fichiers � pr�-cacher
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,json}'],

          // Nettoyage automatique des anciens caches

          // Taille max d'un fichier � pr�-cacher (5 MB)
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

          // ?? IMPORTANT : NE JAMAIS intercepter les mutations
          // On laisse passer toutes les requ�tes non-GET
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/rest/, /supabase/],

          runtimeCaching: [
            // ? GET Supabase ? NetworkFirst (fra�cheur prioritaire)
            {
              urlPattern: ({ url, request }) =>
                url.hostname.includes('supabase.co') && request.method === 'GET',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-get-v1',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 5, // ?? 5 MINUTES max
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // ? RPC Supabase lecture ? NetworkFirst court
            {
              urlPattern: ({ url, request }) =>
                url.pathname.includes('/rest/v1/rpc/') && request.method === 'POST',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rpc-v1',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 2, // ?? 2 MINUTES max
                },
              },
            },
            // ? Toutes les autres mutations ? JAMAIS de cache
            {
              urlPattern: ({ request }) =>
                ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method),
              handler: 'NetworkOnly',
            },
          ],
        },

        // ?? D�sactiv� en dev (�vite les faux bugs de cache)
        devOptions: {
          enabled: false,
        },
      }),
    ],

    // ============================================================
    // OPTIMISATION BUNDLE SPLITTING
    // Separe les librairies communes en chunks caches par le navigateur
    // ============================================================
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Librairies principales (cache long terme)
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
      // Alerte a 600 KB au lieu de 500 KB
      chunkSizeWarningLimit: 600,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});