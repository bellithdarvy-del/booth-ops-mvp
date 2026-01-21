import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import KaryawanLayout from '@/components/layout/KaryawanLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { formatRupiah, formatDate } from '@/lib/format';
import { History, Calendar, TrendingUp, Users, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ClosedSession {
  id: string;
  date: string;
  total_sales_input: number;
  total_fee: number;
  fee_paid: boolean;
  notes: string | null;
}

interface PeriodClosing {
  id: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  net_profit: number;
  karyawan_share_percent: number;
  karyawan_share_amount: number;
  created_at: string;
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

  // Fetch period closings (profit sharing history)
  const { data: periodClosings, isLoading: loadingPeriods } = useQuery({
    queryKey: ['karyawan-period-closings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('period_closings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as PeriodClosing[];
    },
  });

  const totalProfitShare = periodClosings?.reduce((sum, p) => sum + p.karyawan_share_amount, 0) || 0;
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
            <p className="text-sm text-muted-foreground">Lihat riwayat closing & bagi hasil</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-success" />
                <p className="text-xs text-muted-foreground">Fee Penjualan</p>
              </div>
              <p className="text-lg font-bold text-success">
                {formatRupiah(totalFeeEarned)}
              </p>
              {pendingFee > 0 && (
                <p className="text-xs text-warning mt-1">
                  Belum dibayar: {formatRupiah(pendingFee)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Bagi Hasil</p>
              </div>
              <p className="text-lg font-bold text-primary">
                {formatRupiah(totalProfitShare)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Closing Harian
            </TabsTrigger>
            <TabsTrigger value="period" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Bagi Hasil
            </TabsTrigger>
          </TabsList>

          {/* Daily Closings Tab */}
          <TabsContent value="daily" className="mt-4 space-y-3">
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
          </TabsContent>

          {/* Profit Sharing Tab */}
          <TabsContent value="period" className="mt-4 space-y-3">
            {loadingPeriods ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : periodClosings?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Belum ada closing periode</p>
                  <p className="text-xs mt-1">Bagi hasil akan muncul setelah owner melakukan closing periode</p>
                </CardContent>
              </Card>
            ) : (
              periodClosings?.map((period) => (
                <Card key={period.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">
                          {formatDate(new Date(period.start_date))} - {formatDate(new Date(period.end_date))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Omzet: {formatRupiah(period.total_revenue)}
                        </p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        {period.karyawan_share_percent}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-success" />
                        <span className="text-sm text-muted-foreground">Bagian Karyawan</span>
                      </div>
                      <p className="text-lg font-bold text-success">
                        {formatRupiah(period.karyawan_share_amount)}
                      </p>
                    </div>
                    
                    {period.net_profit > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Net Profit: {formatRupiah(period.net_profit)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </KaryawanLayout>
  );
}
