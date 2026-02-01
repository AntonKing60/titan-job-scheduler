import { useEffect, useState, useRef } from 'react'
import { blink } from '@/lib/blink'
import { useAuth } from '@/hooks/use-auth'
import { importCustomersFromFile } from '@/lib/import-customers'
import { toast } from 'sonner'
import { Users, Loader2, Phone, MapPin, Search, Plus, Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Customer {
  id: string
  reference: string
  name: string
  address: string
  phone: string
}

export function CustomersPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // New customer form state
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const fetchCustomers = async () => {
    if (!user) return
    setLoading(true)
    try {
      const results = await (blink.db as any).customers.list({
        where: { userId: user.id },
        orderBy: { name: 'asc' }
      })
      setCustomers(results || [])
    } catch (e) {
      console.error('Failed to load customers:', e)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [user])

  const handleAddCustomer = async () => {
    if (!user || !newName.trim()) {
      toast.error('Please enter a customer name')
      return
    }
    
    try {
      const newCustomer = await (blink.db as any).customers.create({
        userId: user.id,
        reference: '',
        name: newName.trim(),
        address: newAddress.trim(),
        phone: newPhone.trim(),
      })
      
      toast.success('Customer added successfully')
      
      // Add to local state
      setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)))
      
      // Reset form
      setNewName('')
      setNewAddress('')
      setNewPhone('')
      setIsAddDialogOpen(false)
    } catch (e) {
      console.error('Failed to add customer:', e)
      toast.error('Failed to add customer')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsImporting(true)
    try {
      const result = await importCustomersFromFile(file, user.id)
      if (result.success) {
        toast.success(`Imported ${result.count} customers successfully!`)
        fetchCustomers()
      } else {
        toast.error('Failed to import customers')
      }
    } catch (err) {
      console.error('Import error:', err)
      toast.error('Failed to import CSV')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.reference?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-primary text-white p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">CUSTOMERS</h1>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {customers.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40" />
          <Input 
            placeholder="Search customers..." 
            className="pl-10 bg-white border-none text-black h-11 rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="p-4 space-y-4 pb-24">
        {/* Import CSV Button */}
        {customers.length === 0 && !loading && (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-6 text-center">
              <Upload className="h-10 w-10 mx-auto mb-3 text-primary/60" />
              <h3 className="font-bold text-lg mb-2">Import Customers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your CSV file with Name, Address, Reference, and Phone columns
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="font-bold"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Select CSV File
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 && customers.length > 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-slate-300 mb-2" />
            <p className="text-muted-foreground">No customers match your search.</p>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold">{customer.name}</h3>
                    {customer.reference && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {customer.reference}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {customer.address && (
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-2 flex-shrink-0" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                        {customer.phone}
                      </div>
                    )}
                  </div>
                  {customer.phone && (
                    <Button variant="outline" className="w-full border-primary/20 text-primary" asChild>
                      <a href={`tel:${customer.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call Customer
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef}
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Floating Add Button */}
      <button
        onClick={() => setIsAddDialogOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 z-20"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Import button when customers exist */}
      {customers.length > 0 && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="fixed bottom-24 right-24 w-14 h-14 bg-secondary text-primary rounded-full shadow-lg flex items-center justify-center hover:bg-secondary/90 transition-all hover:scale-105 active:scale-95 z-20"
        >
          {isImporting ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </button>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">Add New Customer</DialogTitle>
            <DialogDescription className="text-center">
              Enter the customer details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Customer Name *</Label>
              <Input
                id="cust-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-address">Address</Label>
              <Input
                id="cust-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Phone</Label>
              <Input
                id="cust-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone number"
                type="tel"
              />
            </div>
          </div>
          <Button onClick={handleAddCustomer} className="w-full font-bold">
            Add Customer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
