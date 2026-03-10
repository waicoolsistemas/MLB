<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Player, PlayerParent } from '@/services/leagueService'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

interface ParentEntry {
  id?: string
  full_name: string
  phone: string
  address: string
  _deleted?: boolean
}

const props = defineProps<{
  player?: Player | null
  loading?: boolean
  error?: string | null
  sportType?: 'baseball' | 'softball'
  existingParents?: PlayerParent[]
}>()

const emit = defineEmits<{
  (e: 'save', data: {
    full_name: string
    curp?: string
    birth_date?: string | null
    phone?: string
    is_active?: boolean
    photoFile?: File | null
    parents?: ParentEntry[]
  }): void
  (e: 'close'): void
}>()

const isBaseball = () => props.sportType === 'baseball'

const fullName = ref(props.player?.full_name || '')
const curp = ref(props.player?.curp || '')
const birthDate = ref(props.player?.birth_date || '')
const phone = ref(props.player?.phone || '')
const isActive = ref(props.player?.is_active ?? true)
const nameError = ref('')
const phoneError = ref('')

const photoFile = ref<File | null>(null)
const photoPreview = ref(props.player?.photo_url || '')
const photoError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const parents = ref<ParentEntry[]>(
  (props.existingParents || []).map(p => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    address: p.address,
  }))
)
const showParents = ref(parents.value.length > 0)

watch(() => props.player, (val) => {
  fullName.value = val?.full_name || ''
  curp.value = val?.curp || ''
  birthDate.value = val?.birth_date || ''
  phone.value = val?.phone || ''
  isActive.value = val?.is_active ?? true
  photoPreview.value = val?.photo_url || ''
  photoFile.value = null
  photoError.value = ''
})

watch(() => props.existingParents, (val) => {
  parents.value = (val || []).map(p => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    address: p.address,
  }))
  showParents.value = parents.value.length > 0
})

function addParent() {
  parents.value.push({ full_name: '', phone: '', address: '' })
  showParents.value = true
}

function removeParent(index: number) {
  const entry = parents.value[index]
  if (entry.id) {
    entry._deleted = true
  } else {
    parents.value.splice(index, 1)
  }
  if (parents.value.filter(p => !p._deleted).length === 0) {
    showParents.value = false
  }
}

function handlePhotoSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  photoError.value = ''

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    photoError.value = 'Solo JPG, PNG o WebP'
    input.value = ''
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    photoError.value = 'La imagen debe ser menor a 2MB'
    input.value = ''
    return
  }

  photoFile.value = file
  const reader = new FileReader()
  reader.onload = () => {
    photoPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

function validate(): boolean {
  nameError.value = ''
  phoneError.value = ''

  let valid = true

  if (fullName.value.trim().length < 2) {
    nameError.value = 'El nombre debe tener al menos 2 caracteres'
    valid = false
  }

  if (phone.value.trim() && !/^\d{10}$/.test(phone.value.trim())) {
    phoneError.value = 'Debe contener exactamente 10 digitos'
    valid = false
  }

  return valid
}

function handleSubmit() {
  if (!validate()) return

  const payload: {
    full_name: string
    curp?: string
    birth_date?: string | null
    phone?: string
    is_active?: boolean
    photoFile?: File | null
    parents?: ParentEntry[]
  } = {
    full_name: fullName.value.trim(),
    curp: curp.value.trim(),
    birth_date: birthDate.value || null,
    phone: phone.value.trim(),
    photoFile: photoFile.value,
  }

  if (props.player) {
    payload.is_active = isActive.value
  }

  if (isBaseball()) {
    payload.parents = parents.value
  }

  emit('save', payload)
}

const visibleParents = () => parents.value.filter(p => !p._deleted)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700 sticky top-0 bg-navy-900 z-10">
        <h2 class="text-lg font-bold text-white">
          {{ player ? 'Editar Jugador' : 'Nuevo Jugador' }}
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

        <div class="flex flex-col items-center gap-2">
          <button
            type="button"
            class="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-navy-500 hover:border-blue-400 transition-colors group flex items-center justify-center bg-navy-800"
            @click="fileInput?.click()"
          >
            <img
              v-if="photoPreview"
              :src="photoPreview"
              class="w-full h-full object-cover"
            />
            <svg
              v-else
              class="w-8 h-8 text-gray-500 group-hover:text-blue-400 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <div
              v-if="photoPreview"
              class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </div>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="handlePhotoSelect"
          />
          <p class="text-xs text-gray-500">JPG, PNG o WebP. Max 2MB.</p>
          <p v-if="photoError" class="text-xs text-red-400">{{ photoError }}</p>
        </div>

        <BaseInput
          v-model="fullName"
          label="Nombre Completo"
          placeholder="Nombre completo del jugador"
          :error="nameError"
        />

        <BaseInput
          v-model="curp"
          label="CURP"
          placeholder="CURP (opcional)"
        />

        <BaseInput
          v-model="phone"
          label="Telefono"
          type="tel"
          placeholder="10 digitos (opcional)"
          :error="phoneError"
        />

        <BaseInput
          v-model="birthDate"
          label="Fecha de Nacimiento"
          type="date"
          placeholder="Selecciona una fecha (opcional)"
        />

        <div v-if="player" class="flex items-center justify-between py-2">
          <label class="text-sm font-medium text-gray-300">Jugador Activo</label>
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

        <div v-if="isBaseball()" class="border-t border-navy-700 pt-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-white">Padres</h3>
            <button
              type="button"
              class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              @click="addParent"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar Padre
            </button>
          </div>

          <div v-if="visibleParents().length === 0" class="text-center py-4">
            <p class="text-gray-500 text-xs">Sin padres registrados</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(parent, index) in parents"
              :key="index"
              v-show="!parent._deleted"
              class="bg-navy-800/50 border border-navy-700 rounded-lg p-3 space-y-2 relative"
            >
              <button
                type="button"
                class="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition-colors"
                @click="removeParent(index)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <BaseInput
                v-model="parent.full_name"
                label="Nombre del Padre"
                placeholder="Nombre completo"
              />
              <BaseInput
                v-model="parent.phone"
                label="Telefono"
                type="tel"
                placeholder="10 digitos (opcional)"
              />
              <BaseInput
                v-model="parent.address"
                label="Direccion"
                placeholder="Direccion (opcional)"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            {{ player ? 'Guardar Cambios' : 'Agregar Jugador' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
