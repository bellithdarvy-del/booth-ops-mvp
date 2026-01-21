import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatRupiah, formatDate } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Transaksi() {
  const navigate = useNavigate();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['cashbook-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cashbook')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const categoryLabels: Record<string, string> = {
    PENJUALAN: 'Penjualan',
    BAHAN_DAGANGAN: 'HPP',
    OPEX: 'OPEX',
    MODAL_IN: 'Modal Masuk',
    MODAL_OUT: 'Modal Keluar',
    WITHDRAW_PROFIT: 'Tarik Profit',
    PRIBADI_OWNER: 'Pribadi',
  };

  return (
    <OwnerLayout title="Transaksi">
      <div className="space-y-4">
        <Button className="w-full" onClick={() => navigate('/owner/transaksi/input')}>
          <Plus className="mr-2 h-4 w-4" /> Input Transaksi
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="space-y-2">
            {transactions?.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {tx.type === 'IN' ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{categoryLabels[tx.category] || tx.category}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <p className={cn("font-semibold", tx.type === 'IN' ? 'text-success' : 'text-destructive')}>
                    {tx.type === 'IN' ? '+' : '-'}{formatRupiah(Number(tx.amount))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
