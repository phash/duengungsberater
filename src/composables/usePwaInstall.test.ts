import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePwaInstall, __setDeferredPrompt } from './usePwaInstall'

interface BeforeInstallPromptEventLike {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

describe('usePwaInstall', () => {
  beforeEach(() => {
    __setDeferredPrompt(null)
    // matchMedia Mock (kein Standalone)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    __setDeferredPrompt(null)
  })

  it('isStandalone=false wenn nicht standalone', () => {
    const { isStandalone } = usePwaInstall()
    expect(isStandalone.value).toBe(false)
  })

  it('isStandalone=true wenn display-mode: standalone matches', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '',
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    })
    const { isStandalone } = usePwaInstall()
    expect(isStandalone.value).toBe(true)
  })

  it('isIOS=true fuer iPhone UA', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    })
    const { isIOS } = usePwaInstall()
    expect(isIOS.value).toBe(true)
  })

  it('canPrompt=false ohne deferred prompt', () => {
    __setDeferredPrompt(null)
    const { canPrompt } = usePwaInstall()
    expect(canPrompt.value).toBe(false)
  })

  it('canPrompt=true wenn deferred prompt gesetzt', () => {
    __setDeferredPrompt({
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    } as unknown as BeforeInstallPromptEventLike as never)
    const { canPrompt } = usePwaInstall()
    expect(canPrompt.value).toBe(true)
  })

  it('install() ohne prompt liefert "unavailable"', async () => {
    __setDeferredPrompt(null)
    const { install } = usePwaInstall()
    expect(await install()).toBe('unavailable')
  })

  it('install() ruft prompt() auf und liefert outcome', async () => {
    const promptFn = vi.fn().mockResolvedValue(undefined)
    __setDeferredPrompt({
      prompt: promptFn,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    } as unknown as BeforeInstallPromptEventLike as never)
    const { install, canPrompt } = usePwaInstall()
    const result = await install()
    expect(promptFn).toHaveBeenCalled()
    expect(result).toBe('accepted')
    expect(canPrompt.value).toBe(false)
  })
})
