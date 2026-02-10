import { supabase as supabaseTyped } from "@/integrations/supabase/client";

/**
 * Temporary escape hatch: the generated Database types currently have no tables,
 * which makes `supabase.from('table')` resolve to `never` and breaks builds.
 *
 * This keeps runtime behavior identical while we add the actual database schema.
 */
export const supabase = supabaseTyped as unknown as any;
