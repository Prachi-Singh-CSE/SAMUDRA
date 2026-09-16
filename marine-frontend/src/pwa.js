import { registerSW } from 'virtual:pwa-register'

export const updateSW = registerSW({
  immediate: true,

  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('samudra:pwa-ready'))
  },

  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('samudra:pwa-update'))
  },

  onRegisteredSW() {
    window.dispatchEvent(new CustomEvent('samudra:pwa-registered'))
  },

  onRegisterError(error) {
    console.error('Samudra PWA registration failed:', error)
  },
})