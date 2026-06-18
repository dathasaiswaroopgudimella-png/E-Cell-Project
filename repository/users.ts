import { supabaseAdmin } from '@/services/supabase';
import { User } from '@/types';

export async function createUser(id: string, email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{ id, email }])
    .select()
    .single();

  if (error) {
    console.error('Error in createUser repository:', error);
    return null;
  }
  return {
    id: data.id,
    email: data.email,
    createdAt: data.createdAt,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error in getUserById repository:', error);
    return null;
  }
  return {
    id: data.id,
    email: data.email,
    createdAt: data.createdAt,
  };
}
