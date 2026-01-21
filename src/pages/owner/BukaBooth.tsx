import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { getTodayISO, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Store, Package, Minus, Plus, ArrowLeft } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface Item {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

interface StockInput {
  item_id: string;
  qty_open: number;
}

export default function BukaBooth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = getTodayISO();

  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});

  // Check if session already exists today
  const { data: existingSession, isLoading: checkingSession } = useQuery({
    queryKey: ['today-session-check', today],
    queryFn: async () => {
      const { data } = await supabase
        .from('booth_sessions')
        .select('id, status')
        .eq('date', today)
        .single();
      return data;
    },
  });

  // Get active items
  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ['active-items'],
    queryFn: async () => {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return data as Item[];
    },
  });

  // Create booth session mutation
  const createSession = useMutation({
    mutationFn: async (stocks: StockInput[]) => {
      // Create booth session
      const { data: session, error: sessionError } = await supabase
        .from('booth_sessions')
        .insert({
          date: today,
          opened_by: user?.id,
          status: 'OPEN',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create booth session items
      const sessionItems = stocks.map(s => ({
        session_id: session.id,
        item_id: s.item_id,
        qty_open: s.qty_open,
      }));

      const { error: itemsError } = await supabase
        .from('booth_session_items')
        .insert(sessionItems);

      if (itemsError) throw itemsError;

      return session;
    },
    onSuccess: () => {
      toast.success('Booth berhasil dibuka!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['today-session-check'] });
      navigate('/owner');
    },
    onError: (error: Error) => {
      toast.error('Gagal membuka booth', { description: error.message });
    },
  });

  const handleQuantityChange = (itemId: string, delta: number) => {
    setStockInputs(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta),
    }));
  };

  const handleInputChange = (itemId: string, value: string) => {
    const num = parseInt(value) || 0;
    setStockInputs(prev => ({
      ...prev,
      [itemId]: Math.max(0, num),
    }));
  };

  const handleSubmit = () => {
    const stocks: StockInput[] = Object.entries(stockInputs)
      .filter(([_, qty]) => qty > 0)
      .map(([item_id, qty_open]) => ({ item_id, qty_open }));

    if (stocks.length === 0) {
      toast.error('Mohon isi minimal 1 item');
      return;
    }

    createSession.mutate(stocks);
  };

  if (checkingSession || loadingItems) {
    return (
      <OwnerLayout title="Buka Booth">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </OwnerLayout>
    );
  }

  if (existingSession) {
    return (
      <OwnerLayout title="Buka Booth">
        <Card className="border-2 border-warning">
          <CardContent className="p-6 text-center">
            <Store className="h-12 w-12 text-warning mx-auto mb-3" />
            <p className="font-semibold">Booth Sudah Dibuka</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sesi booth untuk hari ini sudah ada
            </p>
            <Button className="mt-4" onClick={() => navigate('/owner')}>
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout title="Buka Booth">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/owner')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Buka Booth</h1>
            <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
          </div>
        </div>

        {/* Instructions */}
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-4">
            <p className="text-sm">
              Masukkan jumlah stok awal untuk setiap item yang akan dijual hari ini.
            </p>
          </CardContent>
        </Card>

        {/* Stock Input Form */}
        <div className="space-y-3">
          {items?.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium block truncate">{item.name}</span>
                      <span className="text-sm text-primary">{formatRupiah(item.price)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => handleQuantityChange(item.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={stockInputs[item.id] || 0}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className="w-20 text-center font-semibold"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => handleQuantityChange(item.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        <Button 
          size="lg" 
          className="w-full py-6 text-base font-semibold"
          onClick={handleSubmit}
          disabled={createSession.isPending}
        >
          {createSession.isPending ? (
            <Spinner size="sm" className="text-primary-foreground" />
          ) : (
            <>
              <Store className="mr-2 h-5 w-5" />
              Mulai Sesi Booth
            </>
          )}
        </Button>
      </div>
    </OwnerLayout>
  );
}
