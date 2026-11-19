<script setup lang="ts">
defineProps<{
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div v-if="visible" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="emit('cancel')">
    <div class="modal-panel">
      <h2 class="modal-title">{{ title }}</h2>
      <p class="modal-body">{{ message }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" :disabled="loading" @click="emit('cancel')">
          Annuler
        </button>
        <button type="button" class="btn btn-danger" :disabled="loading" @click="emit('confirm')">
          {{ loading ? 'Suppression...' : (confirmLabel ?? 'Supprimer') }}
        </button>
      </div>
    </div>
  </div>
</template>
