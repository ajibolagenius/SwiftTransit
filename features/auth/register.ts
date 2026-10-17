import type { Role } from './guards';
import { supabase } from '@/lib/supabase';

export type RegisterProblem = 'email_taken' | 'failed';

// Spec 0003 registration rule: a phone-only account writes its optional email through
// updateUser first, then complete_registration runs unchanged. Email/OAuth accounts
// already carry their email on auth.users (the field is read-only there).
export async function completeRegistration(input: {
  firstName: string;
  lastName: string;
  role: Role;
  email?: string;
}): Promise<RegisterProblem | null> {
  const { data: current } = await supabase.auth.getUser();
  if (!current.user) return 'failed';

  if (!current.user.email && input.email) {
    const { error } = await supabase.auth.updateUser({ email: input.email });
    if (error) {
      return error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('taken')
        ? 'email_taken'
        : 'failed';
    }
  }

  const { error } = await supabase.rpc('complete_registration', {
    first_name: input.firstName,
    last_name: input.lastName,
    role: input.role,
  });
  if (error) return 'failed';
  return null;
}
