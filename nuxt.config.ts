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

  runtimeConfig: {
    // Set at runtime with NUXT_ALTCHA_HMAC_KEY, see .env.example
    altchaHmacKey: '',

    MAILHOST: process.env.MAILHOST,
    MAILPORT: process.env.MAILPORT,
    MAILUSER: process.env.MAILUSER,
    MAILPASSWORD: process.env.MAILPASSWORD,
    CONTACTMAIL: process.env.CONTACTMAIL
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
