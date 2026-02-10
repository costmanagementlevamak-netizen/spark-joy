import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client-unsafe';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'user';

interface UseUserRoleReturn {
  role: AppRole | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('user'); // Default to user on error
      } else {
        setRole((data?.role as AppRole) || 'user');
      }
      setLoading(false);
    };

    fetchRole();
  }, [user?.id]);

  return {
    role,
    isAdmin: role === 'admin',
    loading,
  };
}

/**
 * Hook that provides a guard function for admin-only actions.
 * Shows a toast message when a non-admin user tries to perform an action.
 */
export function useAdminGuard() {
  const { isAdmin } = useUserRole();
  const { toast } = require('@/hooks/use-toast');

  const guardAction = (action: () => void, actionName?: string) => {
    if (!isAdmin) {
      toast.toast({
        title: 'Acción no permitida',
        description: actionName 
          ? `No tiene permisos para ${actionName}. Solo los administradores pueden realizar esta acción.`
          : 'Solo los administradores pueden realizar esta acción. Contacte al administrador si necesita acceso.',
        variant: 'destructive',
      });
      return;
    }
    action();
  };

  return { guardAction, isAdmin };
}
