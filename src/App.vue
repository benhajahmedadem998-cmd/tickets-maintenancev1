<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="container header-inner">
        <RouterLink to="/" class="brand">
          <span class="brand-badge">TM</span>
          <span>Gestion des tickets de maintenance</span>
        </RouterLink>

        <nav class="nav-links" aria-label="Navigation principale">
          <RouterLink to="/" class="nav-link" exact-active-class="router-link-active">
            Liste des tickets
          </RouterLink>
          <RouterLink to="/tickets/nouveau" class="nav-link">
            Nouveau ticket
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <div class="container">
        <RouterView />
      </div>
    </main>
  </div>
</template>
