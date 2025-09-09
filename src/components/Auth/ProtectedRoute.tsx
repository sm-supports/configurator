"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireAdmin = false,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading, isSessionValid } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Check authentication requirement
      if (requireAuth && (!user || !isSessionValid)) {
        const url = new URL(redirectTo, window.location.origin);
        url.searchParams.set('redirectTo', window.location.pathname);
        router.push(url.toString());
        return;
      }

      // Check admin requirement (placeholder - would need user role data)
      if (requireAdmin && user) {
        // In a real implementation, you'd check user.role or fetch from database
        // For now, we'll assume admin check is handled elsewhere
        // You can extend this with actual role checking logic
      }
    }
  }, [user, loading, isSessionValid, requireAuth, requireAdmin, redirectTo, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show session invalid warning
  if (requireAuth && user && !isSessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-gray-600 mb-4">
            Your session has expired for security reasons. Please sign in again to continue.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  // If auth is required and user is not logged in, don't render children
  if (requireAuth && !user) {
    return null;
  }

  // If admin is required and user is not admin, show access denied
  if (requireAdmin && user) {
    // This would need to be implemented with actual role checking
    // For now, we'll assume it's handled by the parent component
  }

  // If auth is not required or user is properly authenticated, render children
  return <>{children}</>;
}
