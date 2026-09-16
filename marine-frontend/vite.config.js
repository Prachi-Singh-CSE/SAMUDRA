import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'Samudra Marine Intelligence',
        short_name: 'Samudra',
        description: 'Marine intelligence and safety assistant',
        theme_color: '#0f766e',
        background_color: '#f4fbfa',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },

<<<<<<< HEAD
      // The dev-mode service worker (devOptions.enabled: true) precaches
      // '/index.html' and falls back to it for all navigations. During a
      // normal dev session (HMR, fast refresh, editing files) the cached
      // shell can go stale and get served instead of the live app, which
      // shows up as the page glitching and then going solid black after a
      // while. The service worker (and offline/PWA install behaviour) is
      // still fully built and testable via `npm run build && npm run
      // preview` — it just no longer runs during `npm run dev`.
      devOptions: {
        enabled: false,
=======
      devOptions: {
        enabled: true,
>>>>>>> a9be354893841ff2595f723a7cdbaec5e7a1e3bc
      },
    }),
  ],
})