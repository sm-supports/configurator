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
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function makeUserAdmin(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('admin_users')
      .insert({ user_id: userId });

    return !error;
  } catch (error) {
    console.error('Error making user admin:', error);
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
  } catch (error) {
    console.error('Error removing admin status:', error);
    return false;
  }
}
