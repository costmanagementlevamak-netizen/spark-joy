import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'servicios', label: 'Servicios Básicos' },
  { value: 'articulos', label: 'Artículos' },
  { value: 'membresia', label: 'Membresía' },
  { value: 'filantropia', label: 'Filantropía' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'otros', label: 'Otros' },
];

interface ExpenseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    notes: '',
    category: 'otros',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          description: formData.description,
          notes: formData.notes || null,
          category: formData.category,
          amount: parseFloat(formData.amount),
          date: formData.date,
        }]);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Gasto registrado correctamente',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el gasto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="description">Descripción *</Label>
        <Input
          id="description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="category">Categoría</Label>
        <Select 
          value={formData.category} 
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="amount">Monto *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          required
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0.00"
        />
      </div>

      <div>
        <Label htmlFor="date">Fecha *</Label>
        <Input
          id="date"
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Crear Gasto'}
        </Button>
      </div>
    </form>
  );
}
