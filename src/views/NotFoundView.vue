<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="card empty-state">
    <h1>Page introuvable (404)</h1>
    <p>La page demandée n’existe pas.</p>
    <RouterLink to="/" class="btn btn-primary">Retour à la liste des tickets</RouterLink>
  </div>
</template>
