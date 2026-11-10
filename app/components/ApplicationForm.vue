<script setup>
import { ref } from 'vue'
const { t } = useI18n()

useHead({
  script: [
    {
      src: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
      async: true,
      defer: true
    }
  ]
})

const config = useRuntimeConfig()

const antrag = ref(null)
const rechnung = ref([])
const bestaetigung = ref([])

const kommentar = ref('')
const MHmail = ref('')
const firstName = ref('')
const lastName = ref('')

const isSubmitting = ref(false)
const wasSent = ref(false)
const serverMessage = ref('')

const submitForm = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  serverMessage.value = ''

  try {    
    const formData = new FormData()

    if (antrag.value) {
      formData.append('antrag', antrag.value)
    }

    for (const file of rechnung.value) {
      formData.append('rechnung', file)
    }

    for (const file of bestaetigung.value) {
      formData.append('bestaetigung', file)
    }

    formData.append('kommentar', kommentar.value)

    formData.append('MHmail', MHmail.value)

    formData.append('firstName', firstName.value)

    formData.append('lastName', lastName.value)

    const token =
      document.querySelector('input[name="cf-turnstile-response"]')?.value || ''

    if (!token) {
      serverMessage.value = t('Bitte bestätige zuerst das CAPTCHA.')
      isSubmitting.value = false
      return
    }

    formData.append('turnstileToken', token)

    const data = await $fetch('/api/mail', {
      method: 'POST',
      body: formData
    })

    wasSent.value = data.sent
    serverMessage.value = data.message

  } catch (error) {
    console.error(error)

    wasSent.value = false
    serverMessage.value = t('Beim Senden ist ein Fehler aufgetreten.')
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  antrag.value = null
  rechnung.value = []
  bestaetigung.value = []
  kommentar.value = ''
  MHmail.value =''
  firstName.value = ''
  lastName.value = ''

  wasSent.value = false
  serverMessage.value = ''

  if (window.turnstile) {
    window.turnstile.reset()
  }
}
</script>

<template>
  <div>
    <div v-if="wasSent">
      <h3 class="text-2xl p-8 font-bold mb-4 text-red-600">
        {{ $t('Antrag erfolgreich gesendet!') }}
      </h3>
      <p class="mb-6">
        {{ statusMessage }}
      </p>
    </div>

    <form v-else action="/" method="post" class="mb-6" @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 w-full">
        <div class="flex flex-col gap-3 w-full">
          <UInput v-model="firstName" class="w-full" :placeholder="$t('Vorname')"/>
          <UInput v-model="lastName" class="w-full" :placeholder="$t('Nachname')"/>
          <UInput v-model="MHmail" class="w-full" :placeholder="$t('MH-Mail-Adresse')"/>
        </div>

        <div class="w-full">
          <UFileUpload v-model="antrag" :dropzone="true" :label="$t('ausgefüllter Antrag')" class="w-full"/>
          <p v-if="antrag" class="mt-2 text-sm text-gray-500">📄 {{ antrag.name }}</p>
        </div>

        <div class="w-full">
          <UFileUpload v-model="rechnung" multiple :dropzone="true" :label="$t('ausgefüllte Rechnung(en)')" class="w-full"/>
          <div
            v-if="rechnung.length"
            class="mt-2 space-y-1 text-sm text-gray-500">
            <p v-for="file in rechnung" :key="`${file.name}-${file.size}`">📄 {{ file.name }}</p>
          </div>
        </div>

        <div class="w-full">
          <UFileUpload v-model="bestaetigung" multiple :dropzone="true" :label="$t('Teilnahmebestätigung(en)')" class="w-full"/>

          <div v-if="bestaetigung.length" class="mt-2 space-y-1 text-sm text-gray-500">
            <p v-for="file in bestaetigung" :key="`${file.name}-${file.size}`">📄 {{ file.name }}</p>
          </div>
        </div>

        <div class="w-full">
          <UTextarea v-model="kommentar" :rows="9" class="w-full" :placeholder="$t('weitere Infos für den AStA')"/>
        </div>
        <div class="cf-turnstile" :data-sitekey="config.public.turnstileSiteKey"/>

        <div class="md:col-span-5 flex md:flex-row justify-center gap-4 mt-4">
          <UButton type="reset" class="bg-gray-500 hover:bg-gray-700 active:bg-gray-500" :label="$t('Eingaben löschen')" @click="resetForm"/>
          <UButton type="submit"class="bg-red-500 hover:bg-red-900 active:bg-red-500" :label="$t('Absenden')"/>
        </div>
      </div>

      <div v-if="serverMessage && !wasSent" class="p-4 mb-8 text-center bg-red-900 text-red-300">{{ serverMessage }}</div>

      <div v-if="isSubmitting" class="text-center mb-10">
        <Icon name="svg-spinners:3-dots-scale" size="48" />
        <p>{{ $t('Antrag wird gesendet') }}</p>
      </div>
    </form>
  </div>
</template>