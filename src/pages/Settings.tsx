import { useState, useEffect, useRef, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useDataCache } from '@/hooks/useDataCache';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { getFiscalYearInfo } from '@/lib/dateUtils';
import { invalidateGlobalCache } from '@/hooks/useDataCache';

const Settings = forwardRef<HTMLDivElement>(function Settings(_props, ref) {
  const { toast } = useToast();
  const { settings, updateSettings, loading: settingsLoading, refresh: refreshSettings } = useSettings();
  const { summary, members, loading: cacheLoading, refresh: refreshCache } = useDataCache();
  
  const [monthlyFee, setMonthlyFee] = useState(settings.monthly_fee_base.toString());
  const [institutionName, setInstitutionName] = useState(settings.institution_name);
  const [monthlyReportTemplate, setMonthlyReportTemplate] = useState(settings.monthly_report_template);
  const [annualReportTemplate, setAnnualReportTemplate] = useState(settings.annual_report_template);
  const [selectedTreasurerId, setSelectedTreasurerId] = useState(settings.treasurer_id || '');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingTreasurerSig, setUploadingTreasurerSig] = useState(false);
  const [uploadingVMSig, setUploadingVMSig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const treasurerSigRef = useRef<HTMLInputElement>(null);
  const vmSigRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMonthlyFee(settings.monthly_fee_base.toString());
    setInstitutionName(settings.institution_name);
    setMonthlyReportTemplate(settings.monthly_report_template || '');
    setAnnualReportTemplate(settings.annual_report_template || '');
    setSelectedTreasurerId(settings.treasurer_id || '');
  }, [settings]);

  const { currentCalendarYear, nextCalendarYear } = getFiscalYearInfo();
  const initialBalance = summary ? summary.balance : 0;

  const activeMembers = members.filter(m => m.status === 'activo');

  const handleSaveFinancial = async () => {
    setSaving(true);
    try {
      await updateSettings({ monthly_fee_base: parseFloat(monthlyFee), institution_name: institutionName });
      // Invalidate data cache so Treasury picks up the new fee immediately
      invalidateGlobalCache();
      toast({ title: 'Configuración guardada', description: 'Los parámetros han sido actualizados' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los parámetros', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSaveReportTemplates = async () => {
    setSaving(true);
    try {
      await updateSettings({ monthly_report_template: monthlyReportTemplate, annual_report_template: annualReportTemplate });
      toast({ title: 'Plantillas guardadas' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar las plantillas', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleSaveTreasurer = async () => {
    setSaving(true);
    try {
      // Remove old treasurer flag
      await supabase.from('members').update({ is_treasurer: false }).eq('is_treasurer', true);
      // Set new treasurer
      if (selectedTreasurerId) {
        await supabase.from('members').update({ is_treasurer: true }).eq('id', selectedTreasurerId);
      }
      // Save treasurer_id to settings context (persists in DB)
      await updateSettings({ treasurer_id: selectedTreasurerId || null });
      await refreshCache();
      toast({ title: 'Tesorero actualizado' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Solo se permiten archivos de imagen', variant: 'destructive' });
      return;
    }
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(`logos/${fileName}`, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(`logos/${fileName}`);
      // Save through context so Layout updates immediately
      await updateSettings({ logo_url: urlData.publicUrl });
      toast({ title: 'Logo actualizado', description: 'El logo se ha actualizado en la barra lateral y los PDFs' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo subir el logo', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSignatureUpload = async (type: 'treasurer' | 'vm', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Solo se permiten archivos de imagen', variant: 'destructive' });
      return;
    }
    const setUploading = type === 'treasurer' ? setUploadingTreasurerSig : setUploadingVMSig;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-signature-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(`signatures/${fileName}`, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(`signatures/${fileName}`);
      const field = type === 'treasurer' ? 'treasurer_signature_url' : 'vm_signature_url';
      // Save through context so it persists
      await updateSettings({ [field]: urlData.publicUrl } as any);
      toast({ title: `Firma ${type === 'treasurer' ? 'del Tesorero' : 'del V.M.'} actualizada` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'No se pudo subir la firma', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (settingsLoading && cacheLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div ref={ref} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">Parámetros de la aplicación</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Parámetros Generales */}
        <Card>
          <CardHeader>
            <CardTitle>Parámetros Generales</CardTitle>
            <CardDescription>Configuración institucional y financiera</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="institution-name">Nombre de la Institución</Label>
              <Input id="institution-name" value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Nombre de la logia" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-fee">Cuota Mensual Base ($)</Label>
              <Input id="monthly-fee" type="number" step="0.01" min="0" value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} />
              <p className="text-xs text-muted-foreground">Valor por defecto de la cuota mensual</p>
            </div>
            <Button onClick={handleSaveFinancial} className="w-full" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Parámetros'}
            </Button>
          </CardContent>
        </Card>

        {/* Logo Institucional */}
        <Card>
          <CardHeader>
            <CardTitle>Logo Institucional</CardTitle>
            <CardDescription>Reemplaza el logo por defecto. Visible en menú lateral y PDFs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden">
                <img 
                  src={settings.logo_url || '/placeholder.svg'} 
                  alt="Logo actual" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
              </div>
              <div className="flex-1">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="w-full">
                  {uploadingLogo ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...</> : <><Upload className="mr-2 h-4 w-4" /> Subir nuevo logo</>}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Formatos: JPG, PNG, SVG</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tesorero Activo */}
      <Card>
        <CardHeader>
          <CardTitle>Tesorero Activo por Periodo</CardTitle>
          <CardDescription>Seleccione quien ejerce actualmente el cargo de Tesorero</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tesorero actual</Label>
            <Select value={selectedTreasurerId} onValueChange={setSelectedTreasurerId}>
              <SelectTrigger><SelectValue placeholder="Seleccione un miembro" /></SelectTrigger>
              <SelectContent>
                {activeMembers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Este miembro aparecerá como firmante en recibos, informes y comunicados</p>
          </div>
          <Button onClick={handleSaveTreasurer} className="w-full" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Tesorero'}
          </Button>
        </CardContent>
      </Card>

      {/* Firmas Electrónicas */}
      <Card>
        <CardHeader>
          <CardTitle>Firmas Electrónicas</CardTitle>
          <CardDescription>Firmas que se usarán automáticamente en recibos, informes, comunicados y documentos de cierre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Firma del Tesorero */}
            <div className="space-y-3">
              <Label>Firma del Tesorero</Label>
              <div className="w-full h-24 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden">
                {settings.treasurer_signature_url ? (
                  <img src={settings.treasurer_signature_url} alt="Firma Tesorero" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin firma cargada</span>
                )}
              </div>
              <input ref={treasurerSigRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSignatureUpload('treasurer', e)} />
              <Button variant="outline" size="sm" className="w-full" onClick={() => treasurerSigRef.current?.click()} disabled={uploadingTreasurerSig}>
                {uploadingTreasurerSig ? 'Subiendo...' : 'Cargar firma del Tesorero'}
              </Button>
            </div>
            {/* Firma del V.M. */}
            <div className="space-y-3">
              <Label>Firma del Venerable Maestro</Label>
              <div className="w-full h-24 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden">
                {settings.vm_signature_url ? (
                  <img src={settings.vm_signature_url} alt="Firma V.M." className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin firma cargada</span>
                )}
              </div>
              <input ref={vmSigRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSignatureUpload('vm', e)} />
              <Button variant="outline" size="sm" className="w-full" onClick={() => vmSigRef.current?.click()} disabled={uploadingVMSig}>
                {uploadingVMSig ? 'Subiendo...' : 'Cargar firma del V.M.'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Las firmas se aplicarán automáticamente en todos los documentos generados</p>
        </CardContent>
      </Card>

      {/* Periodo Logial */}
      <Card>
        <CardHeader>
          <CardTitle>Periodo Logial</CardTitle>
          <CardDescription>Información del periodo logial actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Periodo Logial:</span>
              <span className="font-bold">Julio {currentCalendarYear} - Junio {nextCalendarYear}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mes de inicio:</span>
              <span className="font-medium">Julio {currentCalendarYear}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mes de cierre:</span>
              <span className="font-medium">Junio {nextCalendarYear}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo inicial del periodo:</span>
              <span className={`font-bold ${initialBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${initialBalance.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              El saldo inicial se calcula automáticamente como: Total ingresos - Total gastos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plantillas de Informes */}
      <Card>
        <CardHeader>
          <CardTitle>Plantillas de Informes</CardTitle>
          <CardDescription>Texto institucional que aparece en los informes PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="monthly-template">Texto para Informe Mensual</Label>
              <Textarea id="monthly-template" value={monthlyReportTemplate} onChange={e => setMonthlyReportTemplate(e.target.value)} rows={5} placeholder="Texto introductorio del informe mensual..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual-template">Texto para Informe Anual</Label>
              <Textarea id="annual-template" value={annualReportTemplate} onChange={e => setAnnualReportTemplate(e.target.value)} rows={5} placeholder="Texto introductorio del informe anual..." />
            </div>
          </div>
          <Button onClick={handleSaveReportTemplates} className="w-full" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Plantillas de Informes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

export default Settings;
