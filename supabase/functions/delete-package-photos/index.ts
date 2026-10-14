// delete-package-photos: nightly orphan photo sweep (spec 0002 task 7; AC-9).
// Deletes package-photos objects older than 7 days that no order references.
// Service-role only; scheduled by pg_cron (supabase/functions/_shared/cron-definitions.sql).

import { Client } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'package-photos';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  const token = req.headers.get('Authorization')?.split(' ')[1];
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!token || token !== serviceKey) {
    return new Response('unauthorized', { status: 401 });
  }

  const admin = new Client(Deno.env.get('SUPABASE_URL')!, serviceKey!, {
    auth: { persistSession: false },
  });

  const referenced = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data: orders, error } = await admin
      .from('orders')
      .select('package_photo_path')
      .not('package_photo_path', 'is', null)
      .range(from, from + 999);
    if (error) {
      return Response.json({ error: 'order scan failed', detail: error.message }, { status: 500 });
    }
    for (const row of orders ?? []) referenced.add(row.package_photo_path as string);
    if (!orders || orders.length < 1000) break;
  }

  const cutoff = Date.now() - MAX_AGE_MS;
  const stale: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: objects, error } = await admin.storage.from(BUCKET).list('', {
      limit: 1000,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      return Response.json({ error: 'storage scan failed', detail: error.message }, { status: 500 });
    }
    if (!objects || objects.length === 0) break;
    for (const o of objects) {
      const age = Date.parse((o as { created_at?: string }).created_at ?? '');
      if (Number.isFinite(age) && age < cutoff && !referenced.has(o.name)) stale.push(o.name);
    }
    if (objects.length < 1000) break;
  }

  let removed = 0;
  for (let i = 0; i < stale.length; i += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(stale.slice(i, i + 100));
    if (error) {
      return Response.json({ error: 'removal failed', detail: error.message }, { status: 500 });
    }
    removed += Math.min(100, stale.length - i);
  }

  return Response.json({ scanned: true, removed });
});
