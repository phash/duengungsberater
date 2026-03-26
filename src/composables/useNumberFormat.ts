export function useNumberFormat() {
  const locale = 'de-DE'

  function formatNumber(value: number, decimals?: number): string {
    const options: Intl.NumberFormatOptions = {}
    if (decimals !== undefined) {
      options.minimumFractionDigits = decimals
      options.maximumFractionDigits = decimals
    }
    return new Intl.NumberFormat(locale, options).format(value)
  }

  function formatArea(ha: number): string {
    return `${formatNumber(ha, 2)} ha`
  }

  function formatNutrientPerHa(kgHa: number, code: string): string {
    return `${formatNumber(kgHa)} kg ${code}/ha`
  }

  function formatNutrientTotal(kg: number, code: string): string {
    return `${formatNumber(kg)} kg ${code}`
  }

  function formatYield(dtHa: number): string {
    return `${formatNumber(dtHa)} dt/ha`
  }

  function formatValue(value: number, decimals = 1): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(value)
  }

  function formatSigned(value: number, decimals = 1): string {
    const prefix = value > 0 ? '+' : ''
    return prefix + new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(value)
  }

  return { formatNumber, formatArea, formatNutrientPerHa, formatNutrientTotal, formatYield, formatValue, formatSigned }
}
