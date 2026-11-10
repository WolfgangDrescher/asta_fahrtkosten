<script setup>
// The dropzone for one kind of document. A single file replaces the label with
// its name and size, and a button removes it again. Several files are listed
// inside the dropzone, each with its own remove button, so more can be added.
// A file the server would refuse is reported right away.
const files = defineModel({ default: null })

const props = defineProps({
  multiple: { type: Boolean, default: false }
})

const { t } = useI18n()

const fileList = computed(() => {
  if (Array.isArray(files.value)) return files.value
  return files.value ? [files.value] : []
})

const hasFiles = computed(() => fileList.value.length > 0)
const showsFileInLabel = computed(() => hasFiles.value && !props.multiple)
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
        :icon="showsFileInLabel ? 'i-lucide-file' : undefined"
        :label="showsFileInLabel ? names : $t('Datei hierher ziehen oder klicken')"
        :description="showsFileInLabel ? size : $t('PDF, JPG oder PNG')"
        :preview="multiple"
        layout="list"
        position="inside"
        size="sm"
        :ui="{ base: 'min-h-24' }"
        class="w-full"
      />
      <UButton
        v-if="showsFileInLabel"
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
