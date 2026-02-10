import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { invalidateGlobalCache } from '@/hooks/useDataCache';
interface MemberFormProps {
  member?: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    degree: string | null;
    status: string | null;
    treasury_amount?: number | null;
    is_treasurer?: boolean | null;
    cedula?: string | null;
    address?: string | null;
    join_date?: string | null;
    birth_date?: string | null;
    cargo_logial?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
  };
  onSuccess: () => void;
  onCancel: () => void;
}
const GRADE_OPTIONS = [{
  value: 'aprendiz',
  label: 'Aprendiz'
}, {
  value: 'companero',
  label: 'Companero'
}, {
  value: 'maestro',
  label: 'Maestro'
}];
const STATUS_OPTIONS = [{
  value: 'activo',
  label: 'Activo'
}, {
  value: 'inactivo',
  label: 'Inactivo'
}];
const CARGO_OPTIONS = [{
  value: 'sin_cargo',
  label: 'Sin cargo'
}, {
  value: 'venerable_maestro',
  label: 'Venerable Maestro'
}, {
  value: 'primer_vigilante',
  label: 'Primer Vigilante'
}, {
  value: 'segundo_vigilante',
  label: 'Segundo Vigilante'
}, {
  value: 'tesorero',
  label: 'Tesorero'
}];
export default function MemberForm({
  member,
  onSuccess,
  onCancel
}: MemberFormProps) {
  const [formData, setFormData] = useState({
    full_name: member?.full_name || '',
    phone: member?.phone || '',
    email: member?.email || '',
    degree: member?.degree || 'aprendiz',
    status: member?.status || 'activo',
    
    cedula: member?.cedula || '',
    address: member?.address || '',
    join_date: member?.join_date || '',
    birth_date: member?.birth_date || '',
    cargo_logial: member?.cargo_logial || 'sin_cargo',
    emergency_contact_name: member?.emergency_contact_name || '',
    emergency_contact_phone: member?.emergency_contact_phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [defaultFee, setDefaultFee] = useState(50);
  const {
    toast
  } = useToast();
  const {
    settings
  } = useSettings();
  useEffect(() => {
    setLoadingSettings(false);
  }, [member]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre completo es obligatorio',
        variant: 'destructive'
      });
      return;
    }
    if (!formData.cedula.trim()) {
      toast({
        title: 'Error',
        description: 'La cedula es obligatoria',
        variant: 'destructive'
      });
      return;
    }
    if (!formData.join_date) {
      toast({
        title: 'Error',
        description: 'La fecha de ingreso es obligatoria',
        variant: 'destructive'
      });
      return;
    }
    await performSubmit();
  };
  const performSubmit = async () => {
    setLoading(true);
    try {
      const dataToSave: any = {
        full_name: formData.full_name.trim(),
        phone: formData.phone || null,
        email: formData.email || null,
        degree: formData.degree,
        status: formData.status,
        
        cedula: formData.cedula.trim() || null,
        address: formData.address.trim() || null,
        join_date: formData.join_date || null,
        birth_date: formData.birth_date || null,
        cargo_logial: formData.cargo_logial === 'sin_cargo' ? null : formData.cargo_logial || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
      };
      if (member) {
        const {
          error
        } = await supabase.from('members').update(dataToSave).eq('id', member.id);
        if (error) throw error;
        toast({
          title: 'Miembro actualizado correctamente'
        });
      } else {
        const {
          error
        } = await supabase.from('members').insert([dataToSave]);
        if (error) throw error;
        toast({
          title: 'Miembro creado correctamente'
        });
      }
      // Invalidate cache so all components (including Settings) update immediately
      invalidateGlobalCache();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el miembro',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  if (loadingSettings) {
    return <div className="flex items-center justify-center py-8"><span className="text-muted-foreground">Cargando...</span></div>;
  }
  return <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="full_name">Nombre Completo *</Label>
        <Input id="full_name" required value={formData.full_name} onChange={e => setFormData({
        ...formData,
        full_name: e.target.value
      })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cedula">Cedula *</Label>
          <Input id="cedula" required value={formData.cedula} onChange={e => setFormData({
          ...formData,
          cedula: e.target.value
        })} placeholder="Ej: 1712345678" />
        </div>
        <div>
          <Label htmlFor="degree">Grado *</Label>
          <Select value={formData.degree} onValueChange={value => setFormData({
          ...formData,
          degree: value
        })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{GRADE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="cargo_logial">Cargo Logial</Label>
        <Select value={formData.cargo_logial} onValueChange={value => setFormData({
        ...formData,
        cargo_logial: value
      })}>
          <SelectTrigger><SelectValue placeholder="Seleccione un cargo" /></SelectTrigger>
          <SelectContent>{CARGO_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">Cargo que ejerce el miembro en la logia</p>
      </div>

      <div>
        <Label htmlFor="address">Direccion</Label>
        <Input id="address" value={formData.address} onChange={e => setFormData({
        ...formData,
        address: e.target.value
      })} placeholder="Direccion completa" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="join_date">Fecha de Ingreso *</Label>
          <Input id="join_date" type="date" required value={formData.join_date} onChange={e => setFormData({
          ...formData,
          join_date: e.target.value
        })} />
        </div>
        <div>
          <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
          <Input id="birth_date" type="date" value={formData.birth_date} onChange={e => setFormData({
          ...formData,
          birth_date: e.target.value
        })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={e => setFormData({
          ...formData,
          email: e.target.value
        })} placeholder="ejemplo@email.com" />
        </div>
        <div>
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" value={formData.phone} onChange={e => setFormData({
          ...formData,
          phone: e.target.value
        })} placeholder="Ej: +593 99 123 4567" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        
        <div>
          <Label htmlFor="status">Estado</Label>
          <Select value={formData.status} onValueChange={value => setFormData({
          ...formData,
          status: value
        })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Contacto de Emergencia */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Contacto de Emergencia</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergency_contact_name">Nombre *</Label>
            <Input id="emergency_contact_name" required value={formData.emergency_contact_name} onChange={e => setFormData({
              ...formData,
              emergency_contact_name: e.target.value
            })} placeholder="Nombre del contacto" />
          </div>
          <div>
            <Label htmlFor="emergency_contact_phone">Teléfono *</Label>
            <Input id="emergency_contact_phone" required value={formData.emergency_contact_phone} onChange={e => setFormData({
              ...formData,
              emergency_contact_phone: e.target.value
            })} placeholder="Ej: +593 99 123 4567" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : member ? 'Actualizar' : 'Crear'}</Button>
      </div>
    </form>;
}