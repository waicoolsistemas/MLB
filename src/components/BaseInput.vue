<script setup lang="ts">
defineProps<{
  label?: string
  type?: string
  placeholder?: string
  error?: string
  modelValue: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-sm font-medium text-gray-300">{{ label }}</label>
    <input
      :type="type || 'text'"
      :placeholder="placeholder"
      :value="modelValue"
      class="input-field"
      :class="{ 'border-red-500 focus:border-red-500': error }"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="text-red-400 text-xs">{{ error }}</p>
  </div>
</template>
