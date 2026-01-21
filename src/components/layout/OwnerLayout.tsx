import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  LayoutDashboard, 
  Store, 
  Wallet, 
  FileText, 
  LogOut,
  Package,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface OwnerLayoutProps {
  children: ReactNode;
  title?: string;
}

const navItems = [
  { to: '/owner', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { to: '/owner/booth', icon: Store, label: 'Booth', badge: null },
  { to: '/owner/transaksi', icon: Wallet, label: 'Transaksi', badge: null },
  { to: '/owner/fee', icon: Users, label: 'Fee', badge: 'pendingFee' },
  { to: '/owner/items', icon: Package, label: 'Item', badge: null },
];

export default function OwnerLayout({ children, title }: OwnerLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Fetch pending fee count
  const { data: pendingFeeCount = 0 } = useQuery({
    queryKey: ['pending-fee-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('booth_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'CLOSED')
        .eq('fee_paid', false)
        .gt('total_fee', 0);

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getBadgeValue = (badgeKey: string | null) => {
    if (badgeKey === 'pendingFee') return pendingFeeCount;
    return 0;
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
          {navItems.map((item) => {
            const badgeValue = getBadgeValue(item.badge);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/owner'}
                className={({ isActive }) =>
                  cn('bottom-nav-item relative', isActive && 'bottom-nav-item-active')
                }
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {badgeValue > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {badgeValue > 99 ? '99+' : badgeValue}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
