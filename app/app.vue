<script setup>
import logo from '~/assets/logo.png'

const currentYear = new Date().getFullYear()


const { locale, locales, localeProperties, setLocale } = useI18n()

const colorMode = useColorMode()

colorMode.preference = 'light'
colorMode.value = 'light'

useHead({
  htmlAttrs: { lang: locale },
  title: 'Fahrtkostenzuschuss AStA HfM Freiburg',
  link: [
    {
      rel: 'icon',
      href: logo
    }
  ]
})

const localeItems = computed(() =>
  locales.value.map(loc => ({
    label: loc.name,
    type: 'checkbox',
    checked: loc.code === locale.value,
    onSelect: () => setLocale(loc.code)
  }))
)
function useDoc(name) {
  return useAsyncData(
    name,
    () =>
      queryCollection('docs')
        .path(`/${locale.value}/${name}`)
        .first(),
    {
      watch: [locale]
    }
  )
}

const { data: intro } = await useDoc('intro')
const { data: responsibility } = await useDoc('responsibility')
const { data: eligibleCosts } = await useDoc('eligible-costs')
const { data: amount } = await useDoc('amount')
const { data: applicationProcess } = await useDoc('application-process')
</script>

<template>
  <div class="flex justify-between items-start p-4">
    <div class="flex justify-start p-4">
      <img src="/assets/logo_mh.png" class="max-h-15 md:max-h-25" alt="Logo HfM Freiburg">
    </div>

    <UDropdownMenu :items="localeItems">
      <UButton
        icon="i-lucide-languages"
        trailing-icon="i-lucide-chevron-down"
        variant="soft"
        color="neutral"
        :label="localeProperties.name"
        :aria-label="$t('Sprache')"
      />
    </UDropdownMenu>
  </div>

  <div class="justify-items-center p-5">
    <h1 class="text-3xl md:text-5xl text-red-600 font-bold">
      {{ $t('Fahrtkostenzuschuss') }}
    </h1>
  </div>

  <UContainer class="justify-center">
    <div class="flex flex-col items-center gap-4 p-3">
      <div>
        <img src="/assets/picture_ice.png" alt="ICE-Zug" class="max-h-150">
      </div>
      <div class="p-10">
        <h2 class="text-2xl md:text-4xl text-red-600 font-bold">
          {{ $t('Antrag auf einen Fahrtkostenzuschuss') }}
        </h2>
        <article>
          <ContentRenderer v-if="intro" :value="intro" />
        </article>
      </div>
      <div>
        <a href="fahrtkostenantrag.pdf" download>
          <UButton
            class="bg-red-500 hover:bg-red-800"
            size="xl"
            :label="$t('Antrag herunterladen (pdf)')"
            icon="i-lucide-download"
          />
        </a>
      </div>
      <div class="p-10">
        <article>
          <ContentRenderer v-if="responsibility" :value="responsibility" />
        </article>
      </div>

      <ApplicationForm />

      <div class="p-10">
        <h2 class="text-2xl md:text-4xl text-red-600 font-bold">
          {{ $t('Was wird bezuschusst?') }}
        </h2>
        <article>
          <ContentRenderer v-if="eligibleCosts" :value="eligibleCosts" />
        </article>
      </div>

      <div class="p-10">
        <h2 class="text-2xl md:text-4xl text-red-600 font-bold">
          {{ $t('Höhe des Zuschusses') }}
        </h2>
        <article>
          <ContentRenderer v-if="amount" :value="amount" />
        </article>
      </div>

      <div class="p-10">
        <h2 class="text-2xl md:text-4xl text-red-600 font-bold">
          {{ $t('Wie funktioniert die Antragsstellung?') }}
        </h2>
        <article>
          <ContentRenderer v-if="applicationProcess" :value="applicationProcess" />
        </article>
      </div>
    </div>
  </UContainer>
  <footer class="border-t border-gray-200 py-6">
    <p class="text-center text-sm text-gray-500">
      © {{ currentYear }}, Florian Moldaschl. Alle Rechte vorbehalten.
    </p>
  </footer>
</template>
