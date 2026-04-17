/**
 * XSS-sichere Tooltip-Erstellung für Leaflet-Polygone.
 *
 * Statt HTML-String mit interpoliertem User-Input (→ XSS-Gefahr) wird
 * das Tooltip als DOM-Element aufgebaut. `textContent` escaped alle
 * Sonderzeichen automatisch.
 */
export function buildTooltipElement(name: string, sizeHa: number): HTMLElement {
  const formatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })
  const container = document.createElement('div')
  const strong = document.createElement('strong')
  strong.textContent = name
  container.appendChild(strong)
  container.appendChild(document.createElement('br'))
  container.appendChild(document.createTextNode(`${formatter.format(sizeHa)} ha`))
  return container
}
