import { supabase, friendlyError } from '@/lib/supabase'

export interface StaffRole { email: string; full_name: string; role: string }

export async function listStaffRoles(): Promise<StaffRole[]> {
  const { data, error } = await supabase.from('user_roles').select('email, full_name, role').order('role').order('email')
  if (error) throw new Error(friendlyError(error))
  return data ?? []
}
export async function addStaffRole(email: string, fullName: string, role: string) {
  const { error } = await supabase.from('user_roles').insert({ email: email.trim().toLowerCase(), full_name: fullName.trim(), role })
  if (error) throw new Error(friendlyError(error))
}
export async function removeStaffRole(email: string) {
  const { error } = await supabase.from('user_roles').delete().eq('email', email)
  if (error) throw new Error(friendlyError(error))
}
