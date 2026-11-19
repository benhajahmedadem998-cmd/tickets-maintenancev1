import { createRouter, createWebHistory } from 'vue-router'
import TicketListView from '@/views/TicketListView.vue'
import TicketFormView from '@/views/TicketFormView.vue'
import TicketDetailView from '@/views/TicketDetailView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'tickets-list',
      component: TicketListView,
    },
    {
      path: '/tickets/nouveau',
      name: 'ticket-create',
      component: TicketFormView,
    },
    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: TicketDetailView,
      props: true,
    },
    {
      path: '/tickets/:id/modifier',
      name: 'ticket-edit',
      component: TicketFormView,
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

export default router
