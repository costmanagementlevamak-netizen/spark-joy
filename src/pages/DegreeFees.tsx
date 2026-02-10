import { useEffect, useState, useCallback, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, FileText, Download, MessageCircle } from 'lucide-react';
import { ReceiptUpload } from '@/components/ui/receipt-upload';
import { formatDateForDisplay, getSystemDateString } from '@/lib/dateUtils';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { generatePaymentReceipt, getNextReceiptNumber, downloadReceipt, getReceiptWhatsAppMessage } from '@/lib/receiptGenerator';
import { openWhatsApp } from '@/lib/whatsappUtils';

interface DegreeFee {
  id: string;
  description: string;
  amount: number;
  fee_date: string;
  category: string;
  receipt_url: string | null;
  notes: string | null;
}

const CATEGORIES = [
  { value: 'iniciacion', label: 'Iniciación' },
  { value: 'aumento_salario', label: 'Aumento de Salario (Compañero)' },
  { value: 'exaltacion', label: 'Exaltación (Maestro)' },
  { value: 'afiliacion_plancha', label: 'Afiliación / Plancha de Quite' },
];

const getCategoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label || value;

const DegreeFees = forwardRef<HTMLDivElement>(function DegreeFees(_props, ref) {
  const [fees, setFees] = useState<DegreeFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<DegreeFee | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    notes: '',
    category: 'iniciacion',
    amount: '',
    fee_date: getSystemDateString(),
  });
  const [lastReceiptData, setLastReceiptData] = useState<{
    description: string; amount: number; category: string; feeDate: string;
  } | null>(null);
  // Track if comprobante was uploaded to gate the receipt button
  const [hasComprobante, setHasComprobante] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('degree_fees')
      .select('*')
      .order('fee_date', { ascending: false });
    if (data) setFees(data as DegreeFee[]);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      description: '',
      notes: '',
      category: 'iniciacion',
      amount: '',
      fee_date: getSystemDateString(),
    });
    setEditingFee(null);
    setReceiptFile(null);
    setHasComprobante(false);
  };

  const openNewDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (fee: DegreeFee) => {
    setEditingFee(fee);
    setFormData({
      description: fee.description,
      notes: fee.notes || '',
      category: fee.category,
      amount: fee.amount.toString(),
      fee_date: fee.fee_date,
    });
    setReceiptFile(null);
    setHasComprobante(!!fee.receipt_url);
    setShowDialog(true);
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return null;
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `degree-fees/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('receipts').upload(fileName, receiptFile);
    if (error) throw new Error('Error al subir comprobante');
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleFileSelect = (file: File | null) => {
    setReceiptFile(file);
    if (file) setHasComprobante(true);
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.fee_date || !formData.category) {
      toast({ title: 'Error', description: 'Complete todos los campos requeridos', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      let receiptUrl = editingFee?.receipt_url || null;
      if (receiptFile) receiptUrl = await uploadReceipt();

      const feeData = {
        description: formData.description,
        notes: formData.notes || null,
        category: formData.category,
        amount: parseFloat(formData.amount),
        fee_date: formData.fee_date,
        receipt_url: receiptUrl,
      };

      if (editingFee) {
        const { error } = await supabase.from('degree_fees').update(feeData).eq('id', editingFee.id);
        if (error) throw error;
        toast({ title: 'Registro actualizado correctamente' });
      } else {
        const { error } = await supabase.from('degree_fees').insert([feeData]);
        if (error) throw error;
        toast({ title: 'Derecho de grado registrado correctamente' });
      }

      // Store receipt data for potential receipt generation
      if (receiptFile || editingFee?.receipt_url) {
        setLastReceiptData({
          description: formData.description,
          amount: parseFloat(formData.amount),
          category: formData.category,
          feeDate: formData.fee_date,
        });
      }

      setShowDialog(false);
      resetForm();
      loadFees();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('degree_fees').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    } else {
      toast({ title: 'Registro eliminado correctamente' });
      loadFees();
    }
  };

  const getTreasurerAndVM = useCallback(async () => {
    let treasurerName = 'Tesorero';
    let vmName = 'Venerable Maestro';
    
    if (settings.treasurer_id) {
      const { data } = await supabase.from('members').select('full_name').eq('id', settings.treasurer_id).maybeSingle();
      if (data) treasurerName = data.full_name;
    }
    
    const { data: vmData } = await supabase.from('members').select('full_name').eq('cargo_logial', 'venerable_maestro').limit(1).maybeSingle();
    if (vmData) vmName = vmData.full_name;
    
    return {
      treasurer: { name: treasurerName, cargo: 'Tesorero', signatureUrl: settings.treasurer_signature_url },
      venerableMaestro: { name: vmName, cargo: 'Venerable Maestro', signatureUrl: settings.vm_signature_url },
    };
  }, [settings]);

  const handleDownloadReceipt = async () => {
    if (!lastReceiptData) return;
    const receiptNumber = await getNextReceiptNumber('degree');
    const sigs = await getTreasurerAndVM();
    const doc = await generatePaymentReceipt({
      receiptNumber,
      memberName: lastReceiptData.description,
      concept: `Pago por Derecho de Grado – ${getCategoryLabel(lastReceiptData.category)}`,
      totalAmount: lastReceiptData.amount,
      amountPaid: lastReceiptData.amount,
      paymentDate: lastReceiptData.feeDate,
      institutionName: settings.institution_name,
      logoUrl: settings.logo_url,
      treasurer: sigs.treasurer,
      venerableMaestro: sigs.venerableMaestro,
    });
    downloadReceipt(doc, lastReceiptData.description);
  };

  const handleSendReceiptWhatsApp = () => {
    if (!lastReceiptData) return;
    const msg = getReceiptWhatsAppMessage(
      lastReceiptData.description,
      `Pago por Derecho de Grado – ${getCategoryLabel(lastReceiptData.category)}`,
      lastReceiptData.amount,
    );
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Determine if receipt button should show in form dialog
  const canGenerateReceipt = hasComprobante || !!editingFee?.receipt_url;

  return (
    <div ref={ref} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Derechos de Grado</h1>
          <p className="text-muted-foreground mt-1">
            Registro de pagos por iniciación, aumento de salario, exaltación y afiliación
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Registro
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Descripción</TableHead>
              <TableHead className="w-[180px]">Categoría</TableHead>
              <TableHead className="w-[100px]">Monto</TableHead>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead className="w-[100px]">Comprobante</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Cargando...</TableCell>
              </TableRow>
            ) : fees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay derechos de grado registrados
                </TableCell>
              </TableRow>
            ) : (
              fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{fee.description}</TableCell>
                  <TableCell className="text-sm">
                    {getCategoryLabel(fee.category)}
                  </TableCell>
                  <TableCell>${fee.amount.toFixed(2)}</TableCell>
                  <TableCell>{formatDateForDisplay(fee.fee_date)}</TableCell>
                  <TableCell>
                    {fee.receipt_url ? (
                      <a href={fee.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                        <FileText className="h-4 w-4" /> Ver
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(fee)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(fee.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFee ? 'Editar Derecho de Grado' : 'Nuevo Derecho de Grado'}</DialogTitle>
            <DialogDescription>
              {editingFee ? 'Modifique los datos del registro' : 'Registre un nuevo derecho de grado'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Input id="description" value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej: Iniciación de H. Juan Pérez" />
            </div>

            <div>
              <Label htmlFor="category">Categoría *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger><SelectValue placeholder="Seleccione categoría" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Monto *</Label>
              <Input id="amount" type="number" step="0.01" value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
            </div>

            <div>
              <Label htmlFor="fee_date">Fecha *</Label>
              <Input id="fee_date" type="date" value={formData.fee_date}
                onChange={(e) => setFormData({ ...formData, fee_date: e.target.value })} />
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalles adicionales" />
            </div>

            <ReceiptUpload
              existingUrl={editingFee?.receipt_url}
              onFileSelect={handleFileSelect}
              label="Comprobante de Pago"
              accept=".jpg,.jpeg,.png,.pdf"
            />
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Guardando...' : (editingFee ? 'Actualizar' : 'Registrar')}
            </Button>
            {canGenerateReceipt && (
              <Button variant="secondary" onClick={() => {
                setLastReceiptData({
                  description: formData.description,
                  amount: parseFloat(formData.amount) || 0,
                  category: formData.category,
                  feeDate: formData.fee_date,
                });
                setShowDialog(false);
              }}>
                <Download className="mr-2 h-4 w-4" /> Generar Recibo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={!!lastReceiptData} onOpenChange={() => setLastReceiptData(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recibo de Pago – Derechos de Grado</DialogTitle>
            <DialogDescription>
              Derecho de grado registrado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-md text-sm space-y-1">
              <p><strong>Concepto:</strong> Pago por Derecho de Grado – {getCategoryLabel(lastReceiptData?.category || '')}</p>
              <p><strong>Descripción:</strong> {lastReceiptData?.description}</p>
              <p><strong>Monto:</strong> ${lastReceiptData?.amount?.toFixed(2)}</p>
              <p><strong>Estado:</strong> <span className="text-success font-medium">Completo</span></p>
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
    </div>
  );
});

export default DegreeFees;
