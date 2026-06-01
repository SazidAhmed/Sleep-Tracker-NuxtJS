<script setup lang="ts">
useHead({
  link: [
    { rel: 'apple-touch-icon', href: '/icon-512x512.png' }
  ]
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
