import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Download, FileWarning } from 'lucide-react';
import { useDataCache, type Member } from '@/hooks/useDataCache';
import { useSettings } from '@/contexts/SettingsContext';
import { getFiscalYearInfo, MONTH_NAMES } from '@/lib/dateUtils';
import { generateCollectionLetterPDF } from '@/lib/pdfGenerator';
import { getFormattedSystemDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client-unsafe';
interface MemberDebt {
  member: Member;
  treasuryPending: Array<{
    month: number;
    year: number;
    monthName: string;
    amount: number;
    paid: number;
  }>;
  treasuryTotal: number;
  extraordinaryPending: Array<{
    feeName: string;
    amount: number;
    paid: number;
    pending: number;
  }>;
  extraordinaryTotal: number;
  degreeFeesPending: number;
  grandTotal: number;
}
const GRADE_LABELS: Record<string, string> = {
  aprendiz: 'Apr.',
  companero: 'Comp.',
  maestro: 'M.'
};
export default function CuentasPorCobrar() {
  const [selectedMember, setSelectedMember] = useState<MemberDebt | null>(null);
  const {
    activeMembers,
    monthlyPayments,
    extraordinaryIncomes,
    extraordinaryPayments,
    members
  } = useDataCache();
  const {
    settings
  } = useSettings();
  const {
    currentCalendarYear,
    nextCalendarYear
  } = getFiscalYearInfo();
  const treasurer = useDataCache().treasurer;

  // Fetch signature data
  const [sigData, setSigData] = useState<{
    treasurerSigUrl: string | null;
    vmSigUrl: string | null;
  }>({
    treasurerSigUrl: null,
    vmSigUrl: null
  });
  const vmMember = members.find(m => m.cargo_logial === 'venerable_maestro') || null;
  useEffect(() => {
    const load = async () => {
      const {
        data
      } = await supabase.from('settings').select('treasurer_signature_url, vm_signature_url').limit(1).maybeSingle();
      setSigData({
        treasurerSigUrl: (data as any)?.treasurer_signature_url || null,
        vmSigUrl: (data as any)?.vm_signature_url || null
      });
    };
    load();
  }, []);
  const memberDebts = useMemo(() => {
    const debts: MemberDebt[] = [];
    activeMembers.forEach(member => {
      const memberFee = member.treasury_amount || settings.monthly_fee_base;
      const treasuryPending: MemberDebt['treasuryPending'] = [];
      let treasuryTotal = 0;
      for (let i = 0; i < 12; i++) {
        const year = i < 6 ? currentCalendarYear : nextCalendarYear;
        const month = i < 6 ? i + 7 : i - 5;
        const payment = monthlyPayments.find(p => p.member_id === member.id && p.month === month && p.year === year);
        if (!payment) {
          treasuryPending.push({
            month,
            year,
            monthName: MONTH_NAMES[month - 1],
            amount: memberFee,
            paid: 0
          });
          treasuryTotal += memberFee;
        } else if (payment.payment_type !== 'pronto_pago_benefit' && payment.amount < memberFee) {
          const pending = memberFee - payment.amount;
          treasuryPending.push({
            month,
            year,
            monthName: MONTH_NAMES[month - 1],
            amount: memberFee,
            paid: payment.amount
          });
          treasuryTotal += pending;
        }
      }
      const extraordinaryPending: MemberDebt['extraordinaryPending'] = [];
      let extraordinaryTotal = 0;
      extraordinaryIncomes.forEach(income => {
        const payment = extraordinaryPayments.find(p => p.extraordinary_fee_id === income.id && p.member_id === member.id);
        const paid = payment ? Number(payment.amount_paid) : 0;
        const pending = Number(income.amount_per_member) - paid;
        if (pending > 0) {
          extraordinaryPending.push({
            feeName: income.name,
            amount: Number(income.amount_per_member),
            paid,
            pending
          });
          extraordinaryTotal += pending;
        }
      });
      const grandTotal = treasuryTotal + extraordinaryTotal;
      if (grandTotal > 0) {
        debts.push({
          member,
          treasuryPending,
          treasuryTotal,
          extraordinaryPending,
          extraordinaryTotal,
          degreeFeesPending: 0,
          grandTotal
        });
      }
    });
    return debts.sort((a, b) => b.grandTotal - a.grandTotal);
  }, [activeMembers, monthlyPayments, extraordinaryIncomes, extraordinaryPayments, settings.monthly_fee_base, currentCalendarYear, nextCalendarYear]);
  const handleDownloadPDF = async (debt: MemberDebt) => {
    try {
      const pdf = await generateCollectionLetterPDF({
        memberName: debt.member.full_name,
        memberDegree: GRADE_LABELS[debt.member.degree || ''] || '',
        institutionName: settings.institution_name,
        monthsOverdue: debt.treasuryPending.length,
        totalOwed: debt.grandTotal,
        pendingMonths: debt.treasuryPending.map(p => ({
          month: p.month,
          year: p.year,
          amount: p.amount - p.paid,
          monthName: p.monthName
        })),
        extraordinaryPending: debt.extraordinaryPending.map(p => ({
          feeName: p.feeName,
          pending: p.pending
        })),
        treasurerName: treasurer?.full_name || 'Tesorero',
        treasurerDegree: GRADE_LABELS[treasurer?.degree || ''] || '',
        currentDate: getFormattedSystemDate(),
        treasurerSignatureUrl: sigData.treasurerSigUrl,
        vmName: vmMember?.full_name,
        vmDegree: GRADE_LABELS[vmMember?.degree || ''] || '',
        vmSignatureUrl: sigData.vmSigUrl,
        logoUrl: settings.logo_url
      });
      pdf.save(`Comunicado_Mora_${debt.member.full_name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Totals
  const totalTreasury = memberDebts.reduce((s, d) => s + d.treasuryTotal, 0);
  const totalExtra = memberDebts.reduce((s, d) => s + d.extraordinaryTotal, 0);
  const totalGrand = memberDebts.reduce((s, d) => s + d.grandTotal, 0);
  if (memberDebts.length === 0) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileWarning className="h-5 w-5" /> Cuentas por Cobrar</CardTitle>
          <CardDescription>No hay cuentas pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Todos los miembros estan al dia con sus pagos.
          </p>
        </CardContent>
      </Card>;
  }
  return <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileWarning className="h-5 w-5" /> Cuentas por Cobrar / Comunicado por Mora</CardTitle>
          <CardDescription>
            Desglose de deudas por miembro — Periodo Logial: Julio {currentCalendarYear} - Junio {nextCalendarYear}. Total adeudado: ${totalGrand.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miembro</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead className="text-center">Meses pendientes</TableHead>
                  <TableHead className="text-right">Tesorería</TableHead>
                  <TableHead className="text-center">Cuotas Extra.</TableHead>
                  <TableHead className="text-right">Extraordinarias</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberDebts.map(debt => <TableRow key={debt.member.id}>
                    <TableCell className="font-medium">{debt.member.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{GRADE_LABELS[debt.member.degree || ''] || '-'}</TableCell>
                    <TableCell className="text-center">
                      {debt.treasuryPending.length > 0 ? <span className="text-destructive font-medium">{debt.treasuryPending.length}</span> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-medium">${debt.treasuryTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {debt.extraordinaryPending.length > 0 ? <span className="text-destructive font-medium">{debt.extraordinaryPending.length}</span> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-medium">${debt.extraordinaryTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">${debt.grandTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedMember(debt)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(debt)} title="Descargar Comunicado por Mora">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className="text-right">Totales:</TableCell>
                  <TableCell className="text-right text-destructive">${totalTreasury.toFixed(2)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right text-destructive">${totalExtra.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-destructive">${totalGrand.toFixed(2)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cuentas por Cobrar - {selectedMember?.member.full_name}</DialogTitle>
          </DialogHeader>

          {selectedMember && <div className="space-y-4">
              {/* Member info */}
              <div className="grid grid-cols-2 gap-2 text-sm p-3 rounded-lg bg-muted/50">
                <div><span className="text-muted-foreground">Grado:</span> <span className="font-medium">{GRADE_LABELS[selectedMember.member.degree || ''] || 'N/A'}</span></div>
                <div><span className="text-muted-foreground">Cédula:</span> <span className="font-medium">{selectedMember.member.cedula || 'N/A'}</span></div>
                <div><span className="text-muted-foreground">Teléfono:</span> <span className="font-medium">{selectedMember.member.phone || 'N/A'}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedMember.member.email || 'N/A'}</span></div>
              </div>

              {selectedMember.treasuryPending.length > 0 && <div>
                  <h4 className="font-semibold text-sm mb-2">Tesorería - Meses pendientes ({selectedMember.treasuryPending.length})</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mes</TableHead>
                          <TableHead>Año</TableHead>
                          <TableHead className="text-right">Cuota</TableHead>
                          <TableHead className="text-right">Abonado</TableHead>
                          <TableHead className="text-right">Pendiente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMember.treasuryPending.map((p, i) => <TableRow key={i}>
                            <TableCell>{p.monthName}</TableCell>
                            <TableCell>{p.year}</TableCell>
                            <TableCell className="text-right">${p.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{p.paid > 0 ? `$${p.paid.toFixed(2)}` : '-'}</TableCell>
                            <TableCell className="text-right font-medium text-destructive">${(p.amount - p.paid).toFixed(2)}</TableCell>
                          </TableRow>)}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={4} className="text-right">Subtotal Tesorería:</TableCell>
                          <TableCell className="text-right text-destructive">${selectedMember.treasuryTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>}

              {selectedMember.extraordinaryPending.length > 0 && <div>
                  <h4 className="font-semibold text-sm mb-2">Cuotas Extraordinarias pendientes ({selectedMember.extraordinaryPending.length})</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuota</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="text-right">Abonado</TableHead>
                          <TableHead className="text-right">Pendiente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMember.extraordinaryPending.map((p, i) => <TableRow key={i}>
                            <TableCell>{p.feeName}</TableCell>
                            <TableCell className="text-right">${p.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{p.paid > 0 ? `$${p.paid.toFixed(2)}` : '-'}</TableCell>
                            <TableCell className="text-right font-medium text-destructive">${p.pending.toFixed(2)}</TableCell>
                          </TableRow>)}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={3} className="text-right">Subtotal Extraordinarias:</TableCell>
                          <TableCell className="text-right text-destructive">${selectedMember.extraordinaryTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>}

              <div className="flex justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <span className="font-bold">Total  Adeudado   </span>
                <span className="font-bold text-destructive text-lg">${selectedMember.grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedMember(null)}>Cerrar</Button>
                <Button onClick={() => selectedMember && handleDownloadPDF(selectedMember)}>
                  <Download className="mr-2 h-4 w-4" /> Descargar Comunicado por Mora
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </>;
}