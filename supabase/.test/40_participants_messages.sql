-- AC-3, AC-4: order participants. Events and messages visible only to the
-- customer and assigned courier of that order; message rules.

begin;
select _test.base_fixtures();
select _test.paid_searching_order('part-1');

-- Assign C1 to the order (sanctioned service path for fixture setup).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select public.assign_order(_test.order_id('part-1'));

-- Customer A reads events and sends a message on the live order.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_true('A sees events of own order',
  (select count(*) from public.order_events) >= 3);
insert into public.messages (order_id, sender_id, body)
select id, '00000000-0000-4000-8000-0000000000c1'::uuid, 'The package is ready'
from public.orders where idempotency_key = 'part-1';

-- Courier C1 reads the message (participant) and replies.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}';
select _test.expect_eq('C1 sees the order messages', (select count(*) from public.messages), 1);
insert into public.messages (order_id, sender_id, body)
select id, '00000000-0000-4000-8000-0000000000c3'::uuid, 'On the way'
from public.orders where idempotency_key = 'part-1';

-- Customer B (no shared order) reads nothing and cannot post.
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}';
select _test.expect_eq('B sees no messages', (select count(*) from public.messages), 0);
select _test.expect_eq('B sees no events', (select count(*) from public.order_events), 0);
select _test.expect_refused('B posts to a stranger order',
  'insert into public.messages (order_id, sender_id, body)
   values (_test.order_id(''part-1''),
           ''00000000-0000-4000-8000-0000000000c2''::uuid, ''intruder'')');

-- Sender spoofing is refused (WITH CHECK pins sender_id).
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';
select _test.expect_refused('A cannot send as C1',
  'insert into public.messages (order_id, sender_id, body)
   values (_test.order_id(''part-1''),
           ''00000000-0000-4000-8000-0000000000c3''::uuid, ''fake'')');

rollback;
