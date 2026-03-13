// Patch getComputedStyle to properly handle inline styles in jsdom
const originalGetComputedStyle = window.getComputedStyle

window.getComputedStyle = function(element: Element, ...args): CSSStyleDeclaration {
  const computed = originalGetComputedStyle.call(window, element, ...args) as CSSStyleDeclaration
  const inlineStyle = (element as HTMLElement).style

  // If element has inline display style, use that instead of computed
  if (inlineStyle.display) {
    Object.defineProperty(computed, 'display', {
      value: inlineStyle.display,
      configurable: true,
    })
  }

  return computed
}
