import { supabase } from './supabaseClient';

export async function checkAdminStatus(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    return !!adminUser;
  } catch {
    // Error checking admin status
    return false;
  }
}

export async function makeUserAdmin(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_users')
      .insert({ user_id: userId });

    return !error;
  } catch {
    // Error making user admin
    return false;
  }
}

export async function removeAdminStatus(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('user_id', userId);

    return !error;
  } catch {
    // Error removing admin status
    return false;
  }
}
