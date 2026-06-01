import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/tailwind.css'],
  nitro: {
    preset: 'static',
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'lucide-vue-next',
        '@vueuse/core',
        'clsx',
        'tailwind-merge'
      ]
    }
  },
  routeRules: {
    '/sw.js': { prerender: false }
  },
  modules: ['shadcn-nuxt', '@vite-pwa/nuxt', '@nuxtjs/color-mode'],
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },
  router: {
    // Exclude service worker and workbox paths from Vue Router matching
    options: {
      strict: false,
    },
  },
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Sleep Tracker',
      short_name: 'Sleep',
      description: 'Track split sleep sessions, daily goals, and recovery progress.',
      theme_color: '#6366f1',
      background_color: '#09090b',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      shortcuts: [
        {
          name: 'Start Sleep Timer',
          short_name: 'Timer',
          description: 'Start tracking your sleep immediately',
          url: '/timer',
          icons: [{ src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }],
        },
        {
          name: 'View History',
          short_name: 'History',
          description: 'See your sleep history and stats',
          url: '/history',
          icons: [{ src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }],
        },
        {
          name: 'Today\'s Summary',
          short_name: 'Today',
          description: 'Check today\'s sleep progress',
          url: '/today',
          icons: [{ src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }],
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      navigateFallback: null,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },
})
