import { useEffect, useState, useMemo } from 'react'
import { blink } from '@/lib/blink'
import { useAuth } from '@/hooks/use-auth'
import { JobCard, Job, JOB_TYPES } from '@/components/job-card'
import { toast } from 'sonner'
import { Search, Loader2, Calendar, Plus, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { format, addDays, subDays } from 'date-fns'
import { normalizeDateToString, getTodayString } from '@/lib/date-utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function JobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null) // null = show ALL jobs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  
  // New job form state
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newJobType, setNewJobType] = useState('Windows')
  const [newNextDue, setNewNextDue] = useState('')
  const [newFrequency, setNewFrequency] = useState('')
  const [newPaymentMethod, setNewPaymentMethod] = useState('')

  const fetchJobs = async () => {
    setLoading(true)
    try {
      // Fetch ALL pending jobs (no user_id filter) sorted by next_due date
      const results = await (blink.db as any).jobs.list({
        where: { 
          status: 'pending' 
        }
      })
      
      // Sorting by Next Due (soonest first) - Safari-safe string comparison
      const sortedJobs = (results as Job[]).sort((a, b) => {
        const dateA = normalizeDateToString(a.nextDue)
        const dateB = normalizeDateToString(b.nextDue)
        
        // Jobs without valid dates go to the end
        if (!dateA) return 1
        if (!dateB) return -1
        
        // YYYY-MM-DD strings can be compared lexicographically
        return dateA.localeCompare(dateB)
      })

      setJobs(sortedJobs)
    } catch (e) {
      console.error('Failed to load jobs:', e)
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch all jobs on component mount - no user dependency
    fetchJobs()
  }, [])

  const handleFinishJob = async (jobId: string, type: 'Cash' | 'Card' | 'Bank Transfer') => {
    try {
      const job = jobs.find(j => j.id === jobId)
      const isBankTransfer = type === 'Bank Transfer'
      const newStatus = isBankTransfer ? 'overdue' : 'completed'
      const balanceValue = isBankTransfer ? (job?.price || '0.00') : '0.00'
      
      await (blink.db as any).jobs.update(jobId, { 
        status: newStatus,
        payment_method: type,
        balance: balanceValue
      })
      
      toast.success(isBankTransfer ? 'Job moved to Debtors' : 'Job marked as finished')
      
      // Update local state optimistically
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch (e) {
      toast.error('Failed to finish job')
    }
  }

  const handleEditJob = async (jobId: string, updates: Partial<Job>) => {
    try {
      await (blink.db as any).jobs.update(jobId, updates)
      toast.success('Job updated successfully')
      
      // Update local state optimistically
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j))
    } catch (e) {
      toast.error('Failed to update job')
    }
  }

  const handleAddJob = async () => {
    if (!user || !newName || !newAddress) {
      toast.error('Please fill in customer name and address')
      return
    }
    
    try {
      const newJob = await (blink.db as any).jobs.create({
        userId: user.id,
        name: newName,
        address: newAddress,
        phone: newPhone,
        services: newJobType,
        price: newPrice || '0.00',
        nextDue: newNextDue || new Date().toISOString().split('T')[0],
        frequency: newFrequency,
        paymentMethod: newPaymentMethod,
        status: 'pending',
      })
      
      toast.success('Job added successfully')
      setJobs(prev => [...prev, newJob].sort((a, b) => {
        const dateA = normalizeDateToString(a.nextDue)
        const dateB = normalizeDateToString(b.nextDue)
        
        if (!dateA) return 1
        if (!dateB) return -1
        
        return dateA.localeCompare(dateB)
      }))
      
      // Reset form
      setNewName('')
      setNewAddress('')
      setNewPhone('')
      setNewPrice('')
      setNewJobType('Windows')
      setNewNextDue('')
      setNewFrequency('')
      setNewPaymentMethod('')
      setIsAddDialogOpen(false)
    } catch (e) {
      toast.error('Failed to add job')
    }
  }

  // Helper to format a Date object to YYYY-MM-DD string (Safari-safe)
  const dateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const filteredJobs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    
    // Search Override: If searching, show all matching jobs from the database
    if (query) {
      return jobs.filter(job => 
        (job.name?.toLowerCase() || '').includes(query) ||
        (job.address?.toLowerCase() || '').includes(query) ||
        (job.services?.toLowerCase() || '').includes(query)
      )
    }

    // Show ALL JOBS if no date selected (default view) - sorted by next_due
    if (selectedDate === null) {
      return jobs // Already sorted by next_due in fetchJobs
    }

    // Safari-safe: Convert dates to YYYY-MM-DD strings for comparison
    const selectedDateStr = dateToString(selectedDate)
    const todayStr = getTodayString()
    const isToday = selectedDateStr === todayStr

    return jobs.filter(job => {
      if (!job.nextDue) return false
      
      // Normalize job date to YYYY-MM-DD format using shared utility
      const jobDateStr = normalizeDateToString(job.nextDue)
      if (!jobDateStr) return false
      
      if (isToday) {
        // For today, show today's jobs AND overdue jobs (string comparison works for YYYY-MM-DD)
        return jobDateStr === selectedDateStr || jobDateStr < selectedDateStr
      }
      
      // For any other specific date, show only jobs due on that date
      return jobDateStr === selectedDateStr
    })
  }, [jobs, searchQuery, selectedDate])

  const nextDay = () => setSelectedDate(prev => prev ? addDays(prev, 1) : addDays(new Date(), 1))
  const prevDay = () => setSelectedDate(prev => prev ? subDays(prev, 1) : subDays(new Date(), 1))
  const goToToday = () => setSelectedDate(new Date())
  const showAllJobs = () => setSelectedDate(null)
  
  // Safari-safe isSameDay check using string comparison
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return dateToString(date1) === dateToString(date2)
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black italic tracking-tighter">TITAN JOBS</h1>
          <div className="flex gap-2">
            <button 
              onClick={showAllJobs}
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform ${selectedDate === null ? 'bg-white text-primary' : 'bg-white/20'}`}
            >
              ALL
            </button>
            <button 
              onClick={goToToday}
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform ${selectedDate !== null && isSameDay(selectedDate, new Date()) ? 'bg-white text-primary' : 'bg-white/20'}`}
            >
              <Calendar className="h-3 w-3" />
              TODAY
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
          <Input 
            placeholder="Search all jobs..." 
            className="pl-10 bg-white border-none text-black h-11 rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date Navigator - Always visible */}
        {!searchQuery && (
          <div className="flex items-center justify-between bg-white/10 rounded-lg p-2 backdrop-blur-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={prevDay}
              className="text-white hover:bg-white/20 h-10 w-10 touch-manipulation"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/20 font-bold flex items-center gap-2 h-10 px-4 touch-manipulation"
                >
                  <CalendarDays className="h-5 w-5 opacity-70" />
                  {selectedDate === null 
                    ? 'Pick a Date' 
                    : format(selectedDate, 'EEE, d MMM')}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                align="center"
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <CalendarComponent
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(date) => date && setSelectedDate(date)}
                />
              </PopoverContent>
            </Popover>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={nextDay}
              className="text-white hover:bg-white/20 h-10 w-10 touch-manipulation"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        )}
      </header>

      <div className="flex-1 p-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Loading your jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center space-y-4">
            <div className="bg-slate-200 p-4 rounded-full">
              <Calendar className="h-10 w-10 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {searchQuery 
                  ? 'No jobs matching search' 
                  : selectedDate === null 
                    ? 'No pending jobs' 
                    : 'No jobs due for this date'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'Try a different search term.' 
                  : selectedDate === null
                    ? 'All jobs are completed or add a new job to get started!'
                    : isSameDay(selectedDate, new Date()) 
                      ? 'All caught up for today!' 
                      : `No jobs scheduled for ${format(selectedDate, 'do MMMM')}.`}
              </p>
              {!searchQuery && selectedDate !== null && !isSameDay(selectedDate, new Date()) && (
                <Button variant="link" onClick={showAllJobs} className="mt-2">
                  Show All Jobs
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {searchQuery 
                  ? 'Search Results' 
                  : selectedDate === null 
                    ? 'All Jobs' 
                    : format(selectedDate, 'EEEE')} — {filteredJobs.length} Jobs
              </span>
            </div>
            {filteredJobs.map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                onFinish={handleFinishJob}
                onEdit={handleEditJob}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsAddDialogOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add Job Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">Add New Job</DialogTitle>
            <DialogDescription className="text-center">
              Enter the job details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Customer Name *</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">Address *</Label>
              <Input
                id="new-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Phone</Label>
              <Input
                id="new-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone number"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-price">Price (£)</Label>
              <Input
                id="new-price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-jobtype">Job Type</Label>
              <Select value={newJobType} onValueChange={setNewJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-nextdue">Next Due Date</Label>
              <Input
                id="new-nextdue"
                value={newNextDue}
                onChange={(e) => setNewNextDue(e.target.value)}
                type="date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-frequency">Frequency</Label>
              <Input
                id="new-frequency"
                value={newFrequency}
                onChange={(e) => setNewFrequency(e.target.value)}
                placeholder="e.g. 4 Weeks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-payment-method">Payment Method</Label>
              <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                <SelectTrigger id="new-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddJob} className="w-full font-bold">
            Add Job
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
