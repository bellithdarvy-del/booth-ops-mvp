import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import OwnerLayout from '@/components/layout/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatRupiah, formatDate } from '@/lib/format';
import { CalendarIcon, TrendingUp, TrendingDown, Wallet, ShoppingCart, Receipt, PiggyBank, Lock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface CashbookEntry {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  category: string;
  amount: number;
}

export default function Laporan() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { data: cashbook = [], isLoading } = useQuery({
    queryKey: ['cashbook-report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cashbook')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date');
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
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return { revenue, hpp, opex, netProfit, margin };
  }, [cashbook]);

  // Daily data for charts
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map((day) => {
      const dayEntries = cashbook.filter((c) => isSameDay(new Date(c.date), day));
      
      const revenue = dayEntries
        .filter((c) => c.type === 'IN' && c.category === 'PENJUALAN')
        .reduce((sum, c) => sum + c.amount, 0);
      
      const hpp = dayEntries
        .filter((c) => c.type === 'OUT' && c.category === 'BAHAN_DAGANGAN')
        .reduce((sum, c) => sum + c.amount, 0);
      
      const opex = dayEntries
        .filter((c) => c.type === 'OUT' && c.category === 'OPEX')
        .reduce((sum, c) => sum + c.amount, 0);
      
      const profit = revenue - hpp - opex;

      return {
        date: format(day, 'd MMM', { locale: id }),
        fullDate: format(day, 'dd MMM yyyy', { locale: id }),
        revenue,
        hpp,
        opex,
        profit,
      };
    });
  }, [cashbook, startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{payload[0]?.payload?.fullDate}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 text-sm">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{formatRupiah(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <OwnerLayout title="Laporan Periode">
      <div className="space-y-4">
        {/* Closing Periode Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/owner/laporan/closing')}
        >
          <Lock className="mr-2 h-4 w-4" />
          Closing Periode
        </Button>

        {/* Date Range Picker */}
        <Card>
          <CardContent className="flex flex-wrap gap-3 py-3">
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

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">Omzet</span>
                  </div>
                  <p className="text-lg font-bold text-success">{formatRupiah(totals.revenue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-destructive" />
                    <span className="text-xs text-muted-foreground">HPP</span>
                  </div>
                  <p className="text-lg font-bold text-destructive">{formatRupiah(totals.hpp)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-4 w-4 text-warning" />
                    <span className="text-xs text-muted-foreground">OPEX</span>
                  </div>
                  <p className="text-lg font-bold text-warning">{formatRupiah(totals.opex)}</p>
                </CardContent>
              </Card>
              <Card className={cn(totals.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10')}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <PiggyBank className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">Net Profit</span>
                  </div>
                  <p className={cn('text-lg font-bold', totals.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatRupiah(totals.netProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margin: {totals.margin.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trend Omzet Harian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Omzet"
                        stroke="hsl(var(--success))"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Costs Breakdown Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  HPP vs OPEX Harian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="hpp" name="HPP" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="opex" name="OPEX" fill="hsl(var(--warning))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Profit Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Profit Harian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="profit"
                        name="Profit"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </OwnerLayout>
  );
}
