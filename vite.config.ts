/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  // Hot Module Replacement - Auto-Reload bei Code-Änderungen
  server: {
    allowedHosts: true,
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws',
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
    // Proxy: Auth- und REST-Aufrufe an den Auth-Server weiterleiten.
    // Funktioniert für localhost UND Cloudflare-Tunnel — der Browser
    // braucht keine direkte Verbindung zum Auth-Server.
    proxy: {
      '/auth/v1': {
        target: process.env.AUTH_SERVER_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
      '/rest/v1': {
        target: process.env.AUTH_SERVER_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Düngungsberater',
        short_name: 'Dünger',
        description: 'Düngeplanung für Landwirte nach LfL-Basisdaten Bayern. Nährstoffbedarf berechnen, Korrekturfaktoren anwenden, Produktempfehlungen erhalten.',
        theme_color: '#15803d',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'Meine Felder',
            short_name: 'Felder',
            url: '/felder',
            icons: [{ src: 'favicon.svg', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/rest\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
