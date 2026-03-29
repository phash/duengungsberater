const locale = 'de-DE'
const formatCache = new Map<string, Intl.NumberFormat>()

function getFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options)
  let fmt = formatCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options)
    formatCache.set(key, fmt)
  }
  return fmt
}

export function useNumberFormat() {
  function formatNumber(value: number, decimals?: number): string {
    const options: Intl.NumberFormatOptions = {}
    if (decimals !== undefined) {
      options.minimumFractionDigits = decimals
      options.maximumFractionDigits = decimals
    }
    return getFormatter(options).format(value)
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
    return getFormatter({ maximumFractionDigits: decimals }).format(value)
  }

  function formatSigned(value: number, decimals = 1): string {
    const prefix = value > 0 ? '+' : ''
    return prefix + getFormatter({ maximumFractionDigits: decimals }).format(value)
  }

  return { formatNumber, formatArea, formatNutrientPerHa, formatNutrientTotal, formatYield, formatValue, formatSigned }
}
