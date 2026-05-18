function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n)
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

const SEC_FORMS: [string, string, string] = ['секунду', 'секунды', 'секунд']
const MIN_FORMS: [string, string, string] = ['минуту', 'минуты', 'минут']
const HOUR_FORMS: [string, string, string] = ['час', 'часа', 'часов']

export function formatDuration(ms: number): string {
  if (ms < 1000) return 'меньше секунды'

  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) {
    return `${String(totalSec)} ${plural(totalSec, SEC_FORMS)}`
  }

  const totalMin = Math.floor(totalSec / 60)
  if (totalMin < 60) {
    return `${String(totalMin)} ${plural(totalMin, MIN_FORMS)}`
  }

  const totalHours = Math.floor(totalMin / 60)
  return `${String(totalHours)} ${plural(totalHours, HOUR_FORMS)}`
}
