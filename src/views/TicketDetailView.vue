<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { extractErrorMessage, ticketService } from '@/services/ticketService'
import { STATUT_OPTIONS, type Ticket, type TicketPriorite, type TicketStatut } from '@/types/ticket'

const props = defineProps<{
  id?: string
}>()

const route = useRoute()
const router = useRouter()

const ticketId = computed(() => props.id ?? (typeof route.params.id === 'string' ? route.params.id : ''))

const ticket = ref<Ticket | null>(null)
const loading = ref(true)
const notFound = ref(false)
const errorMessage = ref<string | null>(null)
const feedbackMessage = ref<string | null>(null)
const updatingStatut = ref(false)
const showDeleteModal = ref(false)
const deleting = ref(false)

async function loadTicket() {
  if (!ticketId.value) {
    notFound.value = true
    loading.value = false
    return
  }

  loading.value = true
  notFound.value = false
  errorMessage.value = null

  try {
    ticket.value = await ticketService.getById(ticketId.value)
  } catch (err) {
    const msg = extractErrorMessage(err, 'Impossible de charger ce ticket.')
    if (msg === 'Ticket introuvable.') {
      notFound.value = true
    } else {
      errorMessage.value = msg
    }
  } finally {
    loading.value = false
  }
}

async function handleStatusChange(newStatut: TicketStatut) {
  if (!ticket.value || ticket.value.statut === newStatut || updatingStatut.value) return
  updatingStatut.value = true
  errorMessage.value = null
  feedbackMessage.value = null

  try {
    ticket.value = await ticketService.updateStatut(ticket.value.id, newStatut)
    feedbackMessage.value = `Statut mis à jour : ${newStatut}.`
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, 'Impossible de modifier le statut.')
  } finally {
    updatingStatut.value = false
  }
}

async function confirmDelete() {
  if (!ticket.value || deleting.value) return
  deleting.value = true
  errorMessage.value = null

  try {
    await ticketService.remove(ticket.value.id)
    await router.push('/')
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, 'Impossible de supprimer le ticket.')
    showDeleteModal.value = false
  } finally {
    deleting.value = false
  }
}

function statutBadgeClass(statut: TicketStatut): string {
  if (statut === 'Ouvert') return 'badge-statut-ouvert'
  if (statut === 'En cours') return 'badge-statut-en-cours'
  return 'badge-statut-resolu'
}

function prioriteBadgeClass(priorite: TicketPriorite): string {
  if (priorite === 'Haute') return 'badge-priorite-haute'
  if (priorite === 'Moyenne') return 'badge-priorite-moyenne'
  return 'badge-priorite-basse'
}

onMounted(loadTicket)
watch(ticketId, loadTicket)
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">
          {{ ticket ? `Ticket #${ticket.id} — ${ticket.titre}` : `Détail du ticket #${ticketId}` }}
        </h1>
      </div>
      <RouterLink to="/" class="btn btn-secondary">
        ← Retour à la liste
      </RouterLink>
    </div>

    <div v-if="loading" class="card empty-state">
      Chargement du ticket...
    </div>

    <div v-else-if="notFound" class="card empty-state">
      <h2>Ticket introuvable</h2>
      <p>Le ticket #{{ ticketId }} est introuvable ou a déjà été supprimé.</p>
      <RouterLink to="/" class="btn btn-primary">Revenir aux tickets</RouterLink>
    </div>

    <div v-else-if="errorMessage && !ticket" class="alert alert-error">
      <span>{{ errorMessage }}</span>
      <button type="button" class="btn btn-secondary btn-sm" @click="loadTicket">
        Réessayer
      </button>
    </div>

    <div v-else-if="ticket" class="card detail-card">
      <div v-if="errorMessage" class="alert alert-error">
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="feedbackMessage" class="alert alert-success">
        <span>{{ feedbackMessage }}</span>
      </div>

      <div class="detail-badges">
        <span class="badge" :class="prioriteBadgeClass(ticket.priorite)">
          Priorité : {{ ticket.priorite }}
        </span>
        <span class="badge" :class="statutBadgeClass(ticket.statut)">
          Statut : {{ ticket.statut }}
        </span>
      </div>

      <dl class="detail-grid">
        <div>
          <dt>Demandeur</dt>
          <dd>{{ ticket.demandeur }}</dd>
        </div>
        <div>
          <dt>Date de création</dt>
          <dd>{{ ticket.dateCreation }}</dd>
        </div>
      </dl>

      <div class="detail-description">
        <h3>Description</h3>
        <p>{{ ticket.description }}</p>
      </div>

      <div class="detail-actions">
        <div class="status-switcher">
          <span class="status-label">Changement rapide de statut :</span>
          <div class="status-buttons">
            <button
              v-for="statut in STATUT_OPTIONS"
              :key="statut"
              type="button"
              class="btn btn-sm"
              :class="ticket.statut === statut ? 'btn-primary' : 'btn-secondary'"
              :disabled="updatingStatut || ticket.statut === statut"
              @click="handleStatusChange(statut)"
            >
              {{ statut }}
            </button>
          </div>
        </div>

        <div class="crud-buttons">
          <RouterLink :to="`/tickets/${ticket.id}/modifier`" class="btn btn-secondary">
            Modifier
          </RouterLink>
          <button type="button" class="btn btn-danger" @click="showDeleteModal = true">
            Supprimer
          </button>
        </div>
      </div>
    </div>

    <ConfirmModal
      :visible="showDeleteModal"
      title="Confirmer la suppression"
      :message="
        ticket
          ? `Voulez-vous vraiment supprimer le ticket #${ticket.id} (« ${ticket.titre} ») ?`
          : ''
      "
      confirm-label="Supprimer définitivement"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<style scoped>
.detail-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 1rem;
  background-color: var(--surface-muted);
  border-radius: 6px;
}

.detail-grid dt {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.2rem;
}

.detail-grid dd {
  margin: 0;
  font-weight: 600;
}

.detail-description h3 {
  margin: 0 0 0.4rem;
  font-size: 1rem;
}

.detail-description p {
  margin: 0;
  color: var(--text);
  white-space: pre-wrap;
}

.detail-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.status-switcher {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.status-label {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 500;
}

.status-buttons,
.crud-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
