import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { memo } from 'react';

export const ProtectedRoute = memo(function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Minimal loading state - no spinner, just brief check
  if (loading) {
    return (
      <div className="min-h-screen bg-background" />
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
});
