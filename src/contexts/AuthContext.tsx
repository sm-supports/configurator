"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSessionValid: boolean;
  lastActivity: Date | null;
  role: string | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout configuration (30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity time
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
    setShowSessionWarning(false);
  }, []);

  // Handle session timeout
  const handleSessionTimeout = useCallback(async () => {
    setIsSessionValid(false);
  await signOut();
    router.push('/login?timeout=true');
  }, [router]);

  // Show session warning
  const showWarning = useCallback(() => {
    setShowSessionWarning(true);
  }, []);

  // Reset session timeout
  const resetSessionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    if (session && isSessionValid) {
      // Set warning timeout
      warningTimeoutRef.current = setTimeout(showWarning, SESSION_TIMEOUT - WARNING_TIME);
      
      // Set session timeout
      timeoutRef.current = setTimeout(handleSessionTimeout, SESSION_TIMEOUT);
    }
  }, [session, isSessionValid, showWarning, handleSessionTimeout]);

  // Track user activity
  useEffect(() => {
    if (!session) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
      resetSessionTimeout();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial activity tracking
    updateActivity();
    resetSessionTimeout();

    return () => {
      // Cleanup event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [session, updateActivity, resetSessionTimeout]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Validate session is not expired
          const now = Math.floor(Date.now() / 1000);
          const sessionExp = session.expires_at ?? 0; // seconds since epoch
          
          if (sessionExp > now) {
            setSession(session);
            setUser(session.user);
            setIsSessionValid(true);
            // Determine admin via admin_users table
            try {
              const { data: adminRow, error: adminErr } = await supabase
                .from('admin_users')
                .select('id')
                .eq('user_id', session.user.id)
                .maybeSingle();
              const isAdminFlag = !!adminRow && !adminErr;
              setIsAdmin(isAdminFlag);
              setRole(isAdminFlag ? 'admin' : 'user');
            } catch {
              setIsAdmin(false);
              setRole('user');
            }
            // Sync HttpOnly cookies for middleware protection
            try {
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at,
                }),
                credentials: 'include',
              });
            } catch (e) {
              console.error('Cookie sync failed on init:', e);
            }
          } else {
            // Session expired, clear it
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsSessionValid(false);
            try {
              await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
            } catch {}
          }
        } else {
          setSession(null);
          setUser(null);
          setIsSessionValid(false);
          setRole(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setSession(null);
        setUser(null);
        setIsSessionValid(false);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setIsSessionValid(false);
          setLastActivity(null);
          setShowSessionWarning(false);
          
          // Clear timeouts
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
          }
          // Clear HttpOnly cookies
          try {
            await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
          } catch {}
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Validate session is not expired
          const now = Math.floor(Date.now() / 1000);
          const sessionExp = session.expires_at ?? 0;
          
          if (sessionExp > now) {
            setSession(session);
            setUser(session.user);
            setIsSessionValid(true);
            updateActivity();
            try {
              const { data: adminRow, error: adminErr } = await supabase
                .from('admin_users')
                .select('id')
                .eq('user_id', session.user.id)
                .maybeSingle();
              const isAdminFlag = !!adminRow && !adminErr;
              setIsAdmin(isAdminFlag);
              setRole(isAdminFlag ? 'admin' : 'user');
            } catch {
              setIsAdmin(false);
              setRole('user');
            }
            // Sync HttpOnly cookies for middleware protection
            try {
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at,
                }),
                credentials: 'include',
              });
            } catch (e) {
              console.error('Cookie sync failed:', e);
            }
          } else {
            // Session expired
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsSessionValid(false);
            try {
              await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
            } catch {}
          }
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [updateActivity]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsSessionValid(false);
      setLastActivity(null);
      setShowSessionWarning(false);
  setRole(null);
  setIsAdmin(false);
      
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      try {
        await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
      } catch {}
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        setUser(user);
        updateActivity();
        // refresh admin flag
        try {
          const { data: adminRow, error: adminErr } = await supabase
            .from('admin_users')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          const isAdminFlag = !!adminRow && !adminErr;
          setIsAdmin(isAdminFlag);
          setRole(isAdminFlag ? 'admin' : 'user');
        } catch {
          setIsAdmin(false);
          setRole('user');
        }
      } else {
        await signOut();
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      await signOut();
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshUser,
    isSessionValid,
    lastActivity,
  role,
  isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Session Warning Modal */}
      {showSessionWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Session Expiring Soon
            </h3>
            <p className="text-gray-600 mb-4">
              Your session will expire in 5 minutes due to inactivity. 
              Click anywhere to continue your session.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  updateActivity();
                  resetSessionTimeout();
                  setShowSessionWarning(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue Session
              </button>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
