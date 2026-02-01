import { parseISO, isPast, differenceInDays, startOfDay, isValid, parse } from 'date-fns'

export function getDueStatus(dueDateStr: string) {
  if (!dueDateStr) return { label: 'Ad Hoc', color: 'bg-slate-100 text-slate-600' }
  
  // Try parsing as ISO first
  let dueDate = parseISO(dueDateStr)
  
  // If invalid, try common UK formats like DD/MM/YYYY
  if (!isValid(dueDate)) {
    dueDate = parse(dueDateStr, 'dd/MM/yyyy', new Date())
  }
  
  // If still invalid, try standard Date constructor as fallback
  if (!isValid(dueDate)) {
    dueDate = new Date(dueDateStr)
  }

  // If we still don't have a valid date, return fallback
  if (!isValid(dueDate)) {
    return { label: 'Invalid Date', color: 'bg-slate-100 text-slate-400' }
  }

  const today = startOfDay(new Date())
  const jobDate = startOfDay(dueDate)
  const daysDiff = differenceInDays(jobDate, today)

  if (isPast(jobDate) && daysDiff < 0) {
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
