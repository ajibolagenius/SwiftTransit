// delete-account: NDPA in-app account deletion (spec 0002 task 8; AC-9).
// The caller authenticates with their own access token; the function then
// uses the service role to remove that user's Storage objects by path
// prefix, then the auth user. ON DELETE CASCADE removes every related row
// (profile, applications, status, addresses, orders, events, messages,
// ledger). POST /functions/v1/delete-account, Authorization: Bearer <user JWT>.

import { Client } from 'https://esm.sh/@supabase/supabase-js@2';

const buckets = ['avatars', 'package-photos', 'licences'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) {
    return Response.json({ error: 'swifttransit.auth.no_session' }, { status: 401 });
  }

  // Verify the caller's own JWT before acting on their data.
  const userClient = new Client(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ error: 'swifttransit.auth.invalid_session' }, { status: 401 });
  }
  const uid = userData.user.id;

  const admin = new Client(url, serviceKey, {
    auth: { persistSession: false },
  });

  // Storage objects live under {user_id}/ in each private bucket.
  for (const bucket of buckets) {
    const { data: objects } = await admin.storage.from(bucket).list(uid, { limit: 1000 });
    if (objects) {
      const paths = objects.map((o) => `${uid}/${o.name}`);
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) {
        return Response.json({ error: 'swifttransit.storage.delete_failed' }, { status: 500 });
      }
    }
  }

  // Deleting the auth user cascades every app row via the FK graph.
  const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
  if (deleteError) {
    return Response.json({ error: 'swifttransit.account.delete_failed' }, { status: 500 });
  }

  return Response.json({ deleted: true });
});
