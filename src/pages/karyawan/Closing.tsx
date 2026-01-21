import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import KaryawanLayout from '@/components/layout/KaryawanLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { getTodayISO, formatDate, formatRupiah, parseRupiahInput } from '@/lib/format';
import { toast } from 'sonner';
import { ClipboardCheck, Package, AlertCircle, CheckCircle2, ArrowLeft, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionItem {
  id: string;
  item_id: string;
  qty_open: number;
  qty_close: number | null;
  items: {
    name: string;
    price: number;
  };
}

interface TodaySession {
  id: string;
  date: string;
  status: 'OPEN' | 'CLOSED';
  total_sales_input: number | null;
  notes: string | null;
  items: SessionItem[];
}

export default function KaryawanClosing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = getTodayISO();

  const [totalSales, setTotalSales] = useState('');
  const [notes, setNotes] = useState('');
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});

  // Get today's session
  const { data: todaySession, isLoading } = useQuery({
    queryKey: ['karyawan-closing-session', today],
    queryFn: async () => {
      const { data: session } = await supabase
        .from('booth_sessions')
        .select('*')
        .eq('date', today)
        .single();

      if (!session) return null;

      const { data: items } = await supabase
        .from('booth_session_items')
        .select(`
          id,
          item_id,
          qty_open,
          qty_close,
          items (
            name,
            price
          )
        `)
        .eq('session_id', session.id);

      // Initialize stock inputs with qty_open as default
      const initialStocks: Record<string, number> = {};
      items?.forEach(item => {
        initialStocks[item.id] = item.qty_close ?? 0;
      });

      return {
        ...session,
        items: items || [],
      } as TodaySession;
    },
    refetchOnMount: true,
  });

  // Close session mutation
  const closeSession = useMutation({
    mutationFn: async () => {
      if (!todaySession) throw new Error('No session found');

      const salesAmount = parseRupiahInput(totalSales);
      if (salesAmount <= 0) throw new Error('Total penjualan harus lebih dari 0');

      // Update booth session
      const { error: sessionError } = await supabase
        .from('booth_sessions')
        .update({
          status: 'CLOSED',
          total_sales_input: salesAmount,
          closed_by: user?.id,
          notes: notes || null,
        })
        .eq('id', todaySession.id);

      if (sessionError) throw sessionError;

      // Update booth session items
      for (const item of todaySession.items) {
        const qtyClose = stockInputs[item.id] ?? 0;
        const { error: itemError } = await supabase
          .from('booth_session_items')
          .update({ qty_close: qtyClose })
          .eq('id', item.id);

        if (itemError) throw itemError;
      }

      // Create cashbook entry for sales
      const { error: cashbookError } = await supabase
        .from('cashbook')
        .insert({
          date: today,
          type: 'IN',
          category: 'PENJUALAN',
          amount: salesAmount,
          description: `Penjualan ${formatDate(new Date())}`,
          user_id: user?.id,
          session_id: todaySession.id,
        });

      if (cashbookError) throw cashbookError;
    },
    onSuccess: () => {
      toast.success('Closing berhasil!');
      queryClient.invalidateQueries({ queryKey: ['karyawan-closing-session'] });
      queryClient.invalidateQueries({ queryKey: ['karyawan-today-session'] });
      navigate('/karyawan');
    },
    onError: (error: Error) => {
      toast.error('Gagal melakukan closing', { description: error.message });
    },
  });

  const handleStockChange = (itemId: string, value: string) => {
    const num = parseInt(value) || 0;
    setStockInputs(prev => ({
      ...prev,
      [itemId]: Math.max(0, num),
    }));
  };

  // Calculate estimated revenue based on items sold
  const estimatedRevenue = useMemo(() => {
    if (!todaySession) return 0;
    return todaySession.items.reduce((total, item) => {
      const qtyClose = stockInputs[item.id] ?? 0;
      const sold = Math.max(0, item.qty_open - qtyClose);
      return total + (sold * item.items.price);
    }, 0);
  }, [todaySession, stockInputs]);

  const handleUseEstimate = () => {
    setTotalSales(estimatedRevenue.toString());
  };

  const handleSubmit = () => {
    closeSession.mutate();
  };

  if (isLoading) {
    return (
      <KaryawanLayout title="Closing">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </KaryawanLayout>
    );
  }

  if (!todaySession) {
    return (
      <KaryawanLayout title="Closing">
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">Belum Ada Sesi</p>
            <p className="text-sm text-muted-foreground mt-1">
              Owner belum membuka booth hari ini
            </p>
            <Button className="mt-4" onClick={() => navigate('/karyawan')}>
              Kembali
            </Button>
          </CardContent>
        </Card>
      </KaryawanLayout>
    );
  }

  if (todaySession.status === 'CLOSED') {
    return (
      <KaryawanLayout title="Closing">
        <Card className="border-2 border-success bg-success/5">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="font-semibold">Closing Sudah Dilakukan</p>
            <p className="text-2xl font-bold text-success mt-2">
              {formatRupiah(todaySession.total_sales_input || 0)}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => navigate('/karyawan')}>
              Kembali
            </Button>
          </CardContent>
        </Card>
      </KaryawanLayout>
    );
  }

  return (
    <KaryawanLayout title="Closing Hari Ini">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/karyawan')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Closing Hari Ini</h1>
            <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
          </div>
        </div>

        {/* Estimated Revenue */}
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Estimasi Omzet</span>
                </div>
                <p className="text-xl font-bold text-primary">
                  {formatRupiah(estimatedRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Berdasarkan item terjual × harga
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleUseEstimate}
                disabled={estimatedRevenue === 0}
              >
                Gunakan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Total Sales Input */}
        <Card className="border-2 border-primary">
          <CardContent className="p-4">
            <Label htmlFor="total-sales" className="text-base font-semibold">
              Total Penjualan Hari Ini
            </Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                Rp
              </span>
              <Input
                id="total-sales"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={totalSales}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setTotalSales(value);
                }}
                className="pl-12 text-2xl font-bold h-14"
              />
            </div>
            {totalSales && (
              <p className="text-sm text-muted-foreground mt-2">
                = {formatRupiah(parseRupiahInput(totalSales))}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stock Remaining */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Stok Sisa</h3>
            </div>
            
            <div className="space-y-4">
              {todaySession.items.map((item) => {
                const qtyClose = stockInputs[item.id] ?? 0;
                const sold = Math.max(0, item.qty_open - qtyClose);
                const itemRevenue = sold * item.items.price;
                
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.items.name}</p>
                        <p className="text-xs text-primary">{formatRupiah(item.items.price)}</p>
                        <p className="text-xs text-muted-foreground">
                          Stok buka: {item.qty_open}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={item.qty_open}
                        value={stockInputs[item.id] ?? 0}
                        onChange={(e) => handleStockChange(item.id, e.target.value)}
                        className="w-24 text-center font-semibold"
                      />
                    </div>
                    {sold > 0 && (
                      <div className="flex justify-between text-xs bg-success/10 rounded px-2 py-1">
                        <span className="text-success">Terjual: {sold} pcs</span>
                        <span className="text-success font-medium">{formatRupiah(itemRevenue)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="notes">Catatan (opsional)</Label>
            <Textarea
              id="notes"
              placeholder="Misalnya: Hujan sore, sepi pelanggan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          size="lg" 
          className="w-full py-6 text-base font-semibold"
          onClick={handleSubmit}
          disabled={closeSession.isPending || !totalSales}
        >
          {closeSession.isPending ? (
            <Spinner size="sm" className="text-primary-foreground" />
          ) : (
            <>
              <ClipboardCheck className="mr-2 h-5 w-5" />
              Simpan Closing
            </>
          )}
        </Button>
      </div>
    </KaryawanLayout>
  );
}
