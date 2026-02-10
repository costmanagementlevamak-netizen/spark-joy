import { useState, useMemo, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateMonthlyPDF, generateAnnualPDF } from '@/lib/pdfGenerator';
import { useDataCache } from '@/hooks/useDataCache';
import { useSettings } from '@/contexts/SettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSystemYear, getSystemMonth } from '@/lib/dateUtils';
import CuentasPorCobrar from '@/components/reports/CuentasPorCobrar';
import { supabase } from '@/integrations/supabase/client-unsafe';
interface ReportData {
  totalMonthlyIncome: number;
  totalExtraordinaryIncome: number;
  totalExpenses: number;
  balance: number;
  paymentsCount: number;
  pendingCount: number;
  expensesByCategory: Record<string, number>;
  memberPayments: Array<{
    memberName: string;
    totalPaid: number;
    paymentCount: number;
  }>;
  debtors: Array<{
    memberName: string;
    pendingMonths: number;
  }>;
  extraordinaryDetails?: Array<{
    name: string;
    collected: number;
    expected: number;
  }>;
  expensesDetail?: Array<{
    description: string;
    category: string;
    amount: number;
    date: string;
  }>;
}
interface MonthlyBreakdown {
  month: string;
  monthlyIncome: number;
  extraordinaryIncome: number;
  expenses: number;
  balance: number;
}
const MONTHS = [{
  value: '1',
  label: 'Enero'
}, {
  value: '2',
  label: 'Febrero'
}, {
  value: '3',
  label: 'Marzo'
}, {
  value: '4',
  label: 'Abril'
}, {
  value: '5',
  label: 'Mayo'
}, {
  value: '6',
  label: 'Junio'
}, {
  value: '7',
  label: 'Julio'
}, {
  value: '8',
  label: 'Agosto'
}, {
  value: '9',
  label: 'Septiembre'
}, {
  value: '10',
  label: 'Octubre'
}, {
  value: '11',
  label: 'Noviembre'
}, {
  value: '12',
  label: 'Diciembre'
}];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const Reports = forwardRef<HTMLDivElement>(function Reports(_props, ref) {
  const [generatingMonthly, setGeneratingMonthly] = useState(false);
  const [generatingAnnual, setGeneratingAnnual] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getSystemMonth().toString());
  const [selectedYear, setSelectedYear] = useState(getSystemYear().toString());
  const [previewData, setPreviewData] = useState<{
    type: 'monthly' | 'annual';
    data: ReportData;
    monthlyBreakdown?: MonthlyBreakdown[];
  } | null>(null);
  const {
    toast
  } = useToast();
  const {
    settings
  } = useSettings();
  const {
    activeMembers,
    monthlyPayments,
    expenses,
    extraordinaryIncomes,
    extraordinaryPayments,
    loading,
    summary,
    treasurer,
    members
  } = useDataCache();

  // Fetch signature URLs and VM member
  const [sigData, setSigData] = useState<{
    treasurerSigUrl: string | null;
    vmSigUrl: string | null;
    vmMember: any | null;
  }>({
    treasurerSigUrl: null,
    vmSigUrl: null,
    vmMember: null
  });
  useEffect(() => {
    const load = async () => {
      const {
        data
      } = await supabase.from('settings').select('treasurer_signature_url, vm_signature_url').limit(1).maybeSingle();
      const vmMember = members.find(m => m.cargo_logial === 'venerable_maestro') || null;
      setSigData({
        treasurerSigUrl: (data as any)?.treasurer_signature_url || null,
        vmSigUrl: (data as any)?.vm_signature_url || null,
        vmMember
      });
    };
    load();
  }, [members]);
  const currentYear = getSystemYear();
  const years = Array.from({
    length: 5
  }, (_, i) => (currentYear - i).toString());
  const institutionName = settings.institution_name;
  const monthlyReportTemplate = settings.monthly_report_template;
  const annualReportTemplate = settings.annual_report_template;

  // Calculate monthly report data from cached data
  const calculateMonthlyData = useMemo(() => {
    return (month: number, year: number): ReportData => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const paidPaymentsInPeriod = monthlyPayments.filter(p => {
        if (!p.paid_at) return false;
        const paidDate = p.paid_at.split('T')[0];
        return paidDate >= startDate && paidDate <= endDate;
      });
      const totalMonthlyIncome = paidPaymentsInPeriod.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paidMemberIds = new Set(paidPaymentsInPeriod.map(p => p.member_id));
      const membersWhoPaid = paidMemberIds.size;
      const membersWhoDidNotPay = activeMembers.length - membersWhoPaid;
      const monthExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
      const totalExpenses = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const monthExtraPayments = extraordinaryPayments.filter(p => {
        if (!p.payment_date) return false;
        return p.payment_date >= startDate && p.payment_date <= endDate;
      });
      const totalExtraordinaryIncome = monthExtraPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      const expensesByCategory: Record<string, number> = {};
      monthExpenses.forEach(e => {
        const cat = e.category || 'otros';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount || 0);
      });
      const extraordinaryDetails = extraordinaryIncomes.map(income => {
        const incomePayments = monthExtraPayments.filter(p => p.extraordinary_fee_id === income.id);
        const collected = incomePayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        if (collected === 0) return null;
        return {
          name: income.name,
          expected: Number(income.amount_per_member) * activeMembers.length,
          collected
        };
      }).filter((item): item is {
        name: string;
        expected: number;
        collected: number;
      } => item !== null);
      const expensesDetail = monthExpenses.map(e => ({
        description: e.description,
        category: e.category || 'otros',
        amount: Number(e.amount || 0),
        date: e.expense_date
      }));
      const memberPaymentsList = activeMembers.map(member => {
        const memberPaidPayments = paidPaymentsInPeriod.filter(p => p.member_id === member.id);
        return {
          memberName: member.full_name,
          totalPaid: memberPaidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
          paymentCount: memberPaidPayments.length
        };
      });
      const debtors = activeMembers.filter(m => !paidMemberIds.has(m.id)).map(m => ({
        memberName: m.full_name,
        pendingMonths: 1
      }));
      return {
        totalMonthlyIncome,
        totalExtraordinaryIncome,
        totalExpenses,
        balance: totalMonthlyIncome + totalExtraordinaryIncome - totalExpenses,
        paymentsCount: membersWhoPaid,
        pendingCount: membersWhoDidNotPay,
        expensesByCategory,
        memberPayments: memberPaymentsList,
        debtors,
        extraordinaryDetails,
        expensesDetail
      };
    };
  }, [monthlyPayments, expenses, extraordinaryIncomes, extraordinaryPayments, activeMembers]);
  const calculateAnnualData = useMemo(() => {
    return (year: number): {
      reportData: ReportData;
      monthlyBreakdown: MonthlyBreakdown[];
    } => {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const paidPaymentsInYear = monthlyPayments.filter(p => {
        if (!p.paid_at) return false;
        const paidDate = p.paid_at.split('T')[0];
        return paidDate >= startDate && paidDate <= endDate;
      });
      const totalMonthlyIncome = paidPaymentsInYear.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paidMemberIds = new Set(paidPaymentsInYear.map(p => p.member_id));
      const yearExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
      const totalExpenses = yearExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const yearExtraPayments = extraordinaryPayments.filter(p => {
        if (!p.payment_date) return false;
        return p.payment_date >= startDate && p.payment_date <= endDate;
      });
      const totalExtraordinaryIncome = yearExtraPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      const expensesByCategory: Record<string, number> = {};
      yearExpenses.forEach(e => {
        const cat = e.category || 'otros';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount || 0);
      });
      const extraordinaryDetails = extraordinaryIncomes.map(income => {
        const incomePayments = yearExtraPayments.filter(p => p.extraordinary_fee_id === income.id);
        const collected = incomePayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        if (collected === 0) {
          const createdAt = new Date(income.created_at);
          if (createdAt.getFullYear() !== year) return null;
        }
        return {
          name: income.name,
          expected: Number(income.amount_per_member) * activeMembers.length,
          collected
        };
      }).filter((item): item is {
        name: string;
        expected: number;
        collected: number;
      } => item !== null);
      const memberPaymentsList = activeMembers.map(member => {
        const memberPaidPayments = paidPaymentsInYear.filter(p => p.member_id === member.id);
        return {
          memberName: member.full_name,
          totalPaid: memberPaidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
          paymentCount: memberPaidPayments.length
        };
      });
      const debtors = activeMembers.filter(m => !paidMemberIds.has(m.id)).map(m => ({
        memberName: m.full_name,
        pendingMonths: 12
      }));
      const monthlyBreakdown: MonthlyBreakdown[] = [];
      for (let month = 1; month <= 12; month++) {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const monthPaid = paidPaymentsInYear.filter(p => {
          const d = p.paid_at!.split('T')[0];
          return d >= monthStart && d <= monthEnd;
        });
        const monthlyIncome = monthPaid.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const monthExp = yearExpenses.filter(e => e.expense_date >= monthStart && e.expense_date <= monthEnd);
        const monthExpTotal = monthExp.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const monthExtra = yearExtraPayments.filter(p => p.payment_date && p.payment_date >= monthStart && p.payment_date <= monthEnd);
        const extraTotal = monthExtra.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
        monthlyBreakdown.push({
          month: MONTH_NAMES[month - 1],
          monthlyIncome,
          extraordinaryIncome: extraTotal,
          expenses: monthExpTotal,
          balance: monthlyIncome + extraTotal - monthExpTotal
        });
      }
      return {
        reportData: {
          totalMonthlyIncome,
          totalExtraordinaryIncome,
          totalExpenses,
          balance: totalMonthlyIncome + totalExtraordinaryIncome - totalExpenses,
          paymentsCount: paidMemberIds.size,
          pendingCount: debtors.length,
          expensesByCategory,
          memberPayments: memberPaymentsList,
          debtors,
          extraordinaryDetails
        },
        monthlyBreakdown
      };
    };
  }, [monthlyPayments, expenses, extraordinaryIncomes, extraordinaryPayments, activeMembers]);
  const handlePreviewMonthly = () => {
    const data = calculateMonthlyData(parseInt(selectedMonth), parseInt(selectedYear));
    setPreviewData({
      type: 'monthly',
      data
    });
  };
  const handlePreviewAnnual = () => {
    const {
      reportData,
      monthlyBreakdown
    } = calculateAnnualData(parseInt(selectedYear));
    setPreviewData({
      type: 'annual',
      data: reportData,
      monthlyBreakdown
    });
  };
  const getSignatures = () => {
    const GRADE_LABELS: Record<string, string> = {
      aprendiz: 'Apr.',
      companero: 'Comp.',
      maestro: 'M.'
    };
    return {
      treasurerName: treasurer?.full_name || 'Tesorero',
      treasurerDegree: GRADE_LABELS[treasurer?.degree || ''] || '',
      treasurerSignatureUrl: sigData.treasurerSigUrl,
      vmName: sigData.vmMember?.full_name,
      vmDegree: GRADE_LABELS[sigData.vmMember?.degree || ''] || '',
      vmSignatureUrl: sigData.vmSigUrl,
      logoUrl: settings.logo_url
    };
  };
  const generateMonthlyReport = async () => {
    setGeneratingMonthly(true);
    try {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      const reportData = calculateMonthlyData(month, year);
      const pdf = await generateMonthlyPDF(reportData, month, year, institutionName, monthlyReportTemplate, getSignatures());
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label || '';
      pdf.save(`Informe_Mensual_${monthName}_${year}.pdf`);
      toast({
        title: 'Informe Generado',
        description: `Informe de ${monthName} ${year} descargado correctamente`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el informe mensual',
        variant: 'destructive'
      });
    } finally {
      setGeneratingMonthly(false);
    }
  };
  const generateAnnualReport = async () => {
    setGeneratingAnnual(true);
    try {
      const year = parseInt(selectedYear);
      const {
        reportData,
        monthlyBreakdown
      } = calculateAnnualData(year);
      const pdf = await generateAnnualPDF(reportData, year, institutionName, annualReportTemplate, monthlyBreakdown, getSignatures());
      pdf.save(`Informe_Anual_${year}.pdf`);
      toast({
        title: 'Informe Generado',
        description: `Informe anual ${year} descargado correctamente`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo generar el informe anual',
        variant: 'destructive'
      });
    } finally {
      setGeneratingAnnual(false);
    }
  };
  if (loading && !summary) {
    return <div ref={ref} className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  const currentMonthData = calculateMonthlyData(parseInt(selectedMonth), parseInt(selectedYear));
  const currentAnnualResult = calculateAnnualData(parseInt(selectedYear));
  return <div ref={ref} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Informes</h1>
        <p className="text-muted-foreground mt-1">Generación de informes financieros oficiales y cuentas por cobrar</p>
      </div>

      {/* Cuentas por Cobrar Section */}
      <CuentasPorCobrar />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Report Card */}
        <Card>
          <CardHeader>
            
            <CardDescription>Documento oficial con datos reales del mes seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm">Datos del período:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cuotas mensuales:</span><span className="font-medium">${currentMonthData.totalMonthlyIncome.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Extraordinarios:</span><span className="font-medium">${currentMonthData.totalExtraordinaryIncome.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gastos:</span><span className="font-medium">${currentMonthData.totalExpenses.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Balance:</span><span className={`font-bold ${currentMonthData.balance >= 0 ? 'text-success' : 'text-destructive'}`}>${currentMonthData.balance.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handlePreviewMonthly}><Eye className="mr-2 h-4 w-4" /> Vista Previa</Button>
              <Button className="flex-1" onClick={generateMonthlyReport} disabled={generatingMonthly}>
                {generatingMonthly ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</> : <><Download className="mr-2 h-4 w-4" /> Descargar PDF</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Annual Report Card */}
        <Card>
          <CardHeader>
            
            <CardDescription>Consolidado anual con detalle mensual comparativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border p-3 bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm">Consolidado anual:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cuotas mensuales:</span><span className="font-medium">${currentAnnualResult.reportData.totalMonthlyIncome.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Extraordinarios:</span><span className="font-medium">${currentAnnualResult.reportData.totalExtraordinaryIncome.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gastos totales:</span><span className="font-medium">${currentAnnualResult.reportData.totalExpenses.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Balance anual:</span><span className={`font-bold ${currentAnnualResult.reportData.balance >= 0 ? 'text-success' : 'text-destructive'}`}>${currentAnnualResult.reportData.balance.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handlePreviewAnnual}><Eye className="mr-2 h-4 w-4" /> Vista Previa</Button>
              <Button className="flex-1" onClick={generateAnnualReport} disabled={generatingAnnual}>
                {generatingAnnual ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</> : <><Download className="mr-2 h-4 w-4" /> Descargar PDF</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Vista Previa - {previewData?.type === 'monthly' ? `Informe Mensual ${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}` : `Informe Anual ${selectedYear}`}
            </DialogTitle>
          </DialogHeader>
          
          {previewData && <div className="space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">{institutionName}</h2>
                <p className="text-muted-foreground">{previewData.type === 'monthly' ? 'INFORME MENSUAL DE TESORERÍA' : 'INFORME ANUAL DE TESORERÍA'}</p>
              </div>
              <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-lg">
                {previewData.type === 'monthly' ? monthlyReportTemplate : annualReportTemplate}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Ingresos</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Cuotas mensuales:</span><span className="font-medium">${previewData.data.totalMonthlyIncome.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Cuotas extraordinarias:</span><span className="font-medium">${previewData.data.totalExtraordinaryIncome.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-2 font-bold"><span>Total ingresos:</span><span>${(previewData.data.totalMonthlyIncome + previewData.data.totalExtraordinaryIncome).toFixed(2)}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Egresos y Balance</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total gastos:</span><span className="font-medium">${previewData.data.totalExpenses.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-2 font-bold"><span>Balance:</span><span className={previewData.data.balance >= 0 ? 'text-success' : 'text-destructive'}>${previewData.data.balance.toFixed(2)}</span></div>
                  </CardContent>
                </Card>
              </div>
              {previewData.monthlyBreakdown && <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Detalle Mensual</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b"><th className="text-left py-2">Mes</th><th className="text-right py-2">Cuotas</th><th className="text-right py-2">Extraordinarios</th><th className="text-right py-2">Gastos</th><th className="text-right py-2">Balance</th></tr></thead>
                        <tbody>{previewData.monthlyBreakdown.map((m, i) => <tr key={i} className="border-b"><td className="py-2">{m.month}</td><td className="text-right py-2">${m.monthlyIncome.toFixed(2)}</td><td className="text-right py-2">${m.extraordinaryIncome.toFixed(2)}</td><td className="text-right py-2">${m.expenses.toFixed(2)}</td><td className={`text-right py-2 font-medium ${m.balance >= 0 ? 'text-success' : 'text-destructive'}`}>${m.balance.toFixed(2)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewData(null)}>Cerrar</Button>
                <Button onClick={() => {
              setPreviewData(null);
              previewData.type === 'monthly' ? generateMonthlyReport() : generateAnnualReport();
            }}>
                  <Download className="mr-2 h-4 w-4" /> Descargar PDF
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
});
export default Reports;