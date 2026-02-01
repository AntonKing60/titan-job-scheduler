import Papa from 'papaparse'
import { blink } from './blink'

export interface CustomerCSV {
  Name: string
  Reference: string
  Address: string
  Phone: string
}

export async function importCustomersFromCSV(csvText: string, userId: string) {
  try {
    const { data } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    })

    const customersToInsert = data
      .filter((row: any) => row.Name && row.Name.trim())
      .map((row: any) => ({
        userId,
        reference: row.Reference || '',
        name: row.Name?.trim() || 'Unknown',
        address: row.Address?.trim() || '',
        phone: row.Phone?.trim() || '',
      }))

    // Batch insert in chunks of 50
    const chunkSize = 50
    for (let i = 0; i < customersToInsert.length; i += chunkSize) {
      const chunk = customersToInsert.slice(i, i + chunkSize)
      await (blink.db as any).customers.createMany(chunk)
    }

    return { success: true, count: customersToInsert.length }
  } catch (error) {
    console.error('Customer import failed:', error)
    return { success: false, error }
  }
}

export async function importCustomersFromFile(file: File, userId: string): Promise<{ success: boolean; count?: number; error?: any }> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const customersToInsert = results.data
            .filter((row: any) => row.Name && row.Name.trim())
            .map((row: any) => ({
              userId,
              reference: row.Reference || '',
              name: row.Name?.trim() || 'Unknown',
              address: row.Address?.trim() || '',
              phone: row.Phone?.trim() || '',
            }))

          // Batch insert in chunks of 50
          const chunkSize = 50
          for (let i = 0; i < customersToInsert.length; i += chunkSize) {
            const chunk = customersToInsert.slice(i, i + chunkSize)
            await (blink.db as any).customers.createMany(chunk)
          }

          resolve({ success: true, count: customersToInsert.length })
        } catch (error) {
          console.error('Customer import failed:', error)
          resolve({ success: false, error })
        }
      },
      error: (error) => {
        console.error('CSV parsing failed:', error)
        resolve({ success: false, error })
      }
    })
  })
}
