import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getDueStatus } from '@/lib/date-utils'
import { MapPin, Phone, CreditCard, Banknote, Landmark, CheckCircle2, Pencil, Repeat, StickyNote } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export const JOB_TYPES = ['Windows', 'Gutters', 'Fascias', 'Pressure Washing', 'Conservatory', 'Other'] as const
export type JobType = typeof JOB_TYPES[number]

export interface Job {
  id: string
  name: string
  address: string
  phone: string
  services: string
  price: string
  nextDue: string
  status: string
  jobType?: string
  frequency?: string
  notes?: string
  paymentMethod?: string
  balance?: string
}

interface JobCardProps {
  job: Job
  onFinish: (jobId: string, type: 'Cash' | 'Card' | 'Bank Transfer') => void
  onEdit?: (jobId: string, updates: Partial<Job>) => void
}

export function JobCard({ job, onFinish, onEdit }: JobCardProps) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editName, setEditName] = useState(job.name)
  const [editAddress, setEditAddress] = useState(job.address)
  const [editPrice, setEditPrice] = useState(job.price)
  const [editJobType, setEditJobType] = useState(job.services || 'Windows')
  const [editFrequency, setEditFrequency] = useState(job.frequency || '')
  const [editPaymentMethod, setEditPaymentMethod] = useState(job.paymentMethod || '')
  
  const formatPrice = (price: string) => {
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''))
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return 'Enter rate'
    }
    return `£${numericPrice.toFixed(2)}`
  }
  
  const cleanName = (name: string) => {
  return name.replace(/Name:\s*/i, '').trim()
  }
  
  const dueStatus = getDueStatus(job.nextDue)

  const handleFinishAction = (type: 'Cash' | 'Card' | 'Bank Transfer') => {
    onFinish(job.id, type)
    setIsPaymentOpen(false)
  }

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(job.id, {
        name: editName,
        address: editAddress,
        price: editPrice,
        services: editJobType,
        frequency: editFrequency,
        paymentMethod: editPaymentMethod,
      })
    }
    setIsEditOpen(false)
  }

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow mb-4">
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground leading-tight">{cleanName(job.name)}</h3>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="line-clamp-1">{job.address}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold text-primary mb-1">{formatPrice(job.price)}</div>
              <Badge variant="secondary" className={`px-2 py-0 h-5 text-[10px] uppercase font-black ${dueStatus.color}`}>
                {dueStatus.label}
              </Badge>
            </div>
          </div>

          <div className="bg-secondary/20 p-3 rounded-md border border-secondary/30">
            <p className="text-sm font-medium text-foreground/80 italic line-clamp-2">
              "{job.services}"
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-secondary/20">
              <div className="flex items-center text-[11px] text-primary/80 font-bold tracking-tight bg-primary/5 px-2 py-0.5 rounded w-fit">
                <Repeat className="h-3 w-3 mr-1" />
                {job.frequency || 'Ad hoc'}
              </div>
              
              {job.paymentMethod && (
                <div className="flex items-center text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                  <StickyNote className="h-3 w-3 mr-1" />
                  <span className="line-clamp-1">{job.paymentMethod}</span>
                </div>
              )}
            </div>

            {job.notes && !job.paymentMethod && (
              <div className="flex items-center mt-2 text-xs text-muted-foreground/80 italic">
                <StickyNote className="h-3 w-3 mr-1" />
                <span className="line-clamp-1">{job.notes.replace(/Notes:\s*/i, '')}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {job.phone && (
              <Button variant="outline" size="sm" className="flex-1 h-10 border-primary/20 text-primary" asChild>
                <a href={`tel:${job.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </a>
              </Button>
            )}
            
            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 px-3 border-primary/20 text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md w-[90vw] rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-center text-2xl font-bold">Edit Job</DialogTitle>
                  <DialogDescription className="text-center">
                    Update the job details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Customer Name</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price (£)</Label>
                    <Input
                      id="edit-price"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-jobtype">Job Type</Label>
                    <Select value={editJobType} onValueChange={setEditJobType}>
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
                    <Label htmlFor="edit-frequency">Frequency</Label>
                    <Input
                      id="edit-frequency"
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value)}
                      placeholder="e.g. 4 Weeks"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-payment-method">Payment Method</Label>
                    <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                      <SelectTrigger id="edit-payment-method">
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
                <Button onClick={handleSaveEdit} className="w-full font-bold">
                  Save Changes
                </Button>
              </DialogContent>
            </Dialog>
            
            {/* Payment Dialog */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 h-10 font-bold bg-primary hover:bg-primary/90">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finish
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md w-[90vw] rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-center text-2xl font-bold">Complete Job</DialogTitle>
                  <DialogDescription className="text-center">
                    Select payment method
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-3 py-4">
                  <Button 
                    onClick={() => handleFinishAction('Cash')}
                    variant="outline" 
                    className="h-20 text-xl font-black flex items-center justify-start gap-4 border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
                  >
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Banknote className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="uppercase tracking-tighter italic">CASH</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Paid via cash</span>
                    </div>
                  </Button>

                  <Button 
                    onClick={() => handleFinishAction('Card')}
                    variant="outline" 
                    className="h-20 text-xl font-black flex items-center justify-start gap-4 border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
                  >
                    <div className="bg-primary/10 p-3 rounded-full">
                      <CreditCard className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="uppercase tracking-tighter italic">CARD</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Paid via card reader</span>
                    </div>
                  </Button>

                  <Button 
                    onClick={() => handleFinishAction('Bank Transfer')}
                    variant="outline" 
                    className="h-20 text-xl font-black flex items-center justify-start gap-4 border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-95"
                  >
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Landmark className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="uppercase tracking-tighter italic text-blue-700">BANK TRANSFER</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Owed - move to Overdue</span>
                    </div>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
