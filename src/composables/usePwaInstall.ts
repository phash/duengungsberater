import { ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Modul-lokaler Singleton: main.ts fuettert deferredPrompt via __setDeferredPrompt()
// BEVOR Komponenten mounten. Das Event muss sofort gefangen und praeventDefault()ed werden.
let deferredPrompt: BeforeInstallPromptEvent | null = null

export function __setDeferredPrompt(p: BeforeInstallPromptEvent | null): void {
  deferredPrompt = p
}

function isStandaloneMode(): boolean {
  // iOS Safari signalisiert Standalone ueber window.navigator.standalone
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return window.matchMedia('(display-mode: standalone)').matches
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent)
}

export function usePwaInstall() {
  const canPrompt = ref<boolean>(deferredPrompt !== null)
  const isStandalone = ref<boolean>(isStandaloneMode())
  const isIOS = ref<boolean>(isIOSDevice())

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable'
    const prompt = deferredPrompt
    await prompt.prompt()
    const result = await prompt.userChoice
    deferredPrompt = null
    canPrompt.value = false
    return result.outcome
  }

  return { canPrompt, isStandalone, isIOS, install }
}
