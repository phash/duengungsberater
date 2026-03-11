export function useNumberFormat() {
  const formatter = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
  })

  function formatNumber(value: number): string {
    return formatter.format(value)
  }

  function formatWithUnit(value: number, unit: string): string {
    return `${formatNumber(value)} ${unit}`
  }

  return { formatNumber, formatWithUnit }
}
