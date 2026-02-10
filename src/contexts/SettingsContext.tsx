import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';

export interface AppSettings {
  id: string;
  institution_name: string;
  monthly_fee_base: number;
  monthly_report_template: string;
  annual_report_template: string;
  logo_url: string | null;
  treasurer_id: string | null;
  treasurer_signature_url: string | null;
  vm_signature_url: string | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  institution_name: 'Logia',
  monthly_fee_base: 50,
  monthly_report_template: 'Este informe presenta el resumen financiero correspondiente al período indicado, con datos reales registrados en el sistema de tesorería.',
  annual_report_template: 'Este informe presenta el resumen financiero anual consolidado del período fiscal, incluyendo el detalle de ingresos, egresos y balance general.',
  logo_url: null,
  treasurer_id: null,
  treasurer_signature_url: null,
  vm_signature_url: null,
};

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  updateSettings: async () => {},
  refresh: async () => {},
});

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

// Global settings cache
let globalSettings: AppSettings | null = null;
let settingsPromise: Promise<AppSettings> | null = null;
const subscribers = new Set<(settings: AppSettings) => void>();

function mapRow(data: any): AppSettings {
  return {
    id: data.id,
    institution_name: data.institution_name || DEFAULT_SETTINGS.institution_name,
    monthly_fee_base: data.monthly_fee_base ?? DEFAULT_SETTINGS.monthly_fee_base,
    monthly_report_template: data.monthly_report_template || DEFAULT_SETTINGS.monthly_report_template,
    annual_report_template: data.annual_report_template || DEFAULT_SETTINGS.annual_report_template,
    logo_url: data.logo_url || null,
    treasurer_id: data.treasurer_id || null,
    treasurer_signature_url: data.treasurer_signature_url || null,
    vm_signature_url: data.vm_signature_url || null,
  };
}

async function fetchSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }

    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from('settings')
        .insert([{
          institution_name: DEFAULT_SETTINGS.institution_name,
          monthly_fee_base: DEFAULT_SETTINGS.monthly_fee_base,
          monthly_report_template: DEFAULT_SETTINGS.monthly_report_template,
          annual_report_template: DEFAULT_SETTINGS.annual_report_template,
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting default settings:', insertError);
        return DEFAULT_SETTINGS;
      }
      return mapRow(inserted);
    }

    return mapRow(data);
  } catch (error) {
    console.error('Error in fetchSettings:', error);
    return DEFAULT_SETTINGS;
  }
}

function notifySubscribers(settings: AppSettings) {
  subscribers.forEach(fn => fn(settings));
}

export async function getGlobalSettings(): Promise<AppSettings> {
  if (globalSettings) return globalSettings;
  if (settingsPromise) return settingsPromise;

  settingsPromise = fetchSettings();
  globalSettings = await settingsPromise;
  settingsPromise = null;
  return globalSettings;
}

export async function refreshGlobalSettings(): Promise<AppSettings> {
  globalSettings = null;
  settingsPromise = null;
  const settings = await getGlobalSettings();
  notifySubscribers(settings);
  return settings;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(globalSettings || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!globalSettings);

  useEffect(() => {
    const subscriber = (newSettings: AppSettings) => setSettings(newSettings);
    subscribers.add(subscriber);

    if (globalSettings) {
      setSettings(globalSettings);
      setLoading(false);
    } else {
      getGlobalSettings()
        .then(s => { setSettings(s); setLoading(false); })
        .catch(() => { setSettings(DEFAULT_SETTINGS); setLoading(false); });
    }

    return () => { subscribers.delete(subscriber); };
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    // Always use the latest global settings to avoid stale state overwrites
    const latestSettings = globalSettings || settings;
    let currentId = latestSettings.id;
    if (!currentId || currentId === 'default') {
      const freshSettings = await refreshGlobalSettings();
      if (!freshSettings.id || freshSettings.id === 'default') {
        throw new Error('No se encontró configuración válida en la base de datos');
      }
      currentId = freshSettings.id;
    }

    const newSettings = { ...latestSettings, ...updates, id: currentId };
    setSettings(newSettings);
    globalSettings = newSettings;
    notifySubscribers(newSettings);

    // Build update payload with only defined fields
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    const fields = [
      'institution_name', 'monthly_fee_base', 'monthly_report_template',
      'annual_report_template', 'logo_url', 'treasurer_id',
      'treasurer_signature_url', 'vm_signature_url'
    ] as const;
    for (const key of fields) {
      if (key in updates) payload[key] = (updates as any)[key];
    }

    const { error } = await supabase
      .from('settings')
      .update(payload as any)
      .eq('id', currentId);

    if (error) {
      console.error('Error saving settings:', error);
      await refreshGlobalSettings();
      throw error;
    }

    await refreshGlobalSettings();
  }, []);

  const refresh = useCallback(async () => {
    const newSettings = await refreshGlobalSettings();
    setSettings(newSettings);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}
