import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Wallet, Clock, CheckCircle, AlertCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FeeSession {
  id: string;
  date: string;
  total_sales_input: number;
  total_fee: number;
  fee_paid: boolean;
  fee_paid_at: string | null;
  closed_by: string | null;
  closer?: { name: string } | null;
}

export default function FeePenjualan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmSession, setConfirmSession] = useState<FeeSession | null>(null);
  const [payMultiple, setPayMultiple] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['fee-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booth_sessions')
        .select(`
          id,
          date,
          total_sales_input,
          total_fee,
          fee_paid,
          fee_paid_at,
          closed_by,
          closer:profiles!booth_sessions_closed_by_fkey(name)
        `)
        .eq('status', 'CLOSED')
        .gt('total_fee', 0)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as FeeSession[];
    },
  });

  const payFeeMutation = useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const { error } = await supabase
        .from('booth_sessions')
        .update({
          fee_paid: true,
          fee_paid_at: new Date().toISOString(),
          fee_paid_by: user?.id,
        })
        .in('id', sessionIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-sessions'] });
      toast.success('Fee berhasil ditandai sebagai dibayar');
      setConfirmSession(null);
      setPayMultiple(false);
    },
    onError: () => {
      toast.error('Gagal mengupdate status fee');
    },
  });

  const pendingSessions = sessions.filter((s) => !s.fee_paid);
  const paidSessions = sessions.filter((s) => s.fee_paid);
  const totalPending = pendingSessions.reduce((sum, s) => sum + s.total_fee, 0);
  const totalPaid = paidSessions.reduce((sum, s) => sum + s.total_fee, 0);

  const handlePayAll = () => {
    setPayMultiple(true);
  };

  const handleConfirmPayAll = () => {
    const ids = pendingSessions.map((s) => s.id);
    payFeeMutation.mutate(ids);
  };

  const handlePaySingle = (session: FeeSession) => {
    setConfirmSession(session);
  };

  const handleConfirmPaySingle = () => {
    if (confirmSession) {
      payFeeMutation.mutate([confirmSession.id]);
    }
  };

  return (
    <OwnerLayout title="Fee Penjualan">
      <div className="space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-warning bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">Belum Dibayar</span>
              </div>
              <p className="text-xl font-bold text-warning">
                {formatRupiah(totalPending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingSessions.length} sesi
              </p>
            </CardContent>
          </Card>
          <Card className="border-success bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Sudah Dibayar</span>
              </div>
              <p className="text-xl font-bold text-success">
                {formatRupiah(totalPaid)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {paidSessions.length} sesi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pay All Button */}
        {pendingSessions.length > 0 && (
          <Button 
            className="w-full" 
            size="lg"
            onClick={handlePayAll}
            disabled={payFeeMutation.isPending}
          >
            <Wallet className="mr-2 h-5 w-5" />
            Bayar Semua ({formatRupiah(totalPending)})
          </Button>
        )}

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Dibayar ({paidSessions.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : pendingSessions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Semua fee sudah dibayar</p>
                </CardContent>
              </Card>
            ) : (
              pendingSessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {formatDate(new Date(session.date))}
                          </p>
                          <Badge variant="outline" className="text-warning border-warning">
                            Pending
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{session.closer?.name || 'Unknown'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Omzet: {formatRupiah(session.total_sales_input)}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-lg font-bold text-warning">
                          {formatRupiah(session.total_fee)}
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handlePaySingle(session)}
                          disabled={payFeeMutation.isPending}
                        >
                          Bayar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Paid Tab */}
          <TabsContent value="paid" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : paidSessions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Belum ada fee yang dibayar</p>
                </CardContent>
              </Card>
            ) : (
              paidSessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {formatDate(new Date(session.date))}
                          </p>
                          <Badge variant="secondary" className="text-success">
                            Dibayar
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{session.closer?.name || 'Unknown'}</span>
                        </div>
                        {session.fee_paid_at && (
                          <p className="text-xs text-muted-foreground">
                            Dibayar: {formatDate(new Date(session.fee_paid_at))}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-success">
                          {formatRupiah(session.total_fee)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm Single Payment Dialog */}
      <AlertDialog open={!!confirmSession} onOpenChange={() => setConfirmSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembayaran Fee</AlertDialogTitle>
            <AlertDialogDescription>
              Tandai fee sebagai sudah dibayar untuk tanggal{' '}
              <strong>{confirmSession && formatDate(new Date(confirmSession.date))}</strong>?
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-lg font-bold text-foreground">
                  {confirmSession && formatRupiah(confirmSession.total_fee)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPaySingle}>
              Konfirmasi Dibayar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Pay All Dialog */}
      <AlertDialog open={payMultiple} onOpenChange={() => setPayMultiple(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bayar Semua Fee</AlertDialogTitle>
            <AlertDialogDescription>
              Tandai semua fee yang pending sebagai sudah dibayar?
              <div className="mt-2 p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm text-muted-foreground">
                  {pendingSessions.length} sesi
                </p>
                <p className="text-xl font-bold text-foreground">
                  {formatRupiah(totalPending)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayAll}>
              Konfirmasi Bayar Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OwnerLayout>
  );
}
