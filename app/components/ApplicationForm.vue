<script setup>
import { ref } from 'vue'

const { t, locale } = useI18n()

const altchaChallengeUrl = `${useRuntimeConfig().app.baseURL}api/altcha`
const altchaLanguages = { de: 'de', en: 'en', fr: 'fr-fr', es: 'es-es', it: 'it' }

const altcha = ref(null)
const altchaPayload = ref('')

const applicationFile = ref(null)
const invoiceFiles = ref([])
const confirmationFiles = ref([])

const comment = ref('')
const email = ref('')
const firstName = ref('')
const lastName = ref('')

const errorMessages = {
  413: 'Die Dateien sind zusammen zu groß (maximal 18 MB).',
  415: 'Es sind nur PDF-, JPG- und PNG-Dateien erlaubt.'
}

const isSubmitting = ref(false)
const wasSent = ref(false)
const serverMessage = ref('')

const submitForm = async () => {
  if (isSubmitting.value) return

  if (!applicationFile.value || !invoiceFiles.value.length || !confirmationFiles.value.length) {
    serverMessage.value = t('Bitte fülle alle Pflichtfelder aus und lade alle Dokumente hoch.')
    return
  }

  const allFiles = [applicationFile.value, ...invoiceFiles.value, ...confirmationFiles.value]

  if (!allFiles.every(file => isAllowedFile(file.name))) {
    serverMessage.value = t('Es sind nur PDF-, JPG- und PNG-Dateien erlaubt.')
    return
  }

  if (allFiles.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE_BYTES) {
    serverMessage.value = t('Die Dateien sind zusammen zu groß (maximal 18 MB).')
    return
  }

  isSubmitting.value = true
  serverMessage.value = ''

  try {
    const formData = new FormData()

    if (applicationFile.value) {
      formData.append('applicationFile', applicationFile.value)
    }

    for (const file of invoiceFiles.value) {
      formData.append('invoiceFiles', file)
    }

    for (const file of confirmationFiles.value) {
      formData.append('confirmationFiles', file)
    }

    formData.append('comment', comment.value)

    formData.append('email', email.value)

    formData.append('firstName', firstName.value)

    formData.append('lastName', lastName.value)

    if (!altchaPayload.value) {
      serverMessage.value = t('Bitte bestätige zuerst das CAPTCHA.')
      isSubmitting.value = false
      return
    }

    formData.append('altcha', altchaPayload.value)

    await $fetch('/api/mail', {
      method: 'POST',
      body: formData
    })

    wasSent.value = true
  } catch (error) {
    console.error(error)

    wasSent.value = false
    serverMessage.value = t(errorMessages[error.statusCode] ?? 'Beim Senden ist ein Fehler aufgetreten.')

    // A solved challenge is only accepted once
    altcha.value?.reset()
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  applicationFile.value = null
  invoiceFiles.value = []
  confirmationFiles.value = []
  comment.value = ''
  email.value = ''
  firstName.value = ''
  lastName.value = ''

  wasSent.value = false
  serverMessage.value = ''

  altcha.value?.reset()
}
</script>

<template>
  <div>
    <div v-if="wasSent">
      <h3 class="text-2xl p-8 font-bold mb-4 text-red-600">
        {{ $t('Antrag erfolgreich gesendet!') }}
      </h3>
    </div>

    <form v-else class="mb-6" @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 w-full">
        <div class="flex flex-col gap-3 w-full">
          <UInput v-model="firstName" required class="w-full" :placeholder="$t('Vorname')" />
          <UInput v-model="lastName" required class="w-full" :placeholder="$t('Nachname')" />
          <UInput
            v-model="email"
            type="email"
            required
            class="w-full"
            :placeholder="$t('MH-Mail-Adresse')"
          />
        </div>

        <DocumentField v-model="applicationFile" :label="$t('ausgefüllter Antrag')" />
        <DocumentField v-model="invoiceFiles" multiple :label="$t('ausgefüllte Rechnung(en)')" />
        <DocumentField v-model="confirmationFiles" multiple :label="$t('Teilnahmebestätigung(en)')" />

        <div class="w-full">
          <UTextarea
            v-model="comment"
            :rows="9"
            class="w-full"
            :placeholder="$t('weitere Infos für den AStA')"
          />
        </div>
        <altcha-widget
          ref="altcha"
          :challenge="altchaChallengeUrl"
          :language="altchaLanguages[locale]"
          @statechange="altchaPayload = $event.detail.payload ?? ''"
        />

        <div class="md:col-span-5 flex md:flex-row justify-center gap-4 mt-4">
          <UButton
            type="reset"
            class="bg-gray-500 hover:bg-gray-700 active:bg-gray-500"
            :label="$t('Eingaben löschen')"
            @click="resetForm"
          />
          <UButton type="submit" class="bg-red-500 hover:bg-red-900 active:bg-red-500" :label="$t('Absenden')" />
        </div>
      </div>

      <div v-if="serverMessage && !wasSent" class="p-4 mb-8 text-center bg-red-900 text-red-300">
        {{ serverMessage }}
      </div>

      <div v-if="isSubmitting" class="text-center mb-10">
        <UIcon name="i-lucide-loader-circle" class="size-12 animate-spin" />
        <p>{{ $t('Antrag wird gesendet') }}</p>
      </div>
    </form>
  </div>
</template>
