import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create service client for server-side operations (with elevated permissions)
export const supabaseService = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Create client for user operations
export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  isAdmin: boolean;
}

/**
 * Verify authentication token and return user information
 */
export async function verifyAuth(request: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  error?: string;
}> {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('sb-access-token')?.value;
    
    const token = authHeader?.replace('Bearer ', '') || cookieToken;
    
    if (!token) {
      return { user: null, error: 'No authentication token provided' };
    }

    if (!supabaseClient) {
      return { user: null, error: 'Authentication service not configured' };
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: 'Invalid or expired token' };
    }

    // Check if user profile exists and get role
    let role = 'user';
    let isAdmin = false;

    if (supabaseService) {
      const { data: profile } = await supabaseService
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role) {
        role = profile.role;
        isAdmin = role === 'admin';
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        role,
        isAdmin
      }
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { user: null, error: 'Authentication verification failed' };
  }
}

/**
 * Require authentication for API routes
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: AuthenticatedUser;
  error?: never;
} | {
  user?: never;
  error: Response;
}> {
  const { user, error } = await verifyAuth(request);
  
  if (!user || error) {
    return {
      error: new Response(
        JSON.stringify({ error: error || 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  return { user };
}

/**
 * Require admin authentication for API routes
 */
export async function requireAdmin(request: NextRequest): Promise<{
  user: AuthenticatedUser;
  error?: never;
} | {
  user?: never;
  error: Response;
}> {
  const { user, error } = await verifyAuth(request);
  
  if (!user || error) {
    return {
      error: new Response(
        JSON.stringify({ error: error || 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  if (!user.isAdmin) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }

  return { user };
}

/**
 * Rate limiting using in-memory store (for production, use Redis or database)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string, 
  limit: number = 10, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean up old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < windowStart) {
      rateLimitStore.delete(k);
    }
  }
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < windowStart) {
    // New window
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  } else {
    // Existing window
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    } else {
      entry.count++;
      return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
    }
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
