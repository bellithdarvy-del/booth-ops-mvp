import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  Store, 
  Wallet, 
  FileText, 
  LogOut,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OwnerLayoutProps {
  children: ReactNode;
  title?: string;
}

const navItems = [
  { to: '/owner', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/booth', icon: Store, label: 'Booth' },
  { to: '/owner/transaksi', icon: Wallet, label: 'Transaksi' },
  { to: '/owner/laporan', icon: FileText, label: 'Laporan' },
  { to: '/owner/items', icon: Package, label: 'Item' },
];

export default function OwnerLayout({ children, title }: OwnerLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title || 'Dashboard'}</p>
              <p className="text-xs text-muted-foreground">{profile?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container flex-1 py-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="container flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/owner'}
              className={({ isActive }) =>
                cn('bottom-nav-item', isActive && 'bottom-nav-item-active')
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
