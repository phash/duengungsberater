declare global {
  interface Window {
    _paq?: Array<unknown[]>
  }
}

export function trackEvent(
  category: string,
  action: string,
  name?: string,
  value?: number,
) {
  window._paq?.push(['trackEvent', category, action, name, value])
}
