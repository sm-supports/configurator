import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock client if environment variables are missing
const createMockClient = () => {
  // Supabase not configured - using mock client
  
  return {
    auth: {
      signInWithPassword: async () => ({ 
        error: { message: 'Authentication is not configured. Please set up Supabase environment variables.' } 
      }),
      signUp: async () => ({ 
        error: { message: 'Authentication is not configured. Please set up Supabase environment variables.' } 
      }),
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          single: () => ({ data: null, error: { message: 'Database not configured' } }) 
        }) 
      }),
      insert: () => ({ error: { message: 'Database not configured' } }),
      update: () => ({ eq: () => ({ error: { message: 'Database not configured' } }) }),
      delete: () => ({ eq: () => ({ error: { message: 'Database not configured' } }) }),
    }),
  } as unknown as ReturnType<typeof createClient>;
};

if (!supabaseUrl || !supabaseAnonKey) {
  // Supabase environment variables not found - using mock client
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();
