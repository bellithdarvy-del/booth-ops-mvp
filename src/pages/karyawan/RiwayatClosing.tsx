import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import KaryawanLayout from '@/components/layout/KaryawanLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { formatRupiah, formatDate } from '@/lib/format';
import { History, Calendar, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClosedSession {
  id: string;
  date: string;
  total_sales_input: number;
  total_fee: number;
  fee_paid: boolean;
  notes: string | null;
}

export default function RiwayatClosing() {
  // Fetch closed sessions (last 30 days)
  const { data: closedSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['karyawan-closed-sessions'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('booth_sessions')
        .select('id, date, total_sales_input, total_fee, fee_paid, notes')
        .eq('status', 'CLOSED')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      return data as ClosedSession[];
    },
  });

  const totalFeeEarned = closedSessions?.reduce((sum, s) => sum + s.total_fee, 0) || 0;
  const pendingFee = closedSessions?.filter(s => !s.fee_paid).reduce((sum, s) => sum + s.total_fee, 0) || 0;

  return (
    <KaryawanLayout title="Riwayat Closing">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Riwayat Closing</h1>
            <p className="text-sm text-muted-foreground">Lihat riwayat closing harian & fee penjualan</p>
          </div>
        </div>

        {/* Fee Summary Card */}
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Total Fee Penjualan</p>
            </div>
            <p className="text-xl font-bold text-success">
              {formatRupiah(totalFeeEarned)}
            </p>
            {pendingFee > 0 && (
              <p className="text-xs text-warning mt-1">
                Belum dibayar: {formatRupiah(pendingFee)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Daily Closings List */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Closing Harian (30 hari terakhir)
          </h2>
          
          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : closedSessions?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Belum ada riwayat closing</p>
              </CardContent>
            </Card>
          ) : (
            closedSessions?.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {formatDate(new Date(session.date))}
                        </p>
                        {session.total_fee > 0 && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            session.fee_paid 
                              ? "bg-success/20 text-success" 
                              : "bg-warning/20 text-warning"
                          )}>
                            {session.fee_paid ? 'Dibayar' : 'Pending'}
                          </span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {session.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Omzet: {formatRupiah(session.total_sales_input)}
                      </p>
                      {session.total_fee > 0 && (
                        <p className="text-lg font-bold text-success">
                          +{formatRupiah(session.total_fee)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </KaryawanLayout>
  );
}
