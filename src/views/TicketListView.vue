<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { extractErrorMessage, ticketService } from '@/services/ticketService'
import { STATUT_OPTIONS, type Ticket, type TicketPriorite, type TicketStatut } from '@/types/ticket'

const tickets = ref<Ticket[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const feedbackMessage = ref<string | null>(null)

const searchQuery = ref('')
const selectedStatut = ref<'Tous' | TicketStatut>('Tous')
const updatingIds = ref<Record<string, boolean>>({})

const ticketToDelete = ref<Ticket | null>(null)
const deleting = ref(false)

async function loadTickets() {
  loading.value = true
  errorMessage.value = null
  try {
    tickets.value = await ticketService.getAll()
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, 'Impossible de charger les tickets.')
  } finally {
    loading.value = false
  }
}

const filteredTickets = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return tickets.value.filter((ticket) => {
    const matchesStatut =
      selectedStatut.value === 'Tous' || ticket.statut === selectedStatut.value
    if (!matchesStatut) return false

    if (!query) return true
    return (
      ticket.titre.toLowerCase().includes(query) ||
      ticket.description.toLowerCase().includes(query) ||
      ticket.demandeur.toLowerCase().includes(query) ||
      ticket.id.toLowerCase().includes(query)
    )
  })
})

const stats = computed(() => ({
  total: tickets.value.length,
  ouverts: tickets.value.filter((t) => t.statut === 'Ouvert').length,
  enCours: tickets.value.filter((t) => t.statut === 'En cours').length,
  resolus: tickets.value.filter((t) => t.statut === 'Résolu').length,
}))

async function handleQuickStatusChange(ticket: Ticket, newStatut: TicketStatut) {
  if (ticket.statut === newStatut || updatingIds.value[ticket.id]) return

  updatingIds.value = { ...updatingIds.value, [ticket.id]: true }
  errorMessage.value = null
  feedbackMessage.value = null

  try {
    const updated = await ticketService.updateStatut(ticket.id, newStatut)
    const idx = tickets.value.findIndex((t) => t.id === ticket.id)
    if (idx !== -1) {
      tickets.value[idx] = updated
    }
    feedbackMessage.value = `Statut du ticket #${ticket.id} mis à jour : ${newStatut}.`
  } catch (err) {
    errorMessage.value = extractErrorMessage(
      err,
      `Impossible de mettre à jour le statut du ticket #${ticket.id}.`,
    )
  } finally {
    const copy = { ...updatingIds.value }
    delete copy[ticket.id]
    updatingIds.value = copy
  }
}

function askDelete(ticket: Ticket) {
  ticketToDelete.value = ticket
}

function cancelDelete() {
  if (deleting.value) return
  ticketToDelete.value = null
}

async function confirmDelete() {
  if (!ticketToDelete.value || deleting.value) return
  const target = ticketToDelete.value
  deleting.value = true
  errorMessage.value = null
  feedbackMessage.value = null

  try {
    await ticketService.remove(target.id)
    tickets.value = tickets.value.filter((t) => t.id !== target.id)
    feedbackMessage.value = `Ticket #${target.id} (« ${target.titre} ») supprimé.`
    ticketToDelete.value = null
  } catch (err) {
    errorMessage.value = extractErrorMessage(err, 'Impossible de supprimer le ticket.')
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

onMounted(loadTickets)
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Tickets de maintenance</h1>
        <p class="page-subtitle">
          Suivi, recherche, filtrage et mise à jour des demandes d’intervention.
        </p>
      </div>
      <RouterLink to="/tickets/nouveau" class="btn btn-primary">
        + Nouveau ticket
      </RouterLink>
    </div>

    <div class="stats-grid">
      <div class="card stat-card">
        <span class="stat-label">Total</span>
        <strong class="stat-value">{{ stats.total }}</strong>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Ouverts</span>
        <strong class="stat-value">{{ stats.ouverts }}</strong>
      </div>
      <div class="card stat-card">
        <span class="stat-label">En cours</span>
        <strong class="stat-value">{{ stats.enCours }}</strong>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Résolus</span>
        <strong class="stat-value">{{ stats.resolus }}</strong>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
      <button type="button" class="btn btn-secondary btn-sm" @click="loadTickets">
        Réessayer
      </button>
    </div>

    <div v-if="feedbackMessage" class="alert alert-success">
      <span>{{ feedbackMessage }}</span>
      <button type="button" class="btn btn-secondary btn-sm" @click="feedbackMessage = null">
        Fermer
      </button>
    </div>

    <div class="card filters-card">
      <div class="filters-row">
        <div class="filter-search">
          <label for="search-tickets" class="form-label">Rechercher</label>
          <input
            id="search-tickets"
            v-model="searchQuery"
            type="search"
            class="form-control"
            placeholder="Titre, description, demandeur ou #ID..."
          />
        </div>

        <div class="filter-statut">
          <label for="filter-statut" class="form-label">Filtrer par statut</label>
          <select id="filter-statut" v-model="selectedStatut" class="form-control">
            <option value="Tous">Tous les statuts</option>
            <option v-for="statut in STATUT_OPTIONS" :key="statut" :value="statut">
              {{ statut }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="card empty-state">
      Chargement des tickets en cours...
    </div>

    <div v-else-if="filteredTickets.length === 0" class="card empty-state">
      <p v-if="tickets.length === 0">Aucun ticket enregistré pour le moment.</p>
      <p v-else>Aucun ticket ne correspond aux critères de recherche.</p>
      <RouterLink
        v-if="tickets.length === 0"
        to="/tickets/nouveau"
        class="btn btn-primary"
      >
        Créer le premier ticket
      </RouterLink>
    </div>

    <div v-else class="tickets-list">
      <article v-for="ticket in filteredTickets" :key="ticket.id" class="card ticket-card">
        <div class="ticket-top">
          <div class="ticket-meta">
            <span class="ticket-id">#{{ ticket.id }}</span>
            <span class="badge" :class="prioriteBadgeClass(ticket.priorite)">
              Priorité : {{ ticket.priorite }}
            </span>
            <span class="badge" :class="statutBadgeClass(ticket.statut)">
              {{ ticket.statut }}
            </span>
          </div>
          <span class="ticket-date">Créé le {{ ticket.dateCreation }}</span>
        </div>

        <h2 class="ticket-title">
          <RouterLink :to="`/tickets/${ticket.id}`">{{ ticket.titre }}</RouterLink>
        </h2>
        <p class="ticket-description">{{ ticket.description }}</p>

        <div class="ticket-footer">
          <div class="ticket-requester">
            Demandeur : <strong>{{ ticket.demandeur }}</strong>
          </div>

          <div class="ticket-actions">
            <label class="quick-status-label">
              <span>Statut rapide :</span>
              <select
                class="form-control quick-status-select"
                :value="ticket.statut"
                :disabled="Boolean(updatingIds[ticket.id])"
                @change="handleQuickStatusChange(ticket, ($event.target as HTMLSelectElement).value as TicketStatut)"
              >
                <option v-for="statut in STATUT_OPTIONS" :key="statut" :value="statut">
                  {{ statut }}
                </option>
              </select>
            </label>

            <RouterLink :to="`/tickets/${ticket.id}`" class="btn btn-secondary btn-sm">
              Détails
            </RouterLink>
            <RouterLink :to="`/tickets/${ticket.id}/modifier`" class="btn btn-secondary btn-sm">
              Modifier
            </RouterLink>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              @click="askDelete(ticket)"
            >
              Supprimer
            </button>
          </div>
        </div>
      </article>
    </div>

    <ConfirmModal
      :visible="Boolean(ticketToDelete)"
      title="Confirmer la suppression"
      :message="
        ticketToDelete
          ? `Voulez-vous vraiment supprimer le ticket #${ticketToDelete.id} (« ${ticketToDelete.titre} ») ? Cette action est irréversible.`
          : ''
      "
      confirm-label="Supprimer définitivement"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.85rem;
  margin-bottom: 1.25rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.15rem;
}

.stat-label {
  font-size: 0.825rem;
  color: var(--text-muted);
}

.stat-value {
  font-size: 1.5rem;
  line-height: 1.2;
}

.filters-card {
  margin-bottom: 1.25rem;
}

.filters-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.ticket-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.ticket-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ticket-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ticket-id {
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.ticket-date {
  font-size: 0.825rem;
  color: var(--text-muted);
}

.ticket-title {
  margin: 0;
  font-size: 1.125rem;
}

.ticket-title a:hover {
  color: var(--primary);
  text-decoration: underline;
}

.ticket-description {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.ticket-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
  padding-top: 0.65rem;
  border-top: 1px solid var(--border);
}

.ticket-requester {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.ticket-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.quick-status-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.825rem;
  color: var(--text-muted);
}

.quick-status-select {
  width: auto;
  padding: 0.3rem 0.55rem;
  font-size: 0.825rem;
}

@media (max-width: 640px) {
  .filters-row {
    grid-template-columns: 1fr;
  }
}
</style>
