import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { importJobsFromCSV, previewCSV } from '@/lib/import-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Download, LogOut, Trash2, Eye } from 'lucide-react'
import { blink } from '@/lib/blink'

const CSV_URL = 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FrZARP8Hxu2WpO3qabSefmtokQlE2%2FAll_Jobs__7d4426aa.csv?alt=media&token=c3bea502-6908-4fcd-a103-d7c8805f7f24'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const [isImporting, setIsImporting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<{ columns: string[], sampleRows: Record<string, any>[] } | null>(null)

  const handlePreview = async () => {
    setIsPreviewing(true)
    const result = await previewCSV(CSV_URL)
    setIsPreviewing(false)
    
    if (result.error) {
      toast.error(`Preview failed: ${result.error}`)
    } else {
      setPreviewData(result)
      toast.success(`Found ${result.columns.length} columns and ${result.sampleRows.length} sample rows`)
    }
  }

  const handleImport = async () => {
    if (!user) return
    setIsImporting(true)
    
    const result = await importJobsFromCSV(CSV_URL, user.id)
    setIsImporting(false)
    
    if (result.success) {
      if (result.count === 0 && 'columns' in result && result.columns) {
        toast.error(`No jobs imported. CSV columns found: ${(result.columns as string[]).join(', ')}`)
      } else {
        toast.success(`Successfully imported ${result.count} jobs`)
      }
    } else {
      const errorMsg = result.error instanceof Error ? result.error.message : 'Unknown error'
      console.error('Import error:', result.error)
      toast.error(`Failed to import jobs: ${errorMsg}`)
    }
  }

  const clearJobs = async () => {
    if (!confirm('Are you sure you want to clear all jobs?')) return
    try {
      await (blink.db as any).jobs.deleteMany({ where: { userId: user?.id } })
      toast.success('All jobs cleared')
    } catch (e) {
      toast.error('Failed to clear jobs')
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Settings</h1>
        <p className="text-muted-foreground">Manage your app data and account.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Import or clear your job data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handlePreview} 
            disabled={isPreviewing}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {isPreviewing ? 'Loading...' : 'Preview CSV Columns'}
          </Button>

          {previewData && (
            <div className="bg-muted p-3 rounded-md text-sm space-y-2">
              <p className="font-medium">CSV Columns Found:</p>
              <div className="flex flex-wrap gap-1">
                {previewData.columns.map((col) => (
                  <span key={col} className="bg-background px-2 py-1 rounded border text-xs">
                    {col}
                  </span>
                ))}
              </div>
              {previewData.sampleRows.length > 0 && (
                <>
                  <p className="font-medium mt-3">First Row Sample:</p>
                  <pre className="bg-background p-2 rounded border text-xs overflow-x-auto">
                    {JSON.stringify(previewData.sampleRows[0], null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}

          <Button 
            onClick={handleImport} 
            disabled={isImporting}
            className="w-full flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isImporting ? 'Importing...' : 'Import Initial Jobs (CSV)'}
          </Button>
          
          <Button 
            onClick={clearJobs} 
            variant="destructive"
            className="w-full flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Jobs
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>You are logged in as {user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={logout} 
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
