<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { extractErrorMessage, ticketService } from '@/services/ticketService'
import {
  PRIORITE_OPTIONS,
  STATUT_OPTIONS,
  type CreateTicketPayload,
  type TicketPriorite,
  type TicketStatut,
} from '@/types/ticket'

const props = defineProps<{
  id?: string
}>()

const route = useRoute()
const router = useRouter()

const ticketId = computed(() => props.id ?? (typeof route.params.id === 'string' ? route.params.id : undefined))
const isEditMode = computed(() => Boolean(ticketId.value))

const form = reactive<{
  titre: string
  description: string
  demandeur: string
  priorite: TicketPriorite
  statut: TicketStatut
  dateCreation: string
}>({
  titre: '',
  description: '',
  demandeur: '',
  priorite: 'Moyenne',
  statut: 'Ouvert',
  dateCreation: new Date().toISOString().slice(0, 10),
})

const validationErrors = reactive<Record<string, string>>({})
const loadingTicket = ref(false)
const notFound = ref(false)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)

async function loadExistingTicket() {
  if (!ticketId.value) return
  loadingTicket.value = true
  notFound.value = false
  errorMessage.value = null

  try {
    const ticket = await ticketService.getById(ticketId.value)
    form.titre = ticket.titre
    form.description = ticket.description
    form.demandeur = ticket.demandeur
    form.priorite = ticket.priorite
    form.statut = ticket.statut
    form.dateCreation = ticket.dateCreation
  } catch (err) {
    const msg = extractErrorMessage(err, 'Impossible de charger le ticket.')
    if (msg === 'Ticket introuvable.') {
      notFound.value = true
    } else {
      errorMessage.value = msg
    }
  } finally {
    loadingTicket.value = false
  }
}

function validateForm(): boolean {
  Object.keys(validationErrors).forEach((key) => {
    delete validationErrors[key]
  })

  if (form.titre.trim().length < 3) {
    validationErrors.titre = 'Le titre doit contenir au moins 3 caractères.'
  }
  if (form.description.trim().length < 10) {
    validationErrors.description = 'La description doit contenir au moins 10 caractères.'
  }
  if (form.demandeur.trim().length < 2) {
    validationErrors.demandeur = 'Le nom du demandeur est obligatoire.'
  }
  if (!PRIORITE_OPTIONS.includes(form.priorite)) {
    validationErrors.priorite = 'Veuillez sélectionner une priorité valide.'
  }
  if (!STATUT_OPTIONS.includes(form.statut)) {
    validationErrors.statut = 'Veuillez sélectionner un statut valide.'
  }

  return Object.keys(validationErrors).length === 0
}

async function handleSubmit() {
  if (submitting.value) return
  if (!validateForm()) return

  submitting.value = true
  errorMessage.value = null

  const payload: CreateTicketPayload = {
    titre: form.titre.trim(),
    description: form.description.trim(),
    demandeur: form.demandeur.trim(),
    priorite: form.priorite,
    statut: form.statut,
    dateCreation: form.dateCreation || new Date().toISOString().slice(0, 10),
  }

  try {
    if (isEditMode.value && ticketId.value) {
      const updated = await ticketService.update(ticketId.value, payload)
      await router.push(`/tickets/${updated.id}`)
    } else {
      const created = await ticketService.create(payload)
      await router.push(`/tickets/${created.id}`)
    }
  } catch (err) {
    errorMessage.value = extractErrorMessage(
      err,
      isEditMode.value
        ? 'Impossible de mettre à jour le ticket.'
        : 'Impossible de créer le ticket.',
    )
  } finally {
    submitting.value = false
  }
}

onMounted(loadExistingTicket)
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">
          {{ isEditMode ? `Modifier le ticket #${ticketId}` : 'Créer un ticket' }}
        </h1>
        <p class="page-subtitle">
          {{
            isEditMode
              ? 'Mettez à jour les informations du ticket de maintenance.'
              : 'Renseignez les champs ci-dessous pour enregistrer une nouvelle demande.'
          }}
        </p>
      </div>
      <RouterLink :to="isEditMode && ticketId ? `/tickets/${ticketId}` : '/'" class="btn btn-secondary">
        Retour
      </RouterLink>
    </div>

    <div v-if="loadingTicket" class="card empty-state">
      Chargement du ticket...
    </div>

    <div v-else-if="notFound" class="card empty-state">
      <h2>Ticket introuvable</h2>
      <p>Le ticket #{{ ticketId }} n’existe pas ou a été supprimé.</p>
      <RouterLink to="/" class="btn btn-primary">Retour à la liste</RouterLink>
    </div>

    <form v-else class="card form-card" novalidate @submit.prevent="handleSubmit">
      <div v-if="errorMessage" class="alert alert-error">
        <span>{{ errorMessage }}</span>
      </div>

      <div class="form-group">
        <label for="titre" class="form-label">Titre *</label>
        <input
          id="titre"
          v-model="form.titre"
          type="text"
          class="form-control"
          placeholder="Ex. : Imprimante hors service au 2e étage"
          required
        />
        <p v-if="validationErrors.titre" class="form-error">{{ validationErrors.titre }}</p>
      </div>

      <div class="form-group">
        <label for="demandeur" class="form-label">Demandeur *</label>
        <input
          id="demandeur"
          v-model="form.demandeur"
          type="text"
          class="form-control"
          placeholder="Ex. : Alice Martin"
          required
        />
        <p v-if="validationErrors.demandeur" class="form-error">{{ validationErrors.demandeur }}</p>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="priorite" class="form-label">Priorité *</label>
          <select id="priorite" v-model="form.priorite" class="form-control">
            <option v-for="option in PRIORITE_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
          <p v-if="validationErrors.priorite" class="form-error">{{ validationErrors.priorite }}</p>
        </div>

        <div class="form-group">
          <label for="statut" class="form-label">Statut *</label>
          <select id="statut" v-model="form.statut" class="form-control">
            <option v-for="option in STATUT_OPTIONS" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
          <p v-if="validationErrors.statut" class="form-error">{{ validationErrors.statut }}</p>
        </div>
      </div>

      <div class="form-group">
        <label for="description" class="form-label">Description *</label>
        <textarea
          id="description"
          v-model="form.description"
          rows="4"
          class="form-control"
          placeholder="Décrivez précisément le problème constaté..."
          required
        ></textarea>
        <p v-if="validationErrors.description" class="form-error">
          {{ validationErrors.description }}
        </p>
      </div>

      <div class="form-actions">
        <RouterLink
          :to="isEditMode && ticketId ? `/tickets/${ticketId}` : '/'"
          class="btn btn-secondary"
        >
          Annuler
        </RouterLink>
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          {{
            submitting
              ? 'Enregistrement...'
              : isEditMode
                ? 'Enregistrer les modifications'
                : 'Créer le ticket'
          }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-card {
  max-width: 720px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
