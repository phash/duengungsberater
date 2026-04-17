import { describe, it, expect } from 'vitest'
import { buildTooltipElement } from '../fieldMapTooltip'

describe('buildTooltipElement', () => {
  it('escaped HTML-Sonderzeichen im Feldnamen (keine XSS)', () => {
    const el = buildTooltipElement('<img src=x onerror=alert(1)>', 4.91)
    // Kein lebendes <img>-Tag im DOM (Leaflet würde es rendern = XSS)
    expect(el.querySelector('img')).toBeNull()
    // innerHTML muss die <> escapen
    expect(el.innerHTML).toContain('&lt;img')
    // Gefährlicher String erscheint als Text
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('formatiert Flächenangabe mit deutschem Komma', () => {
    const el = buildTooltipElement('Normales Feld', 4.91)
    expect(el.textContent).toContain('4,91 ha')
  })

  it('rendert Feldnamen als <strong>', () => {
    const el = buildTooltipElement('Oberer Acker', 12.5)
    const strong = el.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong?.textContent).toBe('Oberer Acker')
  })

  it('rundet Fläche auf 2 Nachkommastellen', () => {
    const el = buildTooltipElement('Acker', 3.14159)
    expect(el.textContent).toContain('3,14 ha')
  })

  it('behandelt leeren Namen ohne Fehler', () => {
    const el = buildTooltipElement('', 1)
    expect(el.textContent).toContain('1 ha')
  })
})
