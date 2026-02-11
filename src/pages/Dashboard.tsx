import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, MessageCircle, Users, AlertTriangle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataCache } from '@/hooks/useDataCache';
import { useState, useMemo, useEffect, memo } from 'react';
import { useBirthdayMembers, generateBirthdayWhatsAppLink } from '@/hooks/useBirthdayMembers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getFiscalYearInfo, MONTH_NAMES, getFiscalYearMonths } from '@/lib/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/contexts/SettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  valueColor,
  subtitle,
  onClick
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  valueColor?: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor || ''}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
});

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function Dashboard() {
  const navigate = useNavigate();
  const {
    summary, members, expenses, monthlyPayments,
    extraordinaryPayments, extraordinaryIncomes
  } = useDataCache();
  const { settings } = useSettings();
  const birthdayMembers = useBirthdayMembers(members);
  const [showIncomeDetail, setShowIncomeDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [degreeFees, setDegreeFees] = useState<Array<{ amount: number; fee_date: string }>>([]);

  // Filter state: "all" or "MM-YYYY"
  const [filterValue, setFilterValue] = useState<string>('all');

  const { currentCalendarYear, nextCalendarYear } = getFiscalYearInfo();

  useEffect(() => {
    const fetchDegreeFees = async () => {
      const { data } = await supabase.from('degree_fees').select('amount, fee_date');
      if (data) setDegreeFees(data as Array<{ amount: number; fee_date: string }>);
    };
    fetchDegreeFees();
  }, []);

  // Build filter options from fiscal year months
  const filterOptions = useMemo(() => {
    const months = getFiscalYearMonths();
    return months.map(({ month, year }) => ({
      value: `${month}-${year}`,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
    }));
  }, []);

  // Parse filter
  const selectedFilter = useMemo(() => {
    if (filterValue === 'all') return null;
    const [m, y] = filterValue.split('-').map(Number);
    return { month: m, year: y };
  }, [filterValue]);

  // Helper: check if a date string falls in the selected month/year
  const dateMatchesFilter = (dateStr: string | null) => {
    if (!selectedFilter || !dateStr) return !selectedFilter;
    const d = new Date(dateStr);
    return d.getMonth() + 1 === selectedFilter.month && d.getFullYear() === selectedFilter.year;
  };

  // Filtered data
  const filteredMonthlyPayments = useMemo(() => {
    if (!selectedFilter) return monthlyPayments;
    return monthlyPayments.filter(p => p.month === selectedFilter.month && p.year === selectedFilter.year);
  }, [monthlyPayments, selectedFilter]);

  const filteredExpenses = useMemo(() => {
    if (!selectedFilter) return expenses;
    return expenses.filter(e => dateMatchesFilter(e.expense_date));
  }, [expenses, selectedFilter]);

  const filteredExtraordinaryPayments = useMemo(() => {
    if (!selectedFilter) return extraordinaryPayments;
    return extraordinaryPayments.filter(p => dateMatchesFilter(p.payment_date));
  }, [extraordinaryPayments, selectedFilter]);

  const filteredDegreeFeeTotal = useMemo(() => {
    if (!selectedFilter) return degreeFees.reduce((sum, d) => sum + Number(d.amount), 0);
    return degreeFees
      .filter(d => dateMatchesFilter(d.fee_date))
      .reduce((sum, d) => sum + Number(d.amount), 0);
  }, [degreeFees, selectedFilter]);

  // Computed totals from filtered data
  const treasuryIncome = useMemo(() => {
    return filteredMonthlyPayments
      .filter(p => p.payment_type !== 'pronto_pago_benefit')
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [filteredMonthlyPayments]);

  const extraordinaryIncome = useMemo(() => {
    return filteredExtraordinaryPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  }, [filteredExtraordinaryPayments]);

  const totalIncome = treasuryIncome + extraordinaryIncome + filteredDegreeFeeTotal;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const balance = totalIncome - totalExpenses;

  // KPI: Members with mora (always global - fiscal year context)
  const membersWithMora = useMemo(() => {
    const activeMembers = members.filter(m => m.status === 'activo');
    const monthlyFee = settings.monthly_fee_base;
    let count = 0;
    activeMembers.forEach(member => {
      for (let i = 0; i < 12; i++) {
        const year = i < 6 ? currentCalendarYear : nextCalendarYear;
        const month = i < 6 ? i + 7 : i - 5;
        const payment = monthlyPayments.find(p => p.member_id === member.id && p.month === month && p.year === year);
        if (!payment) { count++; break; }
        if (payment.payment_type !== 'pronto_pago_benefit' && Number(payment.amount) < monthlyFee) { count++; break; }
      }
    });
    return count;
  }, [members, monthlyPayments, settings.monthly_fee_base, currentCalendarYear, nextCalendarYear]);

  // KPI: Pending extraordinary fees (always global)
  const pendingExtraordinary = useMemo(() => {
    const activeMembers = members.filter(m => m.status === 'activo');
    let count = 0;
    extraordinaryIncomes.forEach(income => {
      activeMembers.forEach(member => {
        const paid = extraordinaryPayments.find(p => p.extraordinary_fee_id === income.id && p.member_id === member.id);
        if (!paid) count++;
      });
    });
    return count;
  }, [members, extraordinaryIncomes, extraordinaryPayments]);

  // Chart 1: Income vs Expenses - depends on filter
  const incomeVsExpenseData = useMemo(() => {
    if (selectedFilter) {
      // Single month comparison
      return [
        { name: 'Ingresos', value: Number(totalIncome.toFixed(2)), fill: 'hsl(var(--kpi-income))' },
        { name: 'Gastos', value: Number(totalExpenses.toFixed(2)), fill: 'hsl(var(--kpi-expense))' },
      ];
    }
    // "Todos" - monthly series across fiscal year
    const fiscalMonths = getFiscalYearMonths();
    return fiscalMonths.map(({ month, year }) => {
      const mIncome = monthlyPayments
        .filter(p => p.month === month && p.year === year && p.payment_type !== 'pronto_pago_benefit')
        .reduce((s, p) => s + Number(p.amount), 0)
        + extraordinaryPayments
          .filter(p => { if (!p.payment_date) return false; const d = new Date(p.payment_date); return d.getMonth() + 1 === month && d.getFullYear() === year; })
          .reduce((s, p) => s + Number(p.amount_paid), 0)
        + degreeFees
          .filter(d => { const dd = new Date(d.fee_date); return dd.getMonth() + 1 === month && dd.getFullYear() === year; })
          .reduce((s, d) => s + Number(d.amount), 0);
      const mExpense = expenses
        .filter(e => { const d = new Date(e.expense_date); return d.getMonth() + 1 === month && d.getFullYear() === year; })
        .reduce((s, e) => s + Number(e.amount), 0);
      return {
        name: `${MONTH_NAMES[month - 1].substring(0, 3)}`,
        ingresos: Number(mIncome.toFixed(2)),
        gastos: Number(mExpense.toFixed(2)),
      };
    });
  }, [selectedFilter, totalIncome, totalExpenses, monthlyPayments, extraordinaryPayments, degreeFees, expenses]);

  // Chart 2: Income distribution (pie) - filtered
  const incomeDistribution = useMemo(() => {
    const data = [];
    if (treasuryIncome > 0) data.push({ name: 'Tesorería', value: Number(treasuryIncome.toFixed(2)) });
    if (extraordinaryIncome > 0) data.push({ name: 'Cuotas Ext.', value: Number(extraordinaryIncome.toFixed(2)) });
    if (filteredDegreeFeeTotal > 0) data.push({ name: 'Der. Grado', value: Number(filteredDegreeFeeTotal.toFixed(2)) });
    return data;
  }, [treasuryIncome, extraordinaryIncome, filteredDegreeFeeTotal]);

  // Chart 3: Expenses by category - filtered
  const expensesByCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'Sin categoría';
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
    });
    return Object.entries(catMap).map(([name, value]) => ({
      name, value: Number(value.toFixed(2))
    })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const chartConfig = {
    ingresos: { label: 'Ingresos', color: 'hsl(var(--kpi-income))' },
    gastos: { label: 'Gastos', color: 'hsl(var(--kpi-expense))' },
  };

  const filterLabel = selectedFilter
    ? `${MONTH_NAMES[selectedFilter.month - 1]} ${selectedFilter.year}`
    : 'Todos';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-xl text-muted-foreground">
            Año Logial {currentCalendarYear}-{nextCalendarYear}
          </p>
        </div>
        <div className="w-56">
          <Select value={filterValue} onValueChange={setFilterValue}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos (vista general)</SelectItem>
              {filterOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Ingresos" value={`$${totalIncome.toFixed(2)}`} icon={TrendingUp} iconColor="text-success" subtitle="Clic para ver desglose" onClick={() => setShowIncomeDetail(true)} />
        <StatCard title="Total Gastos" value={`$${totalExpenses.toFixed(2)}`} icon={TrendingDown} iconColor="text-destructive" subtitle="Clic para ver detalle" onClick={() => setShowExpenseDetail(true)} />
        <StatCard title="Balance" value={`$${balance.toFixed(2)}`} icon={DollarSign} valueColor={balance >= 0 ? 'text-success' : 'text-destructive'} />
        <StatCard title="Miembros con mora" value={membersWithMora} icon={Users} iconColor="text-warning" valueColor={membersWithMora > 0 ? 'text-destructive' : 'text-success'} subtitle={`de ${members.filter(m => m.status === 'activo').length} activos`} />
        <StatCard title="C. Ext. Pendientes" value={pendingExtraordinary} icon={AlertTriangle} iconColor="text-warning" valueColor={pendingExtraordinary > 0 ? 'text-destructive' : 'text-success'} subtitle="pagos por cobrar" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1: Income vs Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Ingresos vs Gastos — {filterLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              {selectedFilter ? (
                <BarChart data={incomeVsExpenseData as Array<{ name: string; value: number; fill: string }>} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {(incomeVsExpenseData as Array<{ fill: string }>).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={incomeVsExpenseData as Array<{ name: string; ingresos: number; gastos: number }>} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="ingresos" fill="hsl(var(--kpi-income))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="hsl(var(--kpi-expense))" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Income Distribution Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Distribución de Ingresos — {filterLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Sin ingresos registrados
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {incomeDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart 3: Expenses by Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Gastos por Categoría — {filterLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {expensesByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Sin gastos registrados
            </div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByCategory} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={75} />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Monto']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Birthdays */}
      {birthdayMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cumpleaños Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {birthdayMembers.map(member => member.phone && (
                <Button key={member.id} size="sm" variant="outline"
                  className="h-7 text-xs gap-1 bg-success/10 border-success/30 hover:bg-success/20"
                  onClick={() => window.open(generateBirthdayWhatsAppLink(member), '_blank')}>
                  <MessageCircle className="h-3 w-3" />
                  {member.full_name.split(' ')[0]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Detail */}
      <Dialog open={showIncomeDetail} onOpenChange={setShowIncomeDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Desglose de Ingresos — {filterLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Tesorería (cuotas mensuales)</span>
              <span className="font-bold">${treasuryIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Cuotas extraordinarias</span>
              <span className="font-bold">${extraordinaryIncome.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">Derechos de grado</span>
              <span className="font-bold">${filteredDegreeFeeTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border-t pt-4">
              <span className="text-sm font-bold">Total ingresos</span>
              <span className="text-lg font-bold text-success">${totalIncome.toFixed(2)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Detail */}
      <Dialog open={showExpenseDetail} onOpenChange={setShowExpenseDetail}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Gastos — {filterLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {filteredExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay gastos registrados</p>
            ) : (
              filteredExpenses.slice(0, 20).map(expense => (
                <div key={expense.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">{expense.category} - {expense.expense_date}</p>
                  </div>
                  <span className="font-bold text-destructive">${Number(expense.amount).toFixed(2)}</span>
                </div>
              ))
            )}
            {filteredExpenses.length > 20 && (
              <Button variant="outline" className="w-full" onClick={() => { setShowExpenseDetail(false); navigate('/expenses'); }}>
                Ver todos los gastos
              </Button>
            )}
            <div className="flex justify-between items-center p-3 rounded-lg border-t pt-4">
              <span className="text-sm font-bold">Total gastos</span>
              <span className="text-lg font-bold text-destructive">${totalExpenses.toFixed(2)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Dashboard;
