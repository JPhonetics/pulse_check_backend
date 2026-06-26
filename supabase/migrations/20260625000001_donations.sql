create table public.donations (
  id                       uuid not null default gen_random_uuid(),
  created_on               timestamptz not null default now(),
  user_id                  uuid null references auth.users(id),
  guest_token              character varying null,
  amount                   integer not null,
  stripe_payment_intent_id text not null unique,
  status                   character varying not null
                             check (status in ('succeeded', 'failed')),
  constraint donations_pkey primary key (id),
  constraint donations_owner_check check (
    (user_id is not null and guest_token is null) or
    (user_id is null and guest_token is not null)
  )
);

alter table public.donations enable row level security;

create policy "users can view own donations"
  on public.donations for select
  to authenticated
  using (user_id = auth.uid());
