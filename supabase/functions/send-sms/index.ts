// send-sms: Supabase Send SMS hook (spec 0001 §SMS; spec 0003 task 3; AC-2, AC-4).
// Supabase generates, stores, rate limits and expires the OTP; this hook only delivers it.
// The dashboard calls the function on every phone OTP with `Authorization: Bearer
// <SEND_SMS_HOOK_SECRET>`; demo numbers skip Termii so a reviewer without a Nigerian SIM can
// still sign in via the Supabase test OTP mapping. Provider swap touches this one file.
//
// Deploy: `supabase functions deploy send-sms --no-verify-jwt` and set the Edge Function
// secrets TERMII_API_KEY, TERMII_SENDER_ID, SEND_SMS_HOOK_SECRET, DEMO_PHONE_NUMBERS.
// Then point the Send SMS hook (dashboard > Auth > Hooks) at this URL with the bearer secret.

const TERMII_URL = 'https://api.termii.com/api/sms/send';

type HookBody = {
  user?: { phone?: string };
  phone?: string;
  sms?: { otp?: string };
};

// Constant time compare so a wrong secret costs the same as a right prefix.
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const secret = Deno.env.get('SEND_SMS_HOOK_SECRET');
  const presented = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!secret || !sameSecret(presented, secret)) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: HookBody;
  try {
    body = (await req.json()) as HookBody;
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const to = body.phone ?? body.user?.phone;
  const otp = body.sms?.otp;
  if (!to || !otp) {
    return new Response('missing phone or otp', { status: 400 });
  }

  // Demo accounts verify against a fixed test OTP; never spend SMS credit on them.
  const demo = (Deno.env.get('DEMO_PHONE_NUMBERS') ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  if (demo.includes(to)) {
    return Response.json({ sent: false, reason: 'demo_number' });
  }

  const apiKey = Deno.env.get('TERMII_API_KEY');
  const senderId = Deno.env.get('TERMII_SENDER_ID');
  if (!apiKey || !senderId) {
    return new Response('termii not configured', { status: 500 });
  }

  const upstream = await fetch(TERMII_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      from: senderId,
      sms: { message: `Your SwiftTransit code is ${otp}. It expires in 5 minutes.` },
      type: 'plain',
      api_key: apiKey,
    }),
  });

  if (!upstream.ok) {
    // Returning a failure lets Supabase retry; the OTP stays valid until its own expiry.
    const detail = await upstream.text().catch(() => '');
    return new Response(`termii send failed: ${upstream.status} ${detail}`, { status: 502 });
  }

  return Response.json({ sent: true });
});
