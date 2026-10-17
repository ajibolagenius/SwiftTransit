import { supabase } from '@/lib/supabase';

// Spec 0003 API surface: OTP send and verify for both channels.
// A phone must already be E.164 (features/auth/phone.ts).

export async function sendPhoneOtp(e164: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
  if (error) throw error;
}

export async function verifyPhoneOtp(e164: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ phone: e164, token, type: 'sms' });
  if (error) throw error;
}

// One path signs up and signs in; "Confirm email" is off in the dashboard (spec 0003 security model).
export async function sendEmailOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}
