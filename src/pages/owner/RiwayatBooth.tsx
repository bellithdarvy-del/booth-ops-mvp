import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatRupiah, formatDate } from '@/lib/format';
import { Calendar, Package, TrendingUp, User, ClipboardList, Plus } from 'lucide-react';

interface BoothSession {
  id: string;
  date: string;
  status: 'OPEN' | 'CLOSED';
  total_sales_input: number | null;
  notes: string | null;
  created_at: string;
  opened_by: string;
  closed_by: string | null;
  opener?: { name: string };
  closer?: { name: string };
}

interface SessionItem {
  id: string;
  qty_open: number;
  qty_close: number | null;
  item: { name: string };
}

export default function RiwayatBooth() {
  const navigate = useNavigate();
  const [selectedSession, setSelectedSession] = useState<BoothSession | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['booth-sessions-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booth_sessions')
        .select(`
          *,
          opener:profiles!booth_sessions_opened_by_fkey(name),
          closer:profiles!booth_sessions_closed_by_fkey(name)
        `)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as BoothSession[];
    },
  });

  const { data: sessionItems = [] } = useQuery({
    queryKey: ['session-items', selectedSession?.id],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data, error } = await supabase
        .from('booth_session_items')
        .select(`
          *,
          item:items(name)
        `)
        .eq('session_id', selectedSession.id);
      if (error) throw error;
      return data as SessionItem[];
    },
    enabled: !!selectedSession,
  });

  const closedSessions = sessions.filter((s) => s.status === 'CLOSED');
  const openSession = sessions.find((s) => s.status === 'OPEN');

  return (
    <OwnerLayout title="Riwayat Booth">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{closedSessions.length}</div>
              <p className="text-xs text-muted-foreground">Total Sesi Closing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">
                {formatRupiah(
                  closedSessions.reduce((sum, s) => sum + (s.total_sales_input || 0), 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Total Penjualan</p>
            </CardContent>
          </Card>
        </div>

        {/* Open Session Banner or Buka Booth Button */}
        {openSession ? (
          <Card className="border-warning bg-warning/10">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="h-3 w-3 rounded-full bg-warning animate-pulse" />
              <div>
                <p className="font-medium text-sm">Booth sedang buka</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(openSession.date)} • Dibuka oleh {openSession.opener?.name}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate('/owner/booth/buka')}
          >
            <Plus className="mr-2 h-5 w-5" />
            Buka Booth Hari Ini
          </Button>
        )}

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : closedSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Belum ada riwayat booth</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {closedSessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedSession(session)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(session.date)}</span>
                        <Badge variant="secondary" className="text-xs">
                          CLOSED
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {session.closer?.name || session.opener?.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        {formatRupiah(session.total_sales_input || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Penjualan</p>
                    </div>
                  </div>
                  {session.notes && (
                    <p className="mt-2 text-sm text-muted-foreground italic">
                      "{session.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Sesi Booth</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Ringkasan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tanggal</span>
                    <span className="font-medium">{formatDate(selectedSession.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dibuka oleh</span>
                    <span>{selectedSession.opener?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ditutup oleh</span>
                    <span>{selectedSession.closer?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Total Penjualan</span>
                    <span className="font-bold text-primary">
                      {formatRupiah(selectedSession.total_sales_input || 0)}
                    </span>
                  </div>
                  {selectedSession.notes && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">Catatan:</span>
                      <p className="mt-1 italic">"{selectedSession.notes}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Detail Stok Item
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessionItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Tidak ada data item
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sessionItems.map((si) => {
                        const sold = si.qty_open - (si.qty_close ?? 0);
                        return (
                          <div
                            key={si.id}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                          >
                            <span className="font-medium">{si.item.name}</span>
                            <div className="text-sm text-right">
                              <div className="flex gap-3">
                                <span className="text-muted-foreground">
                                  Buka: {si.qty_open}
                                </span>
                                <span className="text-muted-foreground">
                                  Sisa: {si.qty_close ?? '-'}
                                </span>
                              </div>
                              <span className="text-primary font-medium">
                                Terjual: {sold}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
