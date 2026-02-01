import Papa from 'papaparse'
import { blink } from './blink'

// Flexible column name mapping - maps possible CSV column names to our field names
const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['Name', 'Customer Name', 'Customer', 'Client', 'Client Name', 'Full Name', 'ContactName'],
  address: ['Job Address', 'Address', 'Street Address', 'Location', 'Site Address', 'Property Address', 'Street', 'AddressLine1'],
  phone: ['Phone', 'Phone Number', 'Telephone', 'Mobile', 'Cell', 'Contact Number', 'Tel'],
  services: ['Services', 'Service', 'Work Carried Out', 'Work', 'Job Type', 'Description', 'Type'],
  price: ['Price', 'Cost', 'Amount', 'Fee', 'Charge', 'Rate', 'Job Price', 'Total'],
  nextDue: ['Next Due', 'NextDue', 'Due Date', 'Due', 'Next Service', 'When work is due', 'Schedule Date', 'Scheduled'],
  frequency: ['Frequency', 'Freq', 'Job Frequency', 'Interval'],
  notes: ['Notes', 'Comments', 'Remarks', 'Description', 'Info', 'Details'],
  balance: ['Balance', 'Outstanding', 'Owed', 'Debt'],
}

// Find the matching column in the row for a given field
function findColumn(row: Record<string, any>, fieldName: string, strict = false): string {
  const possibleNames = COLUMN_MAPPINGS[fieldName] || []
  
  // First try exact match (case-insensitive)
  for (const colName of possibleNames) {
    const key = Object.keys(row).find(k => k.toLowerCase() === colName.toLowerCase())
    if (key && row[key]) return row[key]
  }
  
  if (strict) return ''

  // Then try partial match
  for (const colName of possibleNames) {
    const key = Object.keys(row).find(k => 
      k.toLowerCase().includes(colName.toLowerCase()) || 
      colName.toLowerCase().includes(k.toLowerCase())
    )
    if (key && row[key]) return row[key]
  }
  
  return ''
}

// Preview CSV to show column names before import
export async function previewCSV(csvUrl: string): Promise<{ columns: string[], sampleRows: Record<string, any>[], error?: string }> {
  try {
    const csvText = await blink.data.extractFromUrl(csvUrl)
    
    if (!csvText) {
      return { columns: [], sampleRows: [], error: 'No content extracted from CSV URL' }
    }
    
    const { data } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    })
    
    const columns = data.length > 0 ? Object.keys(data[0] as object) : []
    const sampleRows = data.slice(0, 3) as Record<string, any>[]
    
    return { columns, sampleRows }
  } catch (error) {
    console.error('Preview failed:', error)
    return { columns: [], sampleRows: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function importJobsFromCSV(csvUrl: string, userId: string) {
  try {
    // Use blink.data.extractFromUrl which handles CORS via server-side proxy
    const csvText = await blink.data.extractFromUrl(csvUrl)
    
    if (!csvText) {
      throw new Error('No content extracted from CSV URL')
    }
    
    console.log('CSV first 500 chars:', csvText.substring(0, 500))
    
    const { data, errors } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    })

    console.log('Parsed rows:', data.length, 'Errors:', errors.length)
    if (data.length > 0) {
      console.log('Available columns:', Object.keys(data[0] as object))
      console.log('First row sample:', data[0])
    }

    const jobsToInsert = data
      .filter((row: any) => {
        // Use flexible column finding
        const name = findColumn(row, 'name')
        const address = findColumn(row, 'address')
        // Must have at least a name OR an address to be valid
        return (name.trim().length > 0 && name !== 'Unknown') || address.trim().length > 0
      })
      .map((row: any) => {
        const nameRaw = findColumn(row, 'name')
        const name = nameRaw.replace(/Name:\s*/i, '').trim()
        const address = findColumn(row, 'address')
        const balanceStr = findColumn(row, 'balance')
        const balance = parseFloat(balanceStr.replace(/[^0-9.]/g, '') || '0')
        
        // Clean and validate price - must be numeric
        let priceStr = '0.00'
        const priceStrRaw = findColumn(row, 'price')
        if (priceStrRaw) {
          const cleaned = priceStrRaw.replace(/Price:\s*/i, '').replace(/£/g, '').trim()
          const numeric = parseFloat(cleaned.replace(/[^0-9.]/g, ''))
          if (!isNaN(numeric)) {
            priceStr = numeric.toFixed(2)
          }
        }
        
        let nextDue = findColumn(row, 'nextDue')
        let frequency = findColumn(row, 'frequency', true) // Strict mapping for frequency
        
        const notesRaw = findColumn(row, 'notes')
        const notes = notesRaw.replace(/Notes:\s*/i, '').trim()
        
        const paymentMethods = ['Bank Transfer', 'Cash', 'Card']
        const matchedMethod = paymentMethods.find(m => 
          notes.toLowerCase().includes(m.toLowerCase())
        )

        return {
          userId,
          name: name || address.split(',')[0] || 'Unknown',
          address: address,
          phone: findColumn(row, 'phone'),
          services: findColumn(row, 'services') || 'Window Cleaning',
          price: priceStr,
          balance: balance.toFixed(2),
          nextDue: nextDue,
          frequency: frequency,
          paymentMethod: matchedMethod || '',
          notes: matchedMethod ? notes.replace(new RegExp(matchedMethod, 'gi'), '').trim() : notes,
          status: balance > 0 ? 'debtor' : 'pending',
        }
      })

    console.log('Jobs to insert:', jobsToInsert.length)
    if (jobsToInsert.length > 0) {
      console.log('Sample job being inserted:', jobsToInsert[0])
    }

    if (jobsToInsert.length === 0) {
      return { success: true, count: 0, columns: data.length > 0 ? Object.keys(data[0] as object) : [] }
    }

    // Batch insert in chunks of 50 to avoid potential issues
    const chunkSize = 50
    for (let i = 0; i < jobsToInsert.length; i += chunkSize) {
      const chunk = jobsToInsert.slice(i, i + chunkSize)
      await (blink.db as any).jobs.createMany(chunk)
    }

    return { success: true, count: jobsToInsert.length }
  } catch (error) {
    console.error('Import failed:', error)
    return { success: false, error }
  }
}
