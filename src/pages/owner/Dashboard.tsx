import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatRupiah, getTodayISO } from '@/lib/format';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ShoppingCart,
  Store,
  Plus,
  ArrowRight,
  DollarSign,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStats {
  todaySales: number;
  periodRevenue: number;
  periodHpp: number;
  periodOpex: number;
  netProfit: number;
  cashBalance: number;
  todaySession: {
    id: string;
    status: 'OPEN' | 'CLOSED';
    total_sales_input: number | null;
  } | null;
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const today = getTodayISO();
  
  // Get start of current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStart = startOfMonth.toISOString().split('T')[0];

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', today, monthStart],
    queryFn: async (): Promise<DashboardStats> => {
      // Get today's session
      const { data: todaySession } = await supabase
        .from('booth_sessions')
        .select('id, status, total_sales_input')
        .eq('date', today)
        .single();

      // Get period revenue (this month)
      const { data: revenueData } = await supabase
        .from('cashbook')
        .select('amount')
        .eq('type', 'IN')
        .eq('category', 'PENJUALAN')
        .gte('date', monthStart)
        .lte('date', today);

      const periodRevenue = revenueData?.reduce((sum, row) => sum + Number(row.amount), 0) || 0;

      // Get today's sales
      const { data: todaySalesData } = await supabase
        .from('cashbook')
        .select('amount')
        .eq('type', 'IN')
        .eq('category', 'PENJUALAN')
        .eq('date', today);

      const todaySales = todaySalesData?.reduce((sum, row) => sum + Number(row.amount), 0) || 0;

      // Get period HPP
      const { data: hppData } = await supabase
        .from('cashbook')
        .select('amount')
        .eq('type', 'OUT')
        .eq('category', 'BAHAN_DAGANGAN')
        .gte('date', monthStart)
        .lte('date', today);

      const periodHpp = hppData?.reduce((sum, row) => sum + Number(row.amount), 0) || 0;

      // Get period OPEX
      const { data: opexData } = await supabase
        .from('cashbook')
        .select('amount')
        .eq('type', 'OUT')
        .eq('category', 'OPEX')
        .gte('date', monthStart)
        .lte('date', today);

      const periodOpex = opexData?.reduce((sum, row) => sum + Number(row.amount), 0) || 0;

      // Get cash balance (all time)
      const { data: allCashIn } = await supabase
        .from('cashbook')
        .select('amount')
        .eq('type', 'IN');

      const { data: allCashOut } = await supabase
        .from('cashbook')
        .select('amount')
        .eq('type', 'OUT');

      const totalIn = allCashIn?.reduce((sum, row) => sum + Number(row.amount), 0) || 0;
      const totalOut = allCashOut?.reduce((sum, row) => sum + Number(row.amount), 0) || 0;
      const cashBalance = totalIn - totalOut;

      const netProfit = periodRevenue - periodHpp - periodOpex;

      return {
        todaySales,
        periodRevenue,
        periodHpp,
        periodOpex,
        netProfit,
        cashBalance,
        todaySession: todaySession as DashboardStats['todaySession'],
      };
    },
  });

  if (isLoading) {
    return (
      <OwnerLayout title="Dashboard">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Today's Status */}
        <Card className={cn(
          "border-2",
          stats?.todaySession?.status === 'OPEN' 
            ? "border-success bg-success/5" 
            : "border-muted"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status Hari Ini</p>
                <p className="text-lg font-semibold">
                  {stats?.todaySession 
                    ? stats.todaySession.status === 'OPEN' 
                      ? '🟢 Booth Buka' 
                      : '✅ Sudah Closing'
                    : '⚪ Belum Buka'}
                </p>
                {stats?.todaySession?.total_sales_input && (
                  <p className="text-sm text-success font-medium">
                    Penjualan: {formatRupiah(stats.todaySession.total_sales_input)}
                  </p>
                )}
              </div>
              {!stats?.todaySession && (
                <Button onClick={() => navigate('/owner/booth/buka')}>
                  <Store className="mr-2 h-4 w-4" />
                  Buka Booth
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Today Sales */}
          <Card className="kpi-card kpi-card-profit">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Omzet Hari Ini</p>
                  <p className="text-lg font-bold text-success">
                    {formatRupiah(stats?.todaySales || 0)}
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-success" />
              </div>
            </CardContent>
          </Card>

          {/* Cash Balance */}
          <Card className="kpi-card kpi-card-neutral">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Kas</p>
                  <p className={cn(
                    "text-lg font-bold",
                    (stats?.cashBalance || 0) >= 0 ? "text-foreground" : "text-destructive"
                  )}>
                    {formatRupiah(stats?.cashBalance || 0)}
                  </p>
                </div>
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Period Revenue */}
          <Card className="kpi-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Omzet Bulan Ini</p>
                  <p className="text-lg font-bold">
                    {formatRupiah(stats?.periodRevenue || 0)}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className={cn(
            "kpi-card",
            (stats?.netProfit || 0) >= 0 ? "kpi-card-profit" : "kpi-card-expense"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Laba Bersih</p>
                  <p className={cn(
                    "text-lg font-bold",
                    (stats?.netProfit || 0) >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatRupiah(stats?.netProfit || 0)}
                  </p>
                </div>
                {(stats?.netProfit || 0) >= 0 
                  ? <TrendingUp className="h-5 w-5 text-success" />
                  : <TrendingDown className="h-5 w-5 text-destructive" />
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost Breakdown */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Pengeluaran Bulan Ini</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-hpp" />
                  <span className="text-sm">HPP (Bahan Dagangan)</span>
                </div>
                <span className="text-sm font-medium text-destructive">
                  {formatRupiah(stats?.periodHpp || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-opex" />
                  <span className="text-sm">OPEX (Operasional)</span>
                </div>
                <span className="text-sm font-medium text-destructive">
                  {formatRupiah(stats?.periodOpex || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate('/owner/transaksi/input')}
          >
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="text-xs">Input Belanja</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate('/owner/laporan')}
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-xs">Lihat Laporan</span>
          </Button>
        </div>
      </div>
    </OwnerLayout>
  );
}
