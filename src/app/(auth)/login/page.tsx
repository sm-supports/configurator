"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft, AlertTriangle } from 'lucide-react';
import { isValidEmail } from '@/lib/authUtils';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const isTimedOut = searchParams.get('timeout') === 'true';
  const rawRedirect = searchParams.get('redirectTo') || '/templates';
  // Safe redirect: only allow same-origin relative paths
  const redirectTo = rawRedirect.startsWith('/') ? rawRedirect : '/templates';

  // Handle lockout timer
  useEffect(() => {
    if (lockoutUntil) {
      const timer = setInterval(() => {
        const now = Date.now();
        if (now >= lockoutUntil) {
          setLockoutUntil(null);
          setAttempts(0);
          setTimeLeft(0);
        } else {
          setTimeLeft(Math.ceil((lockoutUntil - now) / 1000));
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [lockoutUntil]);

  // Load stored lockout info
  useEffect(() => {
    const stored = localStorage.getItem('login_attempts');
    if (stored) {
      const { attempts: storedAttempts, lockoutUntil: storedLockout } = JSON.parse(stored);
      if (storedLockout && Date.now() < storedLockout) {
        setAttempts(storedAttempts);
        setLockoutUntil(storedLockout);
      } else {
        localStorage.removeItem('login_attempts');
      }
    }
  }, []);

  const handleFailedAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockout = Date.now() + LOCKOUT_DURATION;
      setLockoutUntil(lockout);
      localStorage.setItem('login_attempts', JSON.stringify({
        attempts: newAttempts,
        lockoutUntil: lockout
      }));
      setError(`Too many failed attempts. Please try again in 15 minutes.`);
    } else {
      localStorage.setItem('login_attempts', JSON.stringify({
        attempts: newAttempts,
        lockoutUntil: null
      }));
      setError(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
    }
  };

  const clearAttempts = () => {
    setAttempts(0);
    setLockoutUntil(null);
    localStorage.removeItem('login_attempts');
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Check if user is locked out
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setError(`Account temporarily locked. Try again in ${Math.ceil(timeLeft / 60)} minutes.`);
      return;
    }

    // Validate input
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email: email.toLowerCase().trim(), 
        password 
      });

      if (signInError) {
        console.error('Login error:', signInError);
        
        // Handle specific error types
        if (signInError.message.includes('Invalid login credentials')) {
          handleFailedAttempt();
        } else if (signInError.message.includes('too_many_requests')) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else if (signInError.message.includes('email_not_confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      // Successful login
      if (data.user) {
        clearAttempts();
        
        // Verify session is properly established
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          // Sync HttpOnly cookies for middleware/server protection
          try {
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: session.session.access_token,
                refresh_token: session.session.refresh_token,
                expires_at: session.session.expires_at,
              }),
              credentials: 'include',
            });
          } catch (e) {
            console.error('Cookie sync failed on login:', e);
          }
          router.push(redirectTo);
        } else {
          setError('Session could not be established. Please try again.');
        }
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your account to continue designing
          </p>
        </div>

        {/* Session Timeout Warning */}
        {isTimedOut && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
              <div className="text-sm text-amber-800">
                Your session has expired due to inactivity. Please sign in again.
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              </div>
            )}

            {/* Lockout Warning */}
            {lockoutUntil && timeLeft > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                  <div className="text-sm text-orange-800">
                    Account temporarily locked for security. Time remaining: {formatTime(timeLeft)}
                  </div>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  required
                  disabled={loading || (lockoutUntil !== null && timeLeft > 0)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  required
                  disabled={loading || (lockoutUntil !== null && timeLeft > 0)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || (lockoutUntil !== null && timeLeft > 0)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (lockoutUntil !== null && timeLeft > 0)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Signing in...
                </>
              ) : lockoutUntil && timeLeft > 0 ? (
                `Locked (${formatTime(timeLeft)})`
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link 
                href="/register" 
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link 
              href="/" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
