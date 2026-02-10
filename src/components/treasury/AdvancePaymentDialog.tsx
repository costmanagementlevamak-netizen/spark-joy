import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreditCard, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ReceiptUpload } from '@/components/ui/receipt-upload';
import { getSystemDateString } from '@/lib/dateUtils';

interface AdvancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberId: string;
  memberMonthlyAmount: number;
  existingPayments: Set<string>; // Set of "month-year" keys that are already paid
  currentYear: number;
  onSubmit: (data: {
    totalAmount: number;
    selectedMonths: Array<{ month: number; year: number }>;
    paymentDate: string;
    receiptFile: File | null;
  }) => Promise<void>;
  processing: boolean;
}

const MONTHS = [
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'
];

export default function AdvancePaymentDialog({
  open,
  onOpenChange,
  memberName,
  memberId,
  memberMonthlyAmount,
  existingPayments,
  currentYear,
  onSubmit,
  processing,
}: AdvancePaymentDialogProps) {
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [selectedMonthIndices, setSelectedMonthIndices] = useState<number[]>([]);

  // Calculate validation for exact divisibility
  const amountValidation = useMemo(() => {
    const amount = parseFloat(totalAmount) || 0;
    if (amount <= 0 || memberMonthlyAmount <= 0) {
      return { isValid: false, monthsCovered: 0, remainder: 0 };
    }
    const remainder = Number((amount % memberMonthlyAmount).toFixed(2));
    const monthsCovered = Math.floor(amount / memberMonthlyAmount);
    const isExact = remainder === 0;
    return { isValid: isExact, monthsCovered, remainder };
  }, [totalAmount, memberMonthlyAmount]);

  const { monthsCovered, remainder, isValid: isAmountExact } = amountValidation;

  // Get available months (not already paid) - ordered by fiscal year
  // Treasury passes fiscalYear as currentYear (e.g., 2024 for July 2024 - June 2025)
  const availableMonths = useMemo(() => {
    const months: Array<{ index: number; label: string; month: number; year: number }> = [];
    
    for (let i = 0; i < 12; i++) {
      // Fiscal year: Jul-Dec = currentYear, Jan-Jun = currentYear + 1
      const year = i < 6 ? currentYear : currentYear + 1;
      // Month mapping: index 0-5 = Jul-Dec (7-12), index 6-11 = Jan-Jun (1-6)
      const month = i < 6 ? i + 7 : i - 5;
      const key = `${month}-${year}`;
      
      if (!existingPayments.has(key)) {
        months.push({
          index: i,
          label: `${MONTHS[i]} ${year}`,
          month,
          year,
        });
      }
    }
    
    return months;
  }, [existingPayments, currentYear]);

  // Reset selection when months covered changes
  useEffect(() => {
    if (isAmountExact && monthsCovered > 0 && monthsCovered <= availableMonths.length) {
      // Auto-select the first N available months
      setSelectedMonthIndices(availableMonths.slice(0, monthsCovered).map(m => m.index));
    } else {
      setSelectedMonthIndices([]);
    }
  }, [monthsCovered, isAmountExact, availableMonths]);

  // Initialize payment date with system date
  useEffect(() => {
    if (open) {
      setPaymentDate(getSystemDateString());
      setTotalAmount('');
      setReceiptFile(null);
      setSelectedMonthIndices([]);
    }
  }, [open]);

  const toggleMonth = (index: number) => {
    if (selectedMonthIndices.includes(index)) {
      setSelectedMonthIndices(prev => prev.filter(i => i !== index));
    } else {
      if (selectedMonthIndices.length < monthsCovered) {
        setSelectedMonthIndices(prev => [...prev, index]);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedMonthIndices.length === 0 || !paymentDate || !isAmountExact) return;

    const selectedMonths = selectedMonthIndices.map(idx => {
      // Same mapping as availableMonths
      const year = idx < 6 ? currentYear : currentYear + 1;
      const month = idx < 6 ? idx + 7 : idx - 5;
      return { month, year };
    });

    await onSubmit({
      totalAmount: parseFloat(totalAmount),
      selectedMonths,
      paymentDate,
      receiptFile,
    });
  };

  // Validation: amount must be exact and all months selected
  const canSubmit = isAmountExact && 
                    selectedMonthIndices.length > 0 && 
                    selectedMonthIndices.length === monthsCovered && 
                    paymentDate && 
                    parseFloat(totalAmount) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pago por Adelantado
          </DialogTitle>
          <DialogDescription>
            Registrar pago de múltiples meses para {memberName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cuota mensual del miembro:</span>
              <span className="font-bold">${memberMonthlyAmount.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              El total debe ser un múltiplo exacto de esta cuota
            </p>
          </div>

          <div>
            <Label htmlFor="totalAmount">Monto Total Recibido *</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="text-lg font-medium"
            />
            
            {/* Validation feedback */}
            {parseFloat(totalAmount) > 0 && (
              <div className="mt-2 space-y-1">
                {isAmountExact ? (
                  <p className="text-sm text-success flex items-center gap-1">
                    ✓ Cubre exactamente <span className="font-bold">{monthsCovered}</span> mes(es)
                    {monthsCovered > availableMonths.length && (
                      <span className="text-destructive ml-1">
                        (solo hay {availableMonths.length} disponibles)
                      </span>
                    )}
                  </p>
                ) : (
                  <div className="p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        Monto no válido: sobrante de <strong>${remainder.toFixed(2)}</strong>
                      </span>
                    </p>
                    <p className="text-xs text-destructive/80 mt-1">
                      El total debe ser un múltiplo exacto de ${memberMonthlyAmount.toFixed(2)}
                    </p>
                    {monthsCovered > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Montos válidos: ${(monthsCovered * memberMonthlyAmount).toFixed(2)} ({monthsCovered} meses) 
                        o ${((monthsCovered + 1) * memberMonthlyAmount).toFixed(2)} ({monthsCovered + 1} meses)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Month selection - only show when amount is valid */}
          {isAmountExact && monthsCovered > 0 && monthsCovered <= availableMonths.length && (
            <div>
              <Label>Seleccionar {monthsCovered} mes(es) *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {availableMonths.map((m) => (
                  <div
                    key={m.index}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`month-${m.index}`}
                      checked={selectedMonthIndices.includes(m.index)}
                      disabled={!selectedMonthIndices.includes(m.index) && selectedMonthIndices.length >= monthsCovered}
                      onCheckedChange={() => toggleMonth(m.index)}
                    />
                    <label
                      htmlFor={`month-${m.index}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {m.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Seleccionados: {selectedMonthIndices.length} de {monthsCovered}
              </p>
            </div>
          )}

          {availableMonths.length === 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              Este miembro ya tiene todos los meses del año pagados.
            </div>
          )}

          <div>
            <Label htmlFor="paymentDate">Fecha de Pago *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Esta fecha se aplicará a todos los pagos registrados
            </p>
          </div>

          <div>
            <ReceiptUpload
              onFileSelect={setReceiptFile}
              label="Comprobante de Pago"
            />
            <p className="text-xs text-muted-foreground mt-1">
              El mismo comprobante se asignará a todos los meses seleccionados
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || processing}>
            {processing ? 'Procesando...' : `Registrar ${selectedMonthIndices.length} Pago(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
