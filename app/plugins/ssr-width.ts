// SSR-safe initial width for useWindowSize / useBreakpoints.
// Nuxt auto-detects SSR context; no explicit plugin needed for @vueuse/core v14+.

export default defineNuxtPlugin(() => {
  // intentionally empty — VueUse handles SSR width defaults internally
})
