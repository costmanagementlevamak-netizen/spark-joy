import { useEffect, useState, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ReceiptUpload } from '@/components/ui/receipt-upload';
import { formatDateForDisplay, getSystemDateString } from '@/lib/dateUtils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { removeCachedExpense, upsertCachedExpense } from '@/hooks/useDataCache';
interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  notes: string | null;
  receipt_url: string | null;
}
const CATEGORIES = [{
  value: 'alimentacion',
  label: 'Alimentación'
}, {
  value: 'alquiler',
  label: 'Alquiler'
}, {
  value: 'servicios',
  label: 'Servicios Básicos'
}, {
  value: 'articulos',
  label: 'Artículos'
}, {
  value: 'membresia',
  label: 'Membresía'
}, {
  value: 'filantropia',
  label: 'Filantropía'
}, {
  value: 'eventos',
  label: 'Eventos'
}, {
  value: 'otros',
  label: 'Otros'
}];
const Expenses = forwardRef<HTMLDivElement>(function Expenses(_props, ref) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    notes: '',
    category: 'otros',
    amount: '',
    expense_date: getSystemDateString() // Uses centralized date (04/02/2026)
  });
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadExpenses();
  }, []);
  const loadExpenses = async () => {
    setLoading(true);
    const {
      data
    } = await supabase.from('expenses').select('*').order('expense_date', {
      ascending: false
    });
    if (data) setExpenses(data as Expense[]);
    setLoading(false);
  };
  const resetForm = () => {
    setFormData({
      description: '',
      notes: '',
      category: 'otros',
      amount: '',
      expense_date: getSystemDateString() // Uses centralized date (04/02/2026)
    });
    setEditingExpense(null);
    setReceiptFile(null);
  };
  const openNewDialog = () => {
    resetForm();
    setShowDialog(true);
  };
  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      notes: expense.notes || '',
      category: expense.category || 'otros',
      amount: expense.amount.toString(),
      expense_date: expense.expense_date
    });
    setReceiptFile(null);
    setShowDialog(true);
  };
  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return null;
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `expenses/${fileName}`;
    const {
      error
    } = await supabase.storage.from('receipts').upload(filePath, receiptFile);
    if (error) {
      throw new Error('Error al subir documento');
    }
    const {
      data: urlData
    } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return urlData.publicUrl;
  };
  const handleSubmit = async () => {
    if (!formData.description || !formData.amount || !formData.expense_date) {
      toast({
        title: 'Error',
        description: 'Por favor complete todos los campos requeridos',
        variant: 'destructive'
      });
      return;
    }
    setUploading(true);
    try {
      let receiptUrl = editingExpense?.receipt_url || null;
      if (receiptFile) {
        receiptUrl = await uploadReceipt();
      }
      const expenseData = {
        description: formData.description,
        notes: formData.notes || null,
        category: formData.category,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        receipt_url: receiptUrl
      };
      if (editingExpense) {
        const {
          data,
          error
        } = await supabase.from('expenses').update(expenseData).eq('id', editingExpense.id).select('*').single();
        if (error) throw error;
        if (data) upsertCachedExpense(data);
        toast({
          title: 'Éxito',
          description: 'Gasto actualizado correctamente'
        });
      } else {
        const {
          data,
          error
        } = await supabase.from('expenses').insert([expenseData]).select('*').single();
        if (error) throw error;
        if (data) upsertCachedExpense(data);
        toast({
          title: 'Éxito',
          description: 'Gasto registrado correctamente'
        });
      }
      setShowDialog(false);
      resetForm();
      loadExpenses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el gasto',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };
  const handleDelete = async (id: string) => {
    const {
      error
    } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el gasto',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Éxito',
        description: 'Gasto eliminado correctamente'
      });

      // Instant cross-module consistency (Informes/Dashboard)
      removeCachedExpense(id);
      loadExpenses();
    }
  };
  return <div ref={ref} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gastos</h1>
          <p className="text-muted-foreground mt-1">
            Registro y gestión de egresos de la logia
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Gasto
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Descripción</TableHead>
              <TableHead className="w-[120px]">Categoría</TableHead>
              <TableHead className="w-[100px]">Monto</TableHead>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead className="w-[100px]">Comprobante</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow> : expenses.length === 0 ? <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay gastos registrados
                </TableCell>
              </TableRow> : expenses.map(expense => <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell className="text-sm">
                    {CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                  </TableCell>
                  <TableCell>${expense.amount.toFixed(2)}</TableCell>
                  <TableCell>{formatDateForDisplay(expense.expense_date)}</TableCell>
                  <TableCell>
                    {expense.receipt_url ? <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                        
                        Ver
                      </a> : <span className="text-muted-foreground text-sm">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(expense)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={open => {
      setShowDialog(open);
      if (!open) resetForm();
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Modifique los datos del gasto' : 'Registre un nuevo egreso de la logia'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Input id="description" value={formData.description} onChange={e => setFormData({
              ...formData,
              description: e.target.value
            })} placeholder="Ej: Pago de alquiler" />
            </div>
            
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select value={formData.category} onValueChange={value => setFormData({
              ...formData,
              category: value
            })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="amount">Monto *</Label>
              <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({
              ...formData,
              amount: e.target.value
            })} placeholder="0.00" />
            </div>
            
            <div>
              <Label htmlFor="expense_date">Fecha *</Label>
              <Input id="expense_date" type="date" value={formData.expense_date} onChange={e => setFormData({
              ...formData,
              expense_date: e.target.value
            })} />
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={formData.notes} onChange={e => setFormData({
              ...formData,
              notes: e.target.value
            })} placeholder="Detalles adicionales" />
            </div>

            <ReceiptUpload existingUrl={editingExpense?.receipt_url} onFileSelect={setReceiptFile} label="Documento de Respaldo" accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.doc,.docx" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setShowDialog(false);
            resetForm();
          }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Guardando...' : editingExpense ? 'Actualizar' : 'Registrar Gasto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
});
export default Expenses;