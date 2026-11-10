// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2026-07-30',
  modules: [
    '@nuxt/content',
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@nuxtjs/turnstile'
  ],

  css: ['~/assets/main.css'],

  runtimeConfig: {

    turnstileSecret: process.env.TURNSTILE_SECRET,

    public: {
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY
    },

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
        file: 'de.yaml'
      },
      {
        code: 'en',
        file: 'en.yaml'
      },
      {
        code: 'fr',
        file: 'fr.yaml'
      },
      {
        code: 'it',
        file: 'it.yaml'
      },
      {
        code: 'es',
        file: 'es.yaml'
      }
    ],
    detectBrowserLanguage: false
  }
})