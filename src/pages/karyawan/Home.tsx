import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import KaryawanLayout from '@/components/layout/KaryawanLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatRupiah, formatDate, getTodayISO } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Package, AlertCircle, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodaySession {
  id: string;
  date: string;
  status: 'OPEN' | 'CLOSED';
  total_sales_input: number | null;
  notes: string | null;
}

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

export default function KaryawanHome() {
  const navigate = useNavigate();
  const today = getTodayISO();

  const { data: todaySession, isLoading } = useQuery({
    queryKey: ['karyawan-today-session', today],
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

      return {
        ...session,
        items: items || [],
      } as TodaySession & { items: SessionItem[] };
    },
  });

  if (isLoading) {
    return (
      <KaryawanLayout title="Home">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </KaryawanLayout>
    );
  }

  return (
    <KaryawanLayout title="Home">
      <div className="space-y-6 animate-fade-in">
        {/* Today's Date & Quick Action */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Hari Ini</p>
            <p className="text-2xl font-bold">{formatDate(new Date())}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/karyawan/riwayat')}
          >
            <History className="mr-2 h-4 w-4" />
            Riwayat
          </Button>
        </div>

        {/* Session Status Card */}
        {!todaySession ? (
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">Belum Ada Sesi</p>
              <p className="text-sm text-muted-foreground mt-1">
                Owner belum membuka booth hari ini
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Status Card */}
            <Card className={cn(
              "border-2",
              todaySession.status === 'OPEN' 
                ? "border-success bg-success/5" 
                : "border-muted bg-muted/20"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status Booth</p>
                    <p className="text-xl font-bold">
                      {todaySession.status === 'OPEN' 
                        ? '🟢 Booth Buka' 
                        : '✅ Sudah Closing'}
                    </p>
                  </div>
                  {todaySession.status === 'OPEN' && (
                    <Button 
                      size="lg"
                      onClick={() => navigate('/karyawan/closing')}
                    >
                      <ClipboardCheck className="mr-2 h-5 w-5" />
                      Closing
                    </Button>
                  )}
                </div>
                {todaySession.status === 'CLOSED' && todaySession.total_sales_input && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">Total Penjualan</p>
                    <p className="text-2xl font-bold text-success">
                      {formatRupiah(todaySession.total_sales_input)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Stok Hari Ini</h3>
                </div>
                
                <div className="space-y-2">
                  {todaySession.items.map((item) => {
                    const sold = item.qty_close !== null 
                      ? item.qty_open - item.qty_close 
                      : null;
                    
                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="min-w-0">
                          <span className="text-sm block">{item.items.name}</span>
                          <span className="text-xs text-primary">{formatRupiah(item.items.price)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm shrink-0">
                          <span className="text-muted-foreground">
                            Buka: <span className="font-medium text-foreground">{item.qty_open}</span>
                          </span>
                          {item.qty_close !== null && (
                            <>
                              <span className="text-muted-foreground">
                                Sisa: <span className="font-medium text-foreground">{item.qty_close}</span>
                              </span>
                              <span className="text-success font-medium">
                                Terjual: {sold}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Action Button for OPEN session */}
        {todaySession?.status === 'OPEN' && (
          <Button 
            size="lg" 
            className="w-full py-6 text-base font-semibold"
            onClick={() => navigate('/karyawan/closing')}
          >
            <ClipboardCheck className="mr-2 h-5 w-5" />
            Lakukan Closing Hari Ini
          </Button>
        )}
      </div>
    </KaryawanLayout>
  );
}
