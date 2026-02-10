import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getSystemDateString } from '@/lib/dateUtils';

interface PaymentFormProps {
  payment?: {
    id: string;
    amount: number;
    paid_at: string | null;
  };
  memberId: string;
  memberName: string;
  month: number;
  year: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const MONTHS = [
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'
];

// Uses centralized date utility from dateUtils.ts

export default function PaymentForm({ 
  payment, 
  memberId, 
  memberName, 
  month, 
  year, 
  onSuccess, 
  onCancel 
}: PaymentFormProps) {
  // Default to current date if no payment exists, otherwise use payment date
  const defaultDate = useMemo(() => {
    if (payment?.paid_at) {
      // Extract date part from ISO timestamp
      return payment.paid_at.split('T')[0];
    }
    // CRITICAL: Always default to current system date (never empty)
    return getSystemDateString();
  }, [payment?.paid_at]);

  const [formData, setFormData] = useState({
    amount: payment?.amount.toString() || '',
    paid_at: defaultDate, // Always default to current date or existing date
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const status = formData.paid_at ? 'paid' : 'pending';

      const paymentData = {
        amount: parseFloat(formData.amount) || 0,
        paid_at: formData.paid_at || null,
        status,
      };

      if (payment) {
        const { error } = await supabase
          .from('monthly_payments')
          .update(paymentData)
          .eq('id', payment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('monthly_payments')
          .insert([{
            member_id: memberId,
            month,
            year,
            ...paymentData,
          }]);

        if (error) throw error;
      }

      toast({
        title: 'Éxito',
        description: 'Pago guardado correctamente',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el pago',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        <p><strong>Miembro:</strong> {memberName}</p>
        <p><strong>Mes:</strong> {MONTHS[month - 1]}</p>
        <p><strong>Año:</strong> {year}</p>
      </div>

      <div>
        <Label htmlFor="amount">Monto</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0.00"
        />
      </div>

      <div>
        <Label htmlFor="paid_at">Fecha de Pago</Label>
        <Input
          id="paid_at"
          type="date"
          value={formData.paid_at}
          onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
