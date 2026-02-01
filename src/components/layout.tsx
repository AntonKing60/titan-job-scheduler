import { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ClipboardList, Landmark, Users, Settings, Repeat } from 'lucide-react'

interface NavItemProps {
  to: string
  icon: LucideIcon
  label: string
}

const NavItem = ({ to, icon: Icon, label }: NavItemProps) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors",
        isActive 
          ? "text-primary border-t-2 border-primary" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-6 w-6 mb-1" />
      {label}
    </Link>
  )
}

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t flex justify-around items-center h-16 safe-area-pb lg:hidden z-50">
      <NavItem to="/" icon={ClipboardList} label="Jobs" />
      <NavItem to="/overdue" icon={Landmark} label="Overdue" />
      <NavItem to="/customers" icon={Users} label="Customers" />
      <NavItem to="/settings" icon={Settings} label="Settings" />
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r h-screen bg-secondary/30">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-primary tracking-tight uppercase">Titan Windows</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link 
          to="/" 
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-foreground font-medium"
        >
          <ClipboardList className="h-5 w-5 text-primary" />
          Jobs
        </Link>
        <Link 
          to="/overdue" 
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-foreground font-medium"
        >
          <Landmark className="h-5 w-5 text-primary" />
          Overdue
        </Link>
        <Link 
          to="/customers" 
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-foreground font-medium"
        >
          <Users className="h-5 w-5 text-primary" />
          Customers
        </Link>
      </nav>
      <div className="p-4 border-t">
        <Link 
          to="/settings" 
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-foreground font-medium"
        >
          <Settings className="h-5 w-5 text-primary" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
