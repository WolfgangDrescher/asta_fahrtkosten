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

  if (!isUniversityEmail(email.value)) {
    serverMessage.value = t('Bitte gib deine MH-Mail-Adresse an ({domain}).', { domain: `@${UNIVERSITY_MAIL_DOMAIN}` })
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
  <UCard class="w-full max-w-2xl">
    <UAlert
      v-if="wasSent"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      :title="$t('Antrag erfolgreich gesendet!')"
    />

    <form v-else class="flex flex-col gap-8" @submit.prevent="submitForm">
      <div class="flex flex-col gap-4">
        <UFormField :label="$t('Vorname')" required>
          <UInput v-model="firstName" required class="w-full" />
        </UFormField>
        <UFormField :label="$t('Nachname')" required>
          <UInput v-model="lastName" required class="w-full" />
        </UFormField>
        <UFormField :label="$t('MH-Mail-Adresse')" required>
          <UInput v-model="email" type="email" required class="w-full" />
        </UFormField>
      </div>

      <div class="flex flex-col gap-4">
        <UFormField :label="$t('ausgefüllter Antrag')" required>
          <DocumentField v-model="applicationFile" />
        </UFormField>
        <UFormField :label="$t('ausgefüllte Rechnung(en)')" required>
          <DocumentField v-model="invoiceFiles" multiple />
        </UFormField>
        <UFormField :label="$t('Teilnahmebestätigung(en)')" required>
          <DocumentField v-model="confirmationFiles" multiple />
        </UFormField>
      </div>

      <UFormField :label="$t('weitere Infos für den AStA')">
        <UTextarea v-model="comment" :rows="5" class="w-full" />
      </UFormField>

      <altcha-widget
        ref="altcha"
        class="w-full sm:w-80"
        :challenge="altchaChallengeUrl"
        :language="altchaLanguages[locale]"
        @statechange="altchaPayload = $event.detail.payload ?? ''"
      />

      <div class="flex gap-4">
        <UButton
          type="submit"
          class="bg-red-500 hover:bg-red-900 active:bg-red-500"
          :label="isSubmitting ? $t('Antrag wird gesendet') : $t('Absenden')"
          :loading="isSubmitting"
        />
        <UButton
          type="reset"
          color="neutral"
          variant="soft"
          :label="$t('Eingaben löschen')"
          :disabled="isSubmitting"
          @click="resetForm"
        />
      </div>

      <UAlert
        v-if="serverMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="serverMessage"
      />
    </form>
  </UCard>
</template>
