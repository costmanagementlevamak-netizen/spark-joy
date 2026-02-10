import { useEffect, useState, useMemo, useCallback, useRef, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Pencil, Trash2, ArrowLeft, Download, MessageCircle, FileText } from 'lucide-react';
import { ReceiptUpload } from '@/components/ui/receipt-upload';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { upsertCachedExtraordinaryIncome, removeCachedExtraordinaryIncome, upsertCachedExtraordinaryPayment, removeCachedExtraordinaryPayment } from '@/hooks/useDataCache';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getSystemDateString } from '@/lib/dateUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { generatePaymentReceipt, getNextReceiptNumber, downloadReceipt, getReceiptWhatsAppMessage } from '@/lib/receiptGenerator';
import { openWhatsApp } from '@/lib/whatsappUtils';
interface ExtraordinaryIncome {
  id: string;
  name: string;
  description: string | null;
  amount_per_member: number;
  due_date: string | null;
  is_mandatory: boolean | null;
  category: string | null;
  created_at: string;
}
interface ExtraordinaryPayment {
  id: string;
  extraordinary_fee_id: string;
  member_id: string;
  amount_paid: number;
  payment_date: string | null;
  receipt_url: string | null;
  created_at: string;
}
type Member = {
  id: string;
  full_name: string;
  degree: string;
  phone?: string | null;
};

// No cache - always fetch fresh data to avoid stale state issues

const ExtraordinaryFees = forwardRef<HTMLDivElement>(function ExtraordinaryFees(_props, ref) {
  const [incomes, setIncomes] = useState<ExtraordinaryIncome[]>([]);
  const [payments, setPayments] = useState<ExtraordinaryPayment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingIncome, setEditingIncome] = useState<ExtraordinaryIncome | null>(null);
  const [detailView, setDetailView] = useState<ExtraordinaryIncome | null>(null);
  const [newPaymentDialog, setNewPaymentDialog] = useState(false);
  const [editPaymentDialog, setEditPaymentDialog] = useState<ExtraordinaryPayment | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [editReceiptFile, setEditReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const {
    toast
  } = useToast();
  const {
    settings
  } = useSettings();
  const loadedRef = useRef(false);
  const [lastReceiptData, setLastReceiptData] = useState<{
    memberName: string;
    memberPhone?: string | null;
    memberDegree?: string;
    concept: string;
    totalAmount: number;
    amountPaid: number;
    paymentDate: string;
    remaining?: number;
  } | null>(null);
  const [pendingReceiptData, setPendingReceiptData] = useState<{
    memberName: string;
    memberPhone?: string | null;
    memberDegree?: string;
    concept: string;
    totalAmount: number;
    amountPaid: number;
    paymentDate: string;
    remaining?: number;
  } | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    amount_per_member: string;
    due_date: string;
    is_mandatory: boolean;
    category: string | null;
  }>({
    name: '',
    description: '',
    amount_per_member: '',
    due_date: getSystemDateString(),
    // Uses centralized date (04/02/2026)
    is_mandatory: true,
    category: 'otro'
  });
  useEffect(() => {
    if (!loadedRef.current) {
      loadData();
      loadedRef.current = true;
    }
  }, []);
  const loadData = useCallback(async () => {
    setLoading(true);
    const [incomesResult, paymentsResult, membersResult] = await Promise.all([supabase.from('extraordinary_fees').select('*').order('created_at', {
      ascending: false
    }), supabase.from('extraordinary_payments').select('*').order('created_at', {
      ascending: false
    }), supabase.from('members').select('id, full_name, degree, phone').in('status', ['activo', 'active']).order('full_name')]);
    if (incomesResult.data) {
      setIncomes(incomesResult.data as ExtraordinaryIncome[]);
    }
    if (paymentsResult.data) {
      setPayments(paymentsResult.data as ExtraordinaryPayment[]);
    }
    if (membersResult.data) {
      setMembers(membersResult.data as Member[]);
    }
    setLoading(false);
  }, []);
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      amount_per_member: '',
      due_date: getSystemDateString(),
      // Uses centralized date (04/02/2026)
      is_mandatory: true,
      category: 'otros'
    });
    setEditingIncome(null);
  }, []);
  const openNewDialog = useCallback(() => {
    resetForm();
    setShowDialog(true);
  }, [resetForm]);
  const openEditDialog = useCallback((income: ExtraordinaryIncome) => {
    setEditingIncome(income);
    setFormData({
      name: income.name,
      description: income.description || '',
      amount_per_member: income.amount_per_member.toString(),
      due_date: income.due_date || getSystemDateString(),
      // Uses centralized date (04/02/2026)
      is_mandatory: income.is_mandatory ?? true,
      category: income.category
    });
    setShowDialog(true);
  }, []);
  const handleSubmit = async () => {
    if (!formData.name || !formData.amount_per_member) {
      toast({
        title: 'Error',
        description: 'Complete el nombre y el monto',
        variant: 'destructive'
      });
      return;
    }
    const amount = parseFloat(formData.amount_per_member);
    if (amount <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser mayor que 0',
        variant: 'destructive'
      });
      return;
    }
    const incomeData = {
      name: formData.name,
      description: formData.description || null,
      amount_per_member: amount,
      due_date: formData.due_date || null,
      is_mandatory: formData.is_mandatory,
      category: formData.category
    };
    try {
      if (editingIncome) {
        const {
          data: updatedIncome,
          error
        } = await supabase.from('extraordinary_fees').update(incomeData).eq('id', editingIncome.id).select('*').single();
        if (error) throw error;
        if (updatedIncome) {
          upsertCachedExtraordinaryIncome(updatedIncome as any);
        }
        toast({
          title: 'Éxito',
          description: 'Cuota actualizada'
        });
      } else {
        const {
          data: newIncome,
          error
        } = await supabase.from('extraordinary_fees').insert([incomeData]).select('*').single();
        if (error) throw error;
        if (newIncome) {
          upsertCachedExtraordinaryIncome(newIncome as any);
        }
        toast({
          title: 'Éxito',
          description: 'Cuota creada'
        });
      }
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar',
        variant: 'destructive'
      });
    }
  };
  const handleDelete = async (id: string) => {
    // First delete related payments
    await supabase.from('extraordinary_payments').delete().eq('extraordinary_fee_id', id);
    const {
      error
    } = await supabase.from('extraordinary_fees').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar',
        variant: 'destructive'
      });
    } else {
      removeCachedExtraordinaryIncome(id); // Instant cache update
      toast({
        title: 'Éxito',
        description: 'Cuota eliminada'
      });
      loadData();
    }
  };

  // Use centralized date utility instead of local function
  const getEcuadorDate = useCallback(() => {
    return getSystemDateString(); // Uses centralized date (04/02/2026)
  }, []);
  const openDetailView = useCallback((income: ExtraordinaryIncome) => {
    setDetailView(income);
  }, []);
  const openNewPaymentDialog = useCallback(() => {
    setSelectedMemberId('');
    setPaymentAmount(detailView?.amount_per_member?.toString() || '');
    setPaymentDate(getEcuadorDate());
    setNewPaymentDialog(true);
  }, [detailView, getEcuadorDate]);
  const openEditPaymentDialog = useCallback((payment: ExtraordinaryPayment) => {
    setEditPaymentDialog(payment);
    setPaymentAmount(payment.amount_paid.toString());
    setPaymentDate(payment.payment_date || getEcuadorDate());
    setEditReceiptFile(null);
  }, [getEcuadorDate]);

  // CRITICAL: Get payments ONLY for a specific income using extraordinary_fee_id
  const getPaymentsForIncome = useCallback((incomeId: string): ExtraordinaryPayment[] => {
    return payments.filter(p => p.extraordinary_fee_id === incomeId);
  }, [payments]);

  // Calculate collected amount ONLY for a specific income
  const getCollectedAmount = useCallback((incomeId: string): number => {
    const incomePayments = getPaymentsForIncome(incomeId);
    return incomePayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  }, [getPaymentsForIncome]);

  // Get count of members who paid for a specific income
  const getPaidMembersCount = useCallback((incomeId: string): number => {
    const incomePayments = getPaymentsForIncome(incomeId);
    const uniqueMembers = new Set(incomePayments.map(p => p.member_id));
    return uniqueMembers.size;
  }, [getPaymentsForIncome]);

  // Calculate status for an income
  const getIncomeStatus = useCallback((income: ExtraordinaryIncome): 'completed' | 'overdue' | 'pending' => {
    const collectedAmount = getCollectedAmount(income.id);
    const expectedTotal = Number(income.amount_per_member) * members.length;
    const isOverdue = income.due_date ? new Date(income.due_date) < new Date() : false;
    if (members.length > 0 && collectedAmount >= expectedTotal) {
      return 'completed';
    } else if (isOverdue && collectedAmount < expectedTotal) {
      return 'overdue';
    }
    return 'pending';
  }, [getCollectedAmount, members.length]);
  const getStatusText = useCallback((status: 'completed' | 'overdue' | 'pending') => {
    if (status === 'completed') return 'Completada';
    if (status === 'overdue') return 'Vencida';
    return 'Pendiente';
  }, []);
  const getStatusColor = useCallback((status: 'completed' | 'overdue' | 'pending') => {
    if (status === 'completed') return 'text-green-600 bg-green-100';
    if (status === 'overdue') return 'text-red-600 bg-red-100';
    return 'text-yellow-600 bg-yellow-100';
  }, []);

  // Save new payment with income_id and mandatory receipt
  const handleSaveNewPayment = async () => {
    if (!detailView || !selectedMemberId) {
      toast({
        title: 'Error',
        description: 'Seleccione un miembro',
        variant: 'destructive'
      });
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser mayor que 0',
        variant: 'destructive'
      });
      return;
    }
    if (!paymentDate) {
      toast({
        title: 'Error',
        description: 'Seleccione una fecha de pago',
        variant: 'destructive'
      });
      return;
    }

    // Receipt is optional

    // Check if member already paid for this income
    const existingPayment = payments.find(p => p.extraordinary_fee_id === detailView.id && p.member_id === selectedMemberId);
    if (existingPayment) {
      toast({
        title: 'Error',
        description: 'Este miembro ya tiene un pago registrado para esta cuota',
        variant: 'destructive'
      });
      return;
    }
    setUploadingReceipt(true);
    try {
      let receiptUrl: string | null = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `extraordinary/${detailView.id}/${selectedMemberId}_${Date.now()}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from('receipts').upload(fileName, receiptFile);
        if (uploadError) throw uploadError;
        const {
          data: urlData
        } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receiptUrl = urlData.publicUrl;
      }
      const paymentData = {
        extraordinary_fee_id: detailView.id,
        member_id: selectedMemberId,
        amount_paid: amount,
        payment_date: paymentDate,
        receipt_url: receiptUrl
      };
      const {
        data: newPayment,
        error
      } = await supabase.from('extraordinary_payments').insert([paymentData]).select('*').single();
      if (error) throw error;
      if (newPayment) {
        upsertCachedExtraordinaryPayment(newPayment as any);
      }
      const member = members.find(m => m.id === selectedMemberId);
      const remaining = amount < Number(detailView.amount_per_member) ? Number(detailView.amount_per_member) - amount : 0;
      // Store pending receipt data but don't auto-open receipt dialog
      setPendingReceiptData({
        memberName: member?.full_name || '',
        memberPhone: member?.phone,
        memberDegree: member?.degree || undefined,
        concept: `Pago de cuota extraordinaria – ${detailView.name}`,
        totalAmount: Number(detailView.amount_per_member),
        amountPaid: amount,
        paymentDate: paymentDate,
        remaining
      });
      toast({
        title: 'Éxito',
        description: 'Pago registrado'
      });
      setReceiptFile(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar',
        variant: 'destructive'
      });
    } finally {
      setUploadingReceipt(false);
    }
  };
  const handleUpdatePayment = async () => {
    if (!editPaymentDialog) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({
        title: 'Error',
        description: 'El monto debe ser mayor que 0',
        variant: 'destructive'
      });
      return;
    }
    if (!paymentDate) {
      toast({
        title: 'Error',
        description: 'Seleccione una fecha',
        variant: 'destructive'
      });
      return;
    }
    setUploadingReceipt(true);
    try {
      let receiptUrl = editPaymentDialog.receipt_url; // Preserve existing receipt by default

      // Only upload new receipt if user selected one
      if (editReceiptFile) {
        const fileExt = editReceiptFile.name.split('.').pop();
        const fileName = `extraordinary/${editPaymentDialog.extraordinary_fee_id}/${editPaymentDialog.member_id}_${Date.now()}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from('receipts').upload(fileName, editReceiptFile);
        if (uploadError) throw uploadError;
        const {
          data: urlData
        } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receiptUrl = urlData.publicUrl;
      }
      const {
        data: updatedPayment,
        error
      } = await supabase.from('extraordinary_payments').update({
        amount_paid: amount,
        payment_date: paymentDate,
        receipt_url: receiptUrl
      }).eq('id', editPaymentDialog.id).select('*').single();
      if (error) throw error;
      if (updatedPayment) {
        upsertCachedExtraordinaryPayment(updatedPayment as any);
      }
      toast({
        title: 'Éxito',
        description: 'Pago actualizado'
      });
      setEditPaymentDialog(null);
      setEditReceiptFile(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar',
        variant: 'destructive'
      });
    } finally {
      setUploadingReceipt(false);
    }
  };
  const getTreasurerAndVM = useCallback(async () => {
    let treasurerName = 'Tesorero';
    let vmName = 'Venerable Maestro';
    if (settings.treasurer_id) {
      const t = members.find(m => m.id === settings.treasurer_id);
      if (t) treasurerName = t.full_name;
    }
    const {
      data: vmData
    } = await supabase.from('members').select('full_name').eq('cargo_logial', 'venerable_maestro').limit(1).maybeSingle();
    if (vmData) vmName = vmData.full_name;
    return {
      treasurer: {
        name: treasurerName,
        cargo: 'Tesorero',
        signatureUrl: settings.treasurer_signature_url
      },
      venerableMaestro: {
        name: vmName,
        cargo: 'Venerable Maestro',
        signatureUrl: settings.vm_signature_url
      }
    };
  }, [settings, members]);
  const handleDownloadReceipt = async () => {
    if (!lastReceiptData) return;
    const receiptNumber = await getNextReceiptNumber('extraordinary');
    const sigs = await getTreasurerAndVM();
    const doc = await generatePaymentReceipt({
      receiptNumber,
      memberName: lastReceiptData.memberName,
      memberDegree: lastReceiptData.memberDegree,
      concept: lastReceiptData.concept,
      totalAmount: lastReceiptData.totalAmount,
      amountPaid: lastReceiptData.amountPaid,
      paymentDate: lastReceiptData.paymentDate,
      institutionName: settings.institution_name,
      logoUrl: settings.logo_url,
      remainingBalance: lastReceiptData.remaining,
      treasurer: sigs.treasurer,
      venerableMaestro: sigs.venerableMaestro
    });
    downloadReceipt(doc, lastReceiptData.memberName);
  };
  const handleSendReceiptWhatsApp = () => {
    if (!lastReceiptData?.memberPhone) {
      toast({
        title: 'Sin teléfono',
        description: 'Este miembro no tiene número de teléfono registrado',
        variant: 'destructive'
      });
      return;
    }
    const msg = getReceiptWhatsAppMessage(lastReceiptData.memberName, lastReceiptData.concept, lastReceiptData.amountPaid, lastReceiptData.remaining);
    openWhatsApp(lastReceiptData.memberPhone, msg);
  };
  const handleDeletePayment = async (paymentId: string) => {
    const {
      error
    } = await supabase.from('extraordinary_payments').delete().eq('id', paymentId);
    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar',
        variant: 'destructive'
      });
    } else {
      removeCachedExtraordinaryPayment(paymentId); // Instant cache update
      toast({
        title: 'Éxito',
        description: 'Pago eliminado'
      });
      loadData();
    }
  };
  const totalAmount = useMemo(() => incomes.reduce((sum, i) => sum + Number(i.amount_per_member), 0), [incomes]);

  // DETAIL VIEW: Shows payments ONLY for the selected income
  if (detailView) {
    // CRITICAL: Filter payments by extraordinary_fee_id
    const incomePayments = getPaymentsForIncome(detailView.id);
    const collectedAmount = incomePayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    const expectedTotal = Number(detailView.amount_per_member) * members.length;
    const feeStatus = getIncomeStatus(detailView);
    return <div ref={ref} className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => setDetailView(null)} className="mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-xl font-bold leading-tight">{detailView.name}</h1>
              {detailView.description && <p className="text-sm text-muted-foreground">{detailView.description}</p>}
              <div className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(feeStatus))}>
                  {getStatusText(feeStatus)}
                </span>
                {detailView.is_mandatory && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    Obligatoria
                  </span>}
              </div>
            </div>
          </div>
          <Button onClick={openNewPaymentDialog} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Registrar pago
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Monto por miembro</p>
              <p className="text-lg font-bold mt-0.5">${Number(detailView.amount_per_member).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total esperado</p>
              <p className="text-lg font-bold mt-0.5">${expectedTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Recaudado</p>
              <p className="text-lg font-bold mt-0.5">${collectedAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha límite</p>
              <p className="text-lg font-bold mt-0.5">
                {detailView.due_date ? new Date(detailView.due_date).toLocaleDateString() : 'Sin fecha'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table - Shows ONLY payments for this income */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase">Nombre</TableHead>
                <TableHead className="text-xs font-semibold uppercase w-[100px]">Asignado</TableHead>
                <TableHead className="text-xs font-semibold uppercase w-[100px]">Pagado</TableHead>
                <TableHead className="text-xs font-semibold uppercase w-[110px]">Fecha</TableHead>
                <TableHead className="text-xs font-semibold uppercase w-[100px]">Comprobante</TableHead>
                <TableHead className="text-xs font-semibold uppercase w-[80px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                    No hay miembros activos
                  </TableCell>
                </TableRow> : members.map(member => {
              // Find payment for THIS income and THIS member
              const memberPayment = incomePayments.find(p => p.member_id === member.id);
              const isPaid = !!memberPayment;
              const isPartial = isPaid && Number(memberPayment.amount_paid) < Number(detailView.amount_per_member);
              const pendingAmount = isPartial ? Number(detailView.amount_per_member) - Number(memberPayment.amount_paid) : 0;
              return <TableRow key={member.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm py-2">{member.full_name}</TableCell>
                      <TableCell className="text-sm py-2">${Number(detailView.amount_per_member).toFixed(2)}</TableCell>
                      <TableCell className="py-2">
                        {isPaid ? (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn('text-sm font-bold cursor-default', isPartial ? 'text-destructive' : 'text-success')}>
                                  ${Number(memberPayment.amount_paid).toFixed(2)}
                                </span>
                              </TooltipTrigger>
                              {isPartial && <TooltipContent side="top">
                                <p className="text-sm">Saldo pendiente: <strong>${pendingAmount.toFixed(2)}</strong></p>
                              </TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-2">
                        {isPaid && memberPayment.payment_date ? new Date(memberPayment.payment_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="py-2">
                        {isPaid && memberPayment.receipt_url ? <a href={memberPayment.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
                            <FileText className="h-3.5 w-3.5" /> Ver
                          </a> : <span className="text-muted-foreground text-sm">-</span>}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {isPaid && <div className="flex gap-0.5 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPaymentDialog(memberPayment)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePayment(memberPayment.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>}
                      </TableCell>
                    </TableRow>;
            })}
            </TableBody>
          </Table>
        </div>

        {/* New Payment Dialog */}
        <Dialog open={newPaymentDialog} onOpenChange={setNewPaymentDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar pago</DialogTitle>
              <DialogDescription>{detailView.name}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Miembro</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar miembro" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.filter(m => !incomePayments.find(p => p.member_id === m.id)).map(member => <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Monto</Label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de pago</Label>
                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>

              <ReceiptUpload onFileSelect={setReceiptFile} label="Comprobante de pago" />
            </div>

            <DialogFooter className="gap-2 mt-4 flex-wrap">
              <Button variant="outline" onClick={() => {
              setNewPaymentDialog(false);
              setReceiptFile(null);
              setPendingReceiptData(null);
            }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNewPayment} disabled={uploadingReceipt}>
                {uploadingReceipt ? 'Subiendo...' : 'Guardar'}
              </Button>
              {pendingReceiptData && receiptFile && <Button variant="secondary" onClick={() => {
              setLastReceiptData(pendingReceiptData);
              setPendingReceiptData(null);
              setNewPaymentDialog(false);
            }}>
                   Generar Recibo
                </Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Payment Dialog */}
        <Dialog open={!!editPaymentDialog} onOpenChange={open => {
        if (!open) {
          setEditPaymentDialog(null);
          setEditReceiptFile(null);
        }
      }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar pago</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3">
              {/* Member info */}
              {editPaymentDialog && <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground">Miembro</p>
                  <p className="font-medium">{members.find(m => m.id === editPaymentDialog.member_id)?.full_name || 'Desconocido'}</p>
                </div>}

              <div className="space-y-1.5">
                <Label className="text-xs">Monto</Label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de pago</Label>
                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>

              <ReceiptUpload existingUrl={editPaymentDialog?.receipt_url} onFileSelect={setEditReceiptFile} label="Comprobante de pago" />
            </div>

            <DialogFooter className="gap-2 mt-4 flex-wrap">
              <Button variant="outline" onClick={() => {
              setEditPaymentDialog(null);
              setEditReceiptFile(null);
            }}>
                Cancelar
              </Button>
              <Button onClick={handleUpdatePayment} disabled={uploadingReceipt}>
                {uploadingReceipt ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>;
  }

  // MAIN VIEW: List of all incomes
  return <div ref={ref} className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cuotas Extraordinarias</h1>
          <p className="text-sm text-muted-foreground">Gestión de cuotas y pagos extraordinarios</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva Cuota
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-card">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Cuotas</p>
            <p className="text-2xl font-bold mt-0.5">{incomes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Recaudado</p>
            <p className="text-2xl font-bold mt-0.5">
              ${payments.reduce((sum, p) => sum + Number(p.amount_paid), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Miembros Activos</p>
            <p className="text-2xl font-bold mt-0.5">{members.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Income Cards */}
      {loading ? <div className="text-center py-8 text-muted-foreground">Cargando...</div> : incomes.length === 0 ? <Card className="bg-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay cuotas extraordinarias registradas
          </CardContent>
        </Card> : <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {incomes.map(income => {
        const status = getIncomeStatus(income);
        const paidCount = getPaidMembersCount(income.id);
        const collected = getCollectedAmount(income.id);
        return <Card key={income.id} className="bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className={cn('font-semibold text-base', income.is_mandatory && 'font-bold')}>
                        {income.name}
                      </h3>
                      {income.description && <p className="text-xs text-muted-foreground line-clamp-1">{income.description}</p>}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(income)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(income.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto:</span>
                      <span className="font-medium">${Number(income.amount_per_member).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recaudado:</span>
                      <span className="font-medium">${collected.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pagaron:</span>
                      <span className="font-medium">{paidCount} de {members.length}</span>
                    </div>
                    {income.due_date && <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fecha límite:</span>
                        <span className="font-medium">{new Date(income.due_date).toLocaleDateString()}</span>
                      </div>}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(status))}>
                        {getStatusText(status)}
                      </span>
                      {income.is_mandatory && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                          Obligatoria
                        </span>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openDetailView(income)}>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Ver detalles
                    </Button>
                  </div>
                </CardContent>
              </Card>;
      })}
        </div>}

      {/* New/Edit Income Dialog */}
      <Dialog open={showDialog} onOpenChange={open => {
      setShowDialog(open);
      if (!open) resetForm();
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIncome ? 'Editar Cuota' : 'Nueva Cuota Extraordinaria'}</DialogTitle>
            <DialogDescription>
              {editingIncome ? 'Modifique los datos de la cuota' : 'Complete los datos para crear una nueva cuota'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input value={formData.name} onChange={e => setFormData(prev => ({
              ...prev,
              name: e.target.value
            }))} placeholder="Ej: Cuota aniversario" />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea value={formData.description} onChange={e => setFormData(prev => ({
              ...prev,
              description: e.target.value
            }))} placeholder="Descripción opcional" rows={2} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Monto por miembro *</Label>
                <Input type="number" step="0.01" value={formData.amount_per_member} onChange={e => setFormData(prev => ({
                ...prev,
                amount_per_member: e.target.value
              }))} placeholder="0.00" />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha límite</Label>
                <Input type="date" value={formData.due_date} onChange={e => setFormData(prev => ({
                ...prev,
                due_date: e.target.value
              }))} />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_mandatory" checked={formData.is_mandatory} onChange={e => setFormData(prev => ({
              ...prev,
              is_mandatory: e.target.checked
            }))} className="rounded border-input" />
              <Label htmlFor="is_mandatory" className="text-sm cursor-pointer">
                Cuota obligatoria
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => {
            setShowDialog(false);
            resetForm();
          }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingIncome ? 'Guardar cambios' : 'Crear cuota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={!!lastReceiptData} onOpenChange={() => setLastReceiptData(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recibo de Pago</DialogTitle>
            <DialogDescription>
              Pago registrado para {lastReceiptData?.memberName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-md text-sm space-y-1">
              <p><strong>Concepto:</strong> {lastReceiptData?.concept}</p>
              <p><strong>Valor cuota:</strong> ${lastReceiptData?.totalAmount?.toFixed(2)}</p>
              <p><strong>Monto pagado:</strong> ${lastReceiptData?.amountPaid?.toFixed(2)}</p>
              {(lastReceiptData?.remaining ?? 0) > 0 && <p className="text-destructive"><strong>Saldo pendiente:</strong> ${lastReceiptData?.remaining?.toFixed(2)}</p>}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleDownloadReceipt}>
                <Download className="mr-2 h-4 w-4" /> Descargar PDF
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleSendReceiptWhatsApp}>
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLastReceiptData(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
});
export default ExtraordinaryFees;