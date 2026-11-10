<script setup>
// The dropzone for one kind of document. Once something is uploaded, the file
// names and their size replace the label, a button removes the files again,
// and a file the server would refuse is reported right away.
const files = defineModel({ default: null })

const props = defineProps({
  label: { type: String, required: true },
  multiple: { type: Boolean, default: false }
})

const { t } = useI18n()

const fileList = computed(() => {
  if (Array.isArray(files.value)) return files.value
  return files.value ? [files.value] : []
})

const hasFiles = computed(() => fileList.value.length > 0)
const names = computed(() => fileList.value.map(file => file.name).join(', '))
const size = computed(() => formatBytes(fileList.value.reduce((sum, file) => sum + file.size, 0)))

const fileError = computed(() =>
  fileList.value.every(file => isAllowedFile(file.name))
    ? null
    : t('Es sind nur PDF-, JPG- und PNG-Dateien erlaubt.')
)

const clear = () => {
  files.value = props.multiple ? [] : null
}
</script>

<template>
  <div class="w-full">
    <div class="relative">
      <UFileUpload
        v-model="files"
        :multiple="multiple"
        :accept="ALLOWED_EXTENSIONS.join(',')"
        :icon="hasFiles ? 'i-lucide-file' : undefined"
        :label="hasFiles ? names : label"
        :description="hasFiles ? size : $t('PDF, JPG oder PNG')"
        :preview="false"
        size="sm"
        :ui="{ base: 'min-h-24' }"
        class="w-full"
      />
      <UButton
        v-if="hasFiles"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="xs"
        class="absolute top-2 right-2"
        :aria-label="$t('Entfernen')"
        :title="$t('Entfernen')"
        @click="clear"
      />
    </div>
    <UAlert
      v-if="fileError"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="fileError"
      class="mt-2"
    />
  </div>
</template>
