import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock client if environment variables are missing
const createMockClient = () => {
  console.warn('Supabase environment variables not found. Using mock client.');
  return {
    auth: {
      signInWithPassword: async () => ({ error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ error: { message: 'Supabase not configured' } }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => ({ data: null, error: { message: 'Supabase not configured' } }) }) }),
      insert: () => ({ error: { message: 'Supabase not configured' } }),
      update: () => ({ eq: () => ({ error: { message: 'Supabase not configured' } }) }),
      delete: () => ({ eq: () => ({ error: { message: 'Supabase not configured' } }) }),
    }),
  } as unknown as ReturnType<typeof createClient>;
};

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();
