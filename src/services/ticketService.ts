import axios from 'axios'
import type { CreateTicketPayload, Ticket, TicketStatut, UpdateTicketPayload } from '@/types/ticket'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      return 'Ticket introuvable.'
    }
    const serverMessage = (error.response?.data as { error?: string } | undefined)?.error
    if (serverMessage) {
      return serverMessage
    }
    if (!error.response) {
      return 'Erreur réseau : impossible de contacter le serveur.'
    }
  }
  return fallback
}

export const ticketService = {
  async getAll(): Promise<Ticket[]> {
    const { data } = await apiClient.get<Ticket[]>('/tickets')
    return data
  },

  async getById(id: string): Promise<Ticket> {
    const { data } = await apiClient.get<Ticket>(`/tickets/${encodeURIComponent(id)}`)
    return data
  },

  async create(payload: CreateTicketPayload): Promise<Ticket> {
    const { data } = await apiClient.post<Ticket>('/tickets', payload)
    return data
  },

  async update(id: string, payload: CreateTicketPayload): Promise<Ticket> {
    const { data } = await apiClient.put<Ticket>(`/tickets/${encodeURIComponent(id)}`, payload)
    return data
  },

  async patch(id: string, payload: UpdateTicketPayload): Promise<Ticket> {
    const { data } = await apiClient.patch<Ticket>(`/tickets/${encodeURIComponent(id)}`, payload)
    return data
  },

  async updateStatut(id: string, statut: TicketStatut): Promise<Ticket> {
    return this.patch(id, { statut })
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tickets/${encodeURIComponent(id)}`)
  },
}
