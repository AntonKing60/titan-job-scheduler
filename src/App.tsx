import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './hooks/use-auth'
import { MobileNav, Sidebar } from './components/layout'
import { JobsPage } from './pages/jobs'
import { OverduePage } from './pages/overdue'
import { CustomersPage } from './pages/customers'
import { SettingsPage } from './pages/settings'
import { Button } from './components/ui/button'

function App() {
  const { user, loading, login, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-primary p-6 text-white text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">TITAN WINDOWS</h1>
          <p className="text-primary-foreground/80">Job Scheduler & Debt Tracking</p>
        </div>
        <Button 
          onClick={login} 
          className="w-full max-w-xs h-14 text-lg font-bold bg-white text-primary hover:bg-white/90"
        >
          Login to Continue
        </Button>
        <p className="mt-8 text-sm opacity-60">High-visibility professional app for field service.</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 pb-16 lg:pb-0 overflow-y-auto bg-slate-50/50">
          <Routes>
            <Route path="/" element={<JobsPage />} />
            <Route path="/overdue" element={<OverduePage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <MobileNav />
      </div>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  )
}

export default App