-- Shared assertion helpers for the policy test suite (spec 0002 task 3).
-- Loaded once per run before the test scripts. Test scripts run as the
-- superuser for fixtures, then `set local role authenticated` mid-transaction,
-- so volatile helpers here must be SECURITY DEFINER to keep raising cleanly.

create schema if not exists _test;

grant usage on schema _test to anon, authenticated;

-- Test scripts impersonate roles, so a courier cannot SELECT an unassigned
-- order to find its id. This definer lookup bridges that, test side only.
create or replace function _test.order_id(p_key text) returns uuid
language sql security definer set search_path = public as
$$ select id from public.orders where idempotency_key = p_key $$;

create or replace function _test.expect_eq(label text, actual bigint, expected bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(actual, -1) is distinct from expected then
    raise exception 'POLICY TEST FAILED: % — expected %, got %', label, expected, coalesce(actual, -1);
  end if;
end;
$$;

create or replace function _test.expect_true(label text, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(ok, false) then
    raise exception 'POLICY TEST FAILED: %', label;
  end if;
end;
$$;

-- expect_refused is deliberately SECURITY INVOKER: the statement must run as
-- the impersonated client role, not as the function owner.
create or replace function _test.expect_refused(label text, statement text) returns void
language plpgsql security invoker set search_path = public as $$
begin
  begin
    execute statement;
  exception
    when insufficient_privilege or undefined_column
      or integrity_constraint_violation or raise_exception then
      return; -- expected refusal (policy, grant, constraint, or function error key)
  end;
  raise exception 'POLICY TEST FAILED: % — expected refusal, statement succeeded', label;
end;
$$;
