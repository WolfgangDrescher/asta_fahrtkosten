// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2026-07-30',
  modules: [
    '@nuxt/content',
    '@nuxt/ui',
    '@nuxtjs/i18n'
  ],

  css: ['~/assets/main.css'],

  vue: {
    compilerOptions: {
      isCustomElement: tag => tag === 'altcha-widget'
    }
  },

  content: {
    experimental: {
      sqliteConnector: 'native'
    }
  },

  // Set at runtime with NUXT_* environment variables, see .env.example
  runtimeConfig: {
    altchaHmacKey: '',
    mail: {
      host: '',
      port: 465,
      secure: true,
      user: '',
      password: '',
      from: '',
      to: ''
    }
  },

  i18n: {
    defaultLocale: 'de',
    langDir: 'locales/',
    locales: [
      {
        code: 'de',
        file: 'de.yaml',
        name: 'Deutsch'
      },
      {
        code: 'en',
        file: 'en.yaml',
        name: 'English'
      },
      {
        code: 'fr',
        file: 'fr.yaml',
        name: 'Français'
      },
      {
        code: 'it',
        file: 'it.yaml',
        name: 'Italiano'
      },
      {
        code: 'es',
        file: 'es.yaml',
        name: 'Español'
      }
    ],
    detectBrowserLanguage: false
  }
})
