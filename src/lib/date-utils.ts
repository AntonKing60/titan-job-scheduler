/**
 * Safari-safe date utilities
 * Uses YYYY-MM-DD string comparison instead of new Date() to avoid Safari "Invalid Date" errors
 */

/**
 * Normalize any date string to YYYY-MM-DD format for Safari-safe comparison
 * Safari doesn't like dashes in some contexts, so we parse manually
 */
export function normalizeDateToString(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null
  
  const str = dateStr.trim()
  
  // Handle YYYY-MM-DD or YYYY/MM/DD format
  const isoMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }
  
  // Handle DD/MM/YYYY or DD-MM-YYYY UK format
  const ukMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/)
  if (ukMatch) {
    return `${ukMatch[3]}-${ukMatch[2]}-${ukMatch[1]}`
  }
  
  // Handle ISO datetime strings (YYYY-MM-DDTHH:MM:SS)
  const isoDateTimeMatch = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})T/)
  if (isoDateTimeMatch) {
    return `${isoDateTimeMatch[1]}-${isoDateTimeMatch[2]}-${isoDateTimeMatch[3]}`
  }
  
  return null
}

/**
 * Get today's date as YYYY-MM-DD string (Safari-safe)
 */
export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculate days difference between two YYYY-MM-DD strings
 * Positive = future, Negative = past, 0 = same day
 */
export function daysDiffFromStrings(dateStr1: string, dateStr2: string): number {
  // Parse as local dates by using component extraction
  const [y1, m1, d1] = dateStr1.split('-').map(Number)
  const [y2, m2, d2] = dateStr2.split('-').map(Number)
  
  // Create dates at midnight local time
  const date1 = new Date(y1, m1 - 1, d1)
  const date2 = new Date(y2, m2 - 1, d2)
  
  const diffTime = date1.getTime() - date2.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

export function getDueStatus(dueDateStr: string) {
  if (!dueDateStr) return { label: 'Ad Hoc', color: 'bg-slate-100 text-slate-600' }
  
  // Normalize the date to YYYY-MM-DD string format (Safari-safe)
  const jobDateStr = normalizeDateToString(dueDateStr)
  
  if (!jobDateStr) {
    return { label: 'Invalid Date', color: 'bg-slate-100 text-slate-400' }
  }

  const todayStr = getTodayString()
  
  // Compare as strings (YYYY-MM-DD format allows lexicographic comparison)
  const daysDiff = daysDiffFromStrings(jobDateStr, todayStr)

  if (daysDiff < 0) {
    return { label: `Overdue`, color: 'bg-red-100 text-red-700 font-bold border border-red-200' }
  }
  
  if (daysDiff === 0) {
    return { label: 'Due Today', color: 'bg-orange-100 text-orange-700 font-bold border border-orange-200' }
  }

  if (daysDiff === 1) {
    return { label: 'Due Tomorrow', color: 'bg-blue-50 text-blue-700' }
  }

  return { label: `In ${daysDiff} days`, color: 'bg-blue-50 text-blue-600' }
}
