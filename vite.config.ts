import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      manifest: {
        name: "Inventory Manager",
        short_name: "InvManager",
        description: "Système d'inventaire simplifié pour bars",
        theme_color: "#4f46e5",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",

        // ✅ CORRECTION ICI
        start_url: "/login",

        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        // ✅ Fallback simple pour offline
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],

        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3
            }
          }
        ]
      },

      devOptions: {
        enabled: true
      }
    })
  ]
})