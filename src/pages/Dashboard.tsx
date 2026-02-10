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
import { getFiscalYearInfo, MONTH_NAMES } from '@/lib/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/contexts/SettingsContext';

const StatCard = memo(function StatCard({
  title, value, icon: Icon, iconColor, valueColor, subtitle, onClick
}: {
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>;
  iconColor?: string; valueColor?: string; subtitle?: string; onClick?: () => void;
}) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor || ''}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
});

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
];

function Dashboard() {
  const navigate = useNavigate();
  const { summary, members, expenses, monthlyPayments, extraordinaryPayments, extraordinaryIncomes } = useDataCache();
  const { settings } = useSettings();
  const birthdayMembers = useBirthdayMembers(members);
  const [showIncomeDetail, setShowIncomeDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [degreeFeeTotal, setDegreeFeeTotal] = useState(0);

  const stats = summary || {
    totalIncome: 0, totalExpenses: 0, totalExtraordinaryIncome: 0, balance: 0, memberCount: 0, pendingPayments: 0
  };

  const { currentCalendarYear, nextCalendarYear } = getFiscalYearInfo();

  useEffect(() => {
    const fetchDegreeFees = async () => {
      const { data } = await supabase.from('degree_fees').select('amount');
      if (data) setDegreeFeeTotal(data.reduce((sum, d) => sum + Number(d.amount), 0));
    };
    fetchDegreeFees();
  }, []);

  const treasuryIncome = useMemo(() => {
    return monthlyPayments
      .filter(p => p.payment_type !== 'pronto_pago_benefit')
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [monthlyPayments]);

  const extraordinaryIncome = useMemo(() => {
    return extraordinaryPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  }, [extraordinaryPayments]);

  const totalIncome = treasuryIncome + extraordinaryIncome + degreeFeeTotal;
  const totalExpenses = stats.totalExpenses;
  const balance = totalIncome - totalExpenses;

  // KPI: Members with mora (have unpaid months)
  const membersWithMora = useMemo(() => {
    const activeMembers = members.filter(m => m.status === 'activo');
    const monthlyFee = settings.monthly_fee_base;
    let count = 0;
    activeMembers.forEach(member => {
      // Check fiscal year months
      for (let i = 0; i < 12; i++) {
        const year = i < 6 ? currentCalendarYear : nextCalendarYear;
        const month = i < 6 ? i + 7 : i - 5;
        const payment = monthlyPayments.find(p =>
          p.member_id === member.id && p.month === month && p.year === year
        );
        if (!payment) { count++; break; }
        if (payment.payment_type !== 'pronto_pago_benefit' && Number(payment.amount) < monthlyFee) { count++; break; }
      }
    });
    return count;
  }, [members, monthlyPayments, settings.monthly_fee_base, currentCalendarYear, nextCalendarYear]);

  // KPI: Pending extraordinary fees
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

  // Chart 1: Monthly income vs expenses (fiscal year Jul-Jun)
  const monthlyChartData = useMemo(() => {
    const fiscalMonths = [
      { month: 7, label: 'Jul' }, { month: 8, label: 'Ago' }, { month: 9, label: 'Sep' },
      { month: 10, label: 'Oct' }, { month: 11, label: 'Nov' }, { month: 12, label: 'Dic' },
      { month: 1, label: 'Ene' }, { month: 2, label: 'Feb' }, { month: 3, label: 'Mar' },
      { month: 4, label: 'Abr' }, { month: 5, label: 'May' }, { month: 6, label: 'Jun' },
    ];

    return fiscalMonths.map((fm, idx) => {
      const year = idx < 6 ? currentCalendarYear : nextCalendarYear;

      const treasury = monthlyPayments
        .filter(p => p.month === fm.month && p.year === year && p.payment_type !== 'pronto_pago_benefit')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const extraordinary = extraordinaryPayments
        .filter(p => {
          if (!p.payment_date) return false;
          const d = new Date(p.payment_date);
          return d.getMonth() + 1 === fm.month && d.getFullYear() === year;
        })
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);

      const expenseTotal = expenses
        .filter(e => {
          const d = new Date(e.expense_date);
          return d.getMonth() + 1 === fm.month && d.getFullYear() === year;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        name: fm.label,
        tesoreria: Number(treasury.toFixed(2)),
        extraordinarias: Number(extraordinary.toFixed(2)),
        gastos: Number(expenseTotal.toFixed(2)),
        balance: Number((treasury + extraordinary - expenseTotal).toFixed(2)),
      };
    });
  }, [monthlyPayments, extraordinaryPayments, expenses, currentCalendarYear, nextCalendarYear]);

  // Chart 2: Income distribution (pie)
  const incomeDistribution = useMemo(() => {
    const data = [];
    if (treasuryIncome > 0) data.push({ name: 'Tesorería', value: Number(treasuryIncome.toFixed(2)) });
    if (extraordinaryIncome > 0) data.push({ name: 'Cuotas Ext.', value: Number(extraordinaryIncome.toFixed(2)) });
    if (degreeFeeTotal > 0) data.push({ name: 'Der. Grado', value: Number(degreeFeeTotal.toFixed(2)) });
    return data;
  }, [treasuryIncome, extraordinaryIncome, degreeFeeTotal]);

  // Chart 3: Expenses by category
  const expensesByCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'Sin categoría';
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount);
    });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const chartConfig = {
    tesoreria: { label: 'Tesorería', color: 'hsl(var(--chart-1))' },
    extraordinarias: { label: 'Cuotas Ext.', color: 'hsl(var(--chart-2))' },
    gastos: { label: 'Gastos', color: 'hsl(var(--kpi-expense))' },
    balance: { label: 'Balance', color: 'hsl(var(--chart-3))' },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="mt-2 text-xl text-muted-foreground">
          Sistema de Gestión de Logía – Año Logial {currentCalendarYear}-{nextCalendarYear}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Ingresos"
          value={`$${totalIncome.toFixed(2)}`}
          icon={TrendingUp}
          iconColor="text-[hsl(var(--kpi-income))]"
          valueColor="text-[hsl(var(--kpi-income))]"
          subtitle="Clic para ver desglose"
          onClick={() => setShowIncomeDetail(true)}
        />
        <StatCard
          title="Total Gastos"
          value={`$${totalExpenses.toFixed(2)}`}
          icon={TrendingDown}
          iconColor="text-[hsl(var(--kpi-expense))]"
          valueColor="text-[hsl(var(--kpi-expense))]"
          subtitle="Clic para ver detalle"
          onClick={() => setShowExpenseDetail(true)}
        />
        <StatCard
          title="Balance"
          value={`$${balance.toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-[hsl(var(--kpi-balance))]"
          valueColor={balance >= 0 ? 'text-[hsl(var(--kpi-balance))]' : 'text-[hsl(var(--kpi-expense))]'}
        />
        <StatCard
          title="Miembros con mora"
          value={membersWithMora}
          icon={Users}
          iconColor="text-[hsl(var(--kpi-mora))]"
          valueColor={membersWithMora > 0 ? 'text-[hsl(var(--kpi-mora))]' : 'text-[hsl(var(--kpi-income))]'}
          subtitle={`de ${members.filter(m => m.status === 'activo').length} activos`}
        />
        <StatCard
          title="C. Ext. Pendientes"
          value={pendingExtraordinary}
          icon={AlertTriangle}
          iconColor="text-[hsl(var(--kpi-pending))]"
          valueColor={pendingExtraordinary > 0 ? 'text-[hsl(var(--kpi-pending))]' : 'text-[hsl(var(--kpi-income))]'}
          subtitle="pagos por cobrar"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1: Income vs Expenses by month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ingresos vs Gastos por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="tesoreria" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="extraordinarias" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="gastos" fill="hsl(var(--kpi-expense))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Income Distribution Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Distribución de Ingresos</CardTitle>
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
                    <Pie
                      data={incomeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {incomeDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
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
          <CardTitle className="text-base font-semibold">Gastos por Categoría</CardTitle>
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
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Monto']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[0, 3, 3, 0]} />
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
              {birthdayMembers.map(member => (
                member.phone && (
                  <Button key={member.id} size="sm" variant="outline"
                    className="h-7 text-xs gap-1 bg-success/10 border-success/30 hover:bg-success/20"
                    onClick={() => window.open(generateBirthdayWhatsAppLink(member), '_blank')}>
                    <MessageCircle className="h-3 w-3" />
                    {member.full_name.split(' ')[0]}
                  </Button>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Detail */}
      <Dialog open={showIncomeDetail} onOpenChange={setShowIncomeDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Desglose de Ingresos</DialogTitle>
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
              <span className="font-bold">${degreeFeeTotal.toFixed(2)}</span>
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
            <DialogTitle>Detalle de Gastos</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay gastos registrados</p>
            ) : (
              expenses.slice(0, 20).map(expense => (
                <div key={expense.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">{expense.category} - {expense.expense_date}</p>
                  </div>
                  <span className="font-bold text-destructive">${Number(expense.amount).toFixed(2)}</span>
                </div>
              ))
            )}
            {expenses.length > 20 && (
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
