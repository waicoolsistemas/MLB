<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { League } from '@/services/leagueService'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  league?: League | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: {
    name: string
    description?: string
    is_active?: boolean
    sport_type?: 'baseball' | 'softball'
    logoFile?: File | null
    removeLogo?: boolean
  }): void
  (e: 'close'): void
}>()

const isEditing = computed(() => !!props.league)

const name = ref(props.league?.name || '')
const description = ref(props.league?.description || '')
const isActive = ref(props.league?.is_active ?? true)
const sportType = ref<'baseball' | 'softball'>(props.league?.sport_type || 'softball')
const nameError = ref('')

const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(props.league?.logo_url || null)
const removeLogo = ref(false)
const logoError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

watch(() => props.league, (val) => {
  name.value = val?.name || ''
  description.value = val?.description || ''
  isActive.value = val?.is_active ?? true
  sportType.value = val?.sport_type || 'softball'
  logoFile.value = null
  logoPreview.value = val?.logo_url || null
  removeLogo.value = false
  logoError.value = ''
})

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    logoError.value = 'Solo se permiten imagenes JPEG, PNG o WebP'
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    logoError.value = 'La imagen debe ser menor a 2MB'
    return
  }

  logoError.value = ''
  logoFile.value = file
  removeLogo.value = false

  const reader = new FileReader()
  reader.onload = () => {
    logoPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

function handleRemoveLogo() {
  logoFile.value = null
  logoPreview.value = null
  removeLogo.value = true
  logoError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function validate(): boolean {
  nameError.value = ''
  if (name.value.trim().length < 3) {
    nameError.value = 'El nombre debe tener al menos 3 caracteres'
    return false
  }
  return true
}

function handleSubmit() {
  if (!validate()) return

  const payload: {
    name: string
    description?: string
    is_active?: boolean
    sport_type?: 'baseball' | 'softball'
    logoFile?: File | null
    removeLogo?: boolean
  } = {
    name: name.value.trim(),
    description: description.value.trim(),
  }

  if (isEditing.value) {
    payload.is_active = isActive.value
  } else {
    payload.sport_type = sportType.value
  }

  if (logoFile.value) {
    payload.logoFile = logoFile.value
  } else if (removeLogo.value) {
    payload.removeLogo = true
  }

  emit('save', payload)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h2 class="text-lg font-bold text-white">
          {{ league ? 'Editar Liga' : 'Nueva Liga' }}
        </h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <div v-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {{ error }}
        </div>

        <BaseInput
          v-model="name"
          label="Nombre de la Liga"
          placeholder="Ej: Liga 3 Rios"
          :error="nameError"
        />

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Tipo de Deporte</label>
          <div v-if="!isEditing" class="flex gap-2">
            <button
              type="button"
              class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200"
              :class="sportType === 'baseball'
                ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                : 'bg-navy-800 border-navy-600 text-gray-400 hover:border-navy-500'"
              @click="sportType = 'baseball'"
            >
              Baseball
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200"
              :class="sportType === 'softball'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-navy-800 border-navy-600 text-gray-400 hover:border-navy-500'"
              @click="sportType = 'softball'"
            >
              Softball
            </button>
          </div>
          <div v-else class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium"
              :class="league?.sport_type === 'baseball'
                ? 'bg-orange-500/15 text-orange-400'
                : 'bg-emerald-500/15 text-emerald-400'"
            >
              {{ league?.sport_type === 'baseball' ? 'Baseball' : 'Softball' }}
            </span>
            <span class="text-xs text-gray-500">No se puede cambiar</span>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Descripcion</label>
          <textarea
            v-model="description"
            placeholder="Descripcion opcional de la liga"
            rows="3"
            class="input-field resize-none"
          ></textarea>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Logo de la Liga</label>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="handleFileSelect"
          />
          <div class="flex items-center gap-4">
            <button
              type="button"
              @click="triggerFileInput"
              class="relative w-20 h-20 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center flex-shrink-0 overflow-hidden group"
              :class="logoPreview
                ? 'border-navy-600 hover:border-navy-400'
                : 'border-navy-600 hover:border-navy-400 bg-navy-800'"
            >
              <img
                v-if="logoPreview"
                :src="logoPreview"
                alt="Logo preview"
                class="w-full h-full object-cover"
              />
              <div v-else class="text-center">
                <svg class="w-6 h-6 text-gray-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </button>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500">JPEG, PNG o WebP. Max 2MB.</p>
              <div class="flex gap-2 mt-2">
                <button
                  type="button"
                  @click="triggerFileInput"
                  class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {{ logoPreview ? 'Cambiar' : 'Subir imagen' }}
                </button>
                <button
                  v-if="logoPreview"
                  type="button"
                  @click="handleRemoveLogo"
                  class="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
          <p v-if="logoError" class="text-xs text-red-400 mt-1">{{ logoError }}</p>
        </div>

        <div v-if="league" class="flex items-center justify-between py-2">
          <label class="text-sm font-medium text-gray-300">Liga Activa</label>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
            :class="isActive ? 'bg-green-500' : 'bg-navy-600'"
            @click="isActive = !isActive"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
              :class="isActive ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            {{ league ? 'Guardar Cambios' : 'Crear Liga' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
