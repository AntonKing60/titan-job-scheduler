import { useEffect, useState } from 'react'
import { blink } from '@/lib/blink'
import { useAuth } from '@/hooks/use-auth'
import { Job } from '@/components/job-card'
import { toast } from 'sonner'
import { Landmark, Loader2, Phone, MapPin, CheckCircle, Repeat } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function OverduePage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOverdue = async () => {
    setLoading(true)
    try {
      // Find all jobs where balance is > 0 (no user filter - show all)
      const results = await (blink.db as any).jobs.list({})
      
      // Filter for jobs with positive balance manually as SDK might return strings
      const overdue = (results as Job[]).filter(job => {
        const balance = parseFloat((job.balance || '0').toString().replace(/[^0-9.]/g, ''))
        return balance > 0
      }).sort((a, b) => {
        const balanceA = parseFloat((a.balance || '0').toString().replace(/[^0-9.]/g, ''))
        const balanceB = parseFloat((b.balance || '0').toString().replace(/[^0-9.]/g, ''))
        return balanceB - balanceA // Sort by balance descending
      }).slice(0, 30) // Limit to 30 as requested

      setJobs(overdue)
    } catch (e) {
      toast.error('Failed to load overdue jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverdue()
  }, [])

  const handlePaid = async (jobId: string) => {
    try {
      await (blink.db as any).jobs.update(jobId, { 
        status: 'completed',
        balance: '0.00',
        payment_method: 'Paid'
      })
      toast.success('Payment confirmed')
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch (e) {
      toast.error('Failed to update status')
    }
  }

  const totalOwed = jobs.reduce((sum, job) => {
    const balance = parseFloat((job.balance || '0').toString().replace(/[^0-9.]/g, ''))
    return sum + (isNaN(balance) ? 0 : balance)
  }, 0).toFixed(2)

  const formatBalance = (val: string | undefined) => {
    const balance = parseFloat((val || '0').toString().replace(/[^0-9.]/g, ''))
    return isNaN(balance) ? '0.00' : balance.toFixed(2)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-primary text-white p-6 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">OVERDUE</h1>
          <Badge className="bg-white text-primary text-lg px-4 py-1">£{totalOwed}</Badge>
        </div>
        <p className="text-primary-foreground/80 font-medium">
          Tracking {jobs.length} jobs with outstanding balances.
        </p>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Loading overdue jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <div className="bg-green-100 p-6 rounded-full">
              <Landmark className="h-12 w-12 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-700">All Clear!</h3>
              <p className="text-muted-foreground">No overdue jobs found.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <Card key={job.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{job.name}: <span className="text-red-600 font-black">£{formatBalance(job.balance)}</span></h3>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {job.address}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-md mb-4 text-sm border border-slate-200">
                    <div className="text-muted-foreground italic mb-1">"{job.services}"</div>
                    <div className="flex items-center text-[10px] text-primary/70 font-bold uppercase tracking-wider">
                      <Repeat className="h-3 w-3 mr-1" />
                      {job.frequency || 'Adhoc'}
                    </div>
                    {job.paymentMethod && (
                      <div className="flex items-center mt-2 text-xs font-bold text-green-600">
                        <Landmark className="h-3 w-3 mr-1" />
                        {job.paymentMethod}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {job.phone && (
                      <Button variant="outline" className="flex-1 border-purple-200 text-purple-700" asChild>
                        <a href={`tel:${job.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Contact
                        </a>
                      </Button>
                    )}
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 font-bold"
                      onClick={() => handlePaid(job.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Paid
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
