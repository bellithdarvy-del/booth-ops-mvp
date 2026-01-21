import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { getTodayISO, formatRupiah, parseRupiahInput } from '@/lib/format';
import { toast } from 'sonner';
import { ArrowLeft, ShoppingCart, Receipt, Wallet } from 'lucide-react';

type CategoryType = 'BAHAN_DAGANGAN' | 'OPEX' | 'MODAL_IN' | 'MODAL_OUT';

const categories = [
  { value: 'BAHAN_DAGANGAN', label: 'Bahan Dagangan (HPP)', icon: ShoppingCart, type: 'OUT' },
  { value: 'OPEX', label: 'OPEX (Operasional)', icon: Receipt, type: 'OUT' },
  { value: 'MODAL_IN', label: 'Modal Masuk', icon: Wallet, type: 'IN' },
  { value: 'MODAL_OUT', label: 'Modal Keluar', icon: Wallet, type: 'OUT' },
];

export default function InputBelanja() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<CategoryType>('BAHAN_DAGANGAN');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayISO());

  const selectedCat = categories.find(c => c.value === category);

  const createTransaction = useMutation({
    mutationFn: async () => {
      const amountNum = parseRupiahInput(amount);
      if (amountNum <= 0) throw new Error('Nominal harus lebih dari 0');

      const { error } = await supabase.from('cashbook').insert({
        date,
        type: selectedCat?.type as 'IN' | 'OUT',
        category,
        amount: amountNum,
        description: description || null,
        user_id: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      navigate('/owner/transaksi');
    },
    onError: (error: Error) => {
      toast.error('Gagal menyimpan', { description: error.message });
    },
  });

  return (
    <OwnerLayout title="Input Transaksi">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/owner/transaksi')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Input Transaksi</h1>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Nominal</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className="pl-12 text-xl font-bold"
                />
              </div>
              {amount && <p className="text-sm text-muted-foreground">{formatRupiah(parseRupiahInput(amount))}</p>}
            </div>

            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Textarea placeholder="Contoh: Belanja ayam pasar..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full py-6 font-semibold" onClick={() => createTransaction.mutate()} disabled={createTransaction.isPending || !amount}>
          {createTransaction.isPending ? <Spinner size="sm" className="text-primary-foreground" /> : 'Simpan Transaksi'}
        </Button>
      </div>
    </OwnerLayout>
  );
}
