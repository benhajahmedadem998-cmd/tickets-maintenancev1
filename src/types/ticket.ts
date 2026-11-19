export type TicketPriorite = 'Basse' | 'Moyenne' | 'Haute'

export type TicketStatut = 'Ouvert' | 'En cours' | 'Résolu'

export interface Ticket {
  id: string
  titre: string
  description: string
  demandeur: string
  priorite: TicketPriorite
  statut: TicketStatut
  dateCreation: string
}

export type CreateTicketPayload = Omit<Ticket, 'id'>
export type UpdateTicketPayload = Partial<Omit<Ticket, 'id'>>

export const PRIORITE_OPTIONS: TicketPriorite[] = ['Basse', 'Moyenne', 'Haute']
export const STATUT_OPTIONS: TicketStatut[] = ['Ouvert', 'En cours', 'Résolu']
