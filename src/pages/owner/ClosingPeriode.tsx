import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatRupiah, formatDate } from '@/lib/format';
import { CalendarIcon, Lock, TrendingUp, TrendingDown, Wallet, PiggyBank, History } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CashbookEntry {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  category: string;
  amount: number;
}

interface PeriodClosing {
  id: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_hpp: number;
  total_opex: number;
  net_profit: number;
  created_at: string;
  creator?: { name: string };
}

export default function ClosingPeriode() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(subMonths(new Date(), 1)));
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedClosing, setSelectedClosing] = useState<PeriodClosing | null>(null);

  // Get existing period closings
  const { data: closings = [], isLoading: loadingClosings } = useQuery({
    queryKey: ['period-closings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('period_closings')
        .select(`
          *,
          creator:profiles!period_closings_created_by_fkey(name)
        `)
        .order('end_date', { ascending: false });
      if (error) throw error;
      return data as PeriodClosing[];
    },
  });

  // Get cashbook data for selected period
  const { data: cashbook = [], isLoading: loadingCashbook } = useQuery({
    queryKey: ['cashbook-closing', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cashbook')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));
      if (error) throw error;
      return data as CashbookEntry[];
    },
  });

  // Calculate totals
  const totals = useMemo(() => {
    const revenue = cashbook
      .filter((c) => c.type === 'IN' && c.category === 'PENJUALAN')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const hpp = cashbook
      .filter((c) => c.type === 'OUT' && c.category === 'BAHAN_DAGANGAN')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const opex = cashbook
      .filter((c) => c.type === 'OUT' && c.category === 'OPEX')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const netProfit = revenue - hpp - opex;

    return { revenue, hpp, opex, netProfit };
  }, [cashbook]);

  // Check if period overlaps with existing closings
  const hasOverlap = useMemo(() => {
    const start = format(startDate, 'yyyy-MM-dd');
    const end = format(endDate, 'yyyy-MM-dd');
    
    return closings.some(c => {
      return !(end < c.start_date || start > c.end_date);
    });
  }, [startDate, endDate, closings]);

  // Create closing mutation
  const createClosing = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('period_closings')
        .insert({
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          total_revenue: totals.revenue,
          total_hpp: totals.hpp,
          total_opex: totals.opex,
          net_profit: totals.netProfit,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Periode berhasil dikunci!');
      queryClient.invalidateQueries({ queryKey: ['period-closings'] });
      setShowConfirm(false);
    },
    onError: (error: Error) => {
      toast.error('Gagal mengunci periode', { description: error.message });
    },
  });

  const handleCreateClosing = () => {
    if (hasOverlap) {
      toast.error('Periode sudah dikunci atau overlap dengan periode lain');
      return;
    }
    if (totals.revenue === 0 && totals.hpp === 0 && totals.opex === 0) {
      toast.error('Tidak ada transaksi di periode ini');
      return;
    }
    setShowConfirm(true);
  };

  return (
    <OwnerLayout title="Closing Periode">
      <div className="space-y-6">
        {/* Date Range Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pilih Periode</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'd MMM yyyy', { locale: id })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="self-center text-muted-foreground">–</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(endDate, 'd MMM yyyy', { locale: id })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Preview Summary */}
        {loadingCashbook ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <Card className={cn(hasOverlap && 'border-destructive bg-destructive/5')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ringkasan Periode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasOverlap && (
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Periode ini overlap dengan closing yang sudah ada
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Wallet className="h-3 w-3" />
                      Omzet
                    </div>
                    <p className="font-bold text-success">{formatRupiah(totals.revenue)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingDown className="h-3 w-3" />
                      HPP
                    </div>
                    <p className="font-bold text-destructive">{formatRupiah(totals.hpp)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingDown className="h-3 w-3" />
                      OPEX
                    </div>
                    <p className="font-bold text-warning">{formatRupiah(totals.opex)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <PiggyBank className="h-3 w-3" />
                      Net Profit
                    </div>
                    <p className={cn('font-bold', totals.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatRupiah(totals.netProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="w-full"
              onClick={handleCreateClosing}
              disabled={hasOverlap || createClosing.isPending}
            >
              <Lock className="mr-2 h-5 w-5" />
              Kunci Periode Ini
            </Button>
          </>
        )}

        {/* Previous Closings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Riwayat Closing Periode
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingClosings ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : closings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada periode yang dikunci
              </p>
            ) : (
              <div className="space-y-2">
                {closings.map((closing) => (
                  <div
                    key={closing.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setSelectedClosing(closing)}
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {formatDate(new Date(closing.start_date))} - {formatDate(new Date(closing.end_date))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dikunci oleh {closing.creator?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'font-bold',
                        closing.net_profit >= 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {formatRupiah(closing.net_profit)}
                      </p>
                      <p className="text-xs text-muted-foreground">Net Profit</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunci Periode?</AlertDialogTitle>
            <AlertDialogDescription>
              Periode {format(startDate, 'd MMM yyyy', { locale: id })} - {format(endDate, 'd MMM yyyy', { locale: id })} akan dikunci dengan data berikut:
              <br /><br />
              • Omzet: {formatRupiah(totals.revenue)}<br />
              • HPP: {formatRupiah(totals.hpp)}<br />
              • OPEX: {formatRupiah(totals.opex)}<br />
              • <strong>Net Profit: {formatRupiah(totals.netProfit)}</strong>
              <br /><br />
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => createClosing.mutate()}
              disabled={createClosing.isPending}
            >
              {createClosing.isPending ? 'Mengunci...' : 'Ya, Kunci Periode'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedClosing} onOpenChange={() => setSelectedClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Closing Periode</DialogTitle>
            <DialogDescription>
              {selectedClosing && (
                <>
                  {formatDate(new Date(selectedClosing.start_date))} - {formatDate(new Date(selectedClosing.end_date))}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedClosing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Omzet</p>
                    <p className="text-lg font-bold text-success">{formatRupiah(selectedClosing.total_revenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">HPP</p>
                    <p className="text-lg font-bold text-destructive">{formatRupiah(selectedClosing.total_hpp)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">OPEX</p>
                    <p className="text-lg font-bold text-warning">{formatRupiah(selectedClosing.total_opex)}</p>
                  </CardContent>
                </Card>
                <Card className={cn(selectedClosing.net_profit >= 0 ? 'bg-success/10' : 'bg-destructive/10')}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className={cn(
                      'text-lg font-bold',
                      selectedClosing.net_profit >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {formatRupiah(selectedClosing.net_profit)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Dikunci oleh: {selectedClosing.creator?.name}</p>
                <p>Pada: {formatDate(new Date(selectedClosing.created_at))}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedClosing(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
