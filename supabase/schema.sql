-- بدّي وبدّك (Baddi w Baddak): Complete Supabase Postgres Schema, RLS, Triggers, RPCs & Storage
-- نفّذ هذا الملف كاملاً في Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ============ HELPER FUNCTIONS ============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  city text not null default 'دمشق',
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_banned boolean not null default false,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_banned = false
  );
$$;

create or replace function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_banned from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Auto-create profile when a user signs up via Supabase Auth (Phone OTP)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, city)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'مستخدم جديد'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'city'), ''), 'دمشق')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent non-admin users from escalating role, unbanning, or forging ratings
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_banned := old.is_banned;
  end if;
  -- rating_avg and rating_count are maintained only by user_ratings trigger
  if current_setting('role', true) <> 'postgres' and not public.is_admin() then
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

-- ============ LISTINGS ============
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (char_length(trim(title)) between 2 and 120),
  description text,
  category text not null,
  city text not null,
  neighborhood text,
  offer_type text not null check (offer_type in ('sell', 'swap', 'both', 'gift')),
  price_syp bigint check (price_syp is null or price_syp >= 0),
  swap_preference text,
  accepts_cash_diff boolean not null default false,
  condition text not null default 'good' check (condition in ('new', 'like_new', 'good', 'fair')),
  contact_name text not null,
  status text not null default 'active' check (status in ('active', 'reserved', 'closed', 'hidden'))
);

create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_owner_idx on public.listings (owner_id, created_at desc);
create index if not exists listings_city_idx on public.listings (city);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_offer_type_idx on public.listings (offer_type);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- Protected contact phone table (never exposed on public listings queries)
create table if not exists public.listing_contacts (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  contact_phone text not null
);

-- ============ LISTING IMAGES ============
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx on public.listing_images (listing_id, sort_order asc);

-- ============ SWAP OFFERS ============
create table if not exists public.swap_offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  offered_item_title text not null check (char_length(trim(offered_item_title)) between 2 and 140),
  cash_diff_syp bigint check (cash_diff_syp is null or cash_diff_syp >= 0),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'completed'))
);

create index if not exists swap_offers_listing_idx on public.swap_offers (listing_id, created_at desc);
create index if not exists swap_offers_proposer_idx on public.swap_offers (proposer_id, created_at desc);

drop trigger if exists swap_offers_set_updated_at on public.swap_offers;
create trigger swap_offers_set_updated_at
  before update on public.swap_offers
  for each row execute function public.set_updated_at();

-- ============ FAVORITES ============
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);

-- ============ CONVERSATIONS & MESSAGES ============
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create index if not exists conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index if not exists conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at asc);

create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_last_message();

-- ============ VERIFIED USER RATINGS ============
create table if not exists public.user_ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references public.profiles (id) on delete cascade,
  rated_user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(trim(comment)) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rater_id, rated_user_id),
  check (rater_id <> rated_user_id)
);

create index if not exists user_ratings_rated_idx on public.user_ratings (rated_user_id, created_at desc);

drop trigger if exists user_ratings_set_updated_at on public.user_ratings;
create trigger user_ratings_set_updated_at
  before update on public.user_ratings
  for each row execute function public.set_updated_at();

create or replace function public.can_rate_user(p_rater_id uuid, p_rated_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_rater_id is not null
    and p_rater_id <> p_rated_user_id
    and (
      exists (
        select 1 from public.conversations c
        where (c.buyer_id = p_rater_id and c.seller_id = p_rated_user_id)
           or (c.seller_id = p_rater_id and c.buyer_id = p_rated_user_id)
      )
      or exists (
        select 1 from public.swap_offers s
        join public.listings l on l.id = s.listing_id
        where s.status in ('accepted', 'completed')
          and (
            (s.proposer_id = p_rater_id and l.owner_id = p_rated_user_id)
            or (l.owner_id = p_rater_id and s.proposer_id = p_rated_user_id)
          )
      )
    );
$$;

grant execute on function public.can_rate_user(uuid, uuid) to authenticated;

create or replace function public.sync_profile_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
begin
  v_target := coalesce(new.rated_user_id, old.rated_user_id);
  update public.profiles
  set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.user_ratings where rated_user_id = v_target), 0),
    rating_count = (select count(*)::int from public.user_ratings where rated_user_id = v_target)
  where id = v_target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists user_ratings_sync_stats on public.user_ratings;
create trigger user_ratings_sync_stats
  after insert or update or delete on public.user_ratings
  for each row execute function public.sync_profile_rating_stats();

-- ============ REPORTS ============
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ============ SECURE RPCs ============
-- Reveal listing phone number ONLY to authenticated users upon intentional click
create or replace function public.reveal_listing_phone(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_status text;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'يرجى تسجيل الدخول أولاً لإظهار رقم الهاتف';
  end if;

  if public.is_banned() then
    raise exception 'حسابك محظور ولا يمكنك الوصول لأرقام التواصل';
  end if;

  select l.status, l.owner_id, c.contact_phone
  into v_status, v_owner, v_phone
  from public.listings l
  join public.listing_contacts c on c.listing_id = l.id
  where l.id = p_listing_id;

  if v_phone is null then
    raise exception 'رقم الهاتف غير متوفر لهذا الإعلان';
  end if;

  if v_status <> 'active' and v_owner <> auth.uid() and not public.is_admin() then
    raise exception 'هذا الإعلان غير متاح حالياً';
  end if;

  return v_phone;
end;
$$;

grant execute on function public.reveal_listing_phone(uuid) to authenticated;

-- Atomic listing + contact creation
create or replace function public.create_listing_with_contact(
  p_title text,
  p_description text,
  p_category text,
  p_city text,
  p_neighborhood text,
  p_offer_type text,
  p_price_syp bigint,
  p_swap_preference text,
  p_accepts_cash_diff boolean,
  p_condition text,
  p_contact_name text,
  p_contact_phone text
)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول لنشر إعلان';
  end if;

  if public.is_banned() then
    raise exception 'حسابك محظور ولا يمكنك نشر إعلانات';
  end if;

  insert into public.listings (
    owner_id, title, description, category, city, neighborhood,
    offer_type, price_syp, swap_preference, accepts_cash_diff,
    condition, contact_name, status
  ) values (
    v_uid, trim(p_title), nullif(trim(p_description), ''), p_category, p_city,
    nullif(trim(p_neighborhood), ''), p_offer_type, p_price_syp,
    nullif(trim(p_swap_preference), ''), coalesce(p_accepts_cash_diff, false),
    p_condition, trim(p_contact_name), 'active'
  )
  returning * into v_listing;

  insert into public.listing_contacts (listing_id, owner_id, contact_phone)
  values (v_listing.id, v_uid, trim(p_contact_phone));

  return v_listing;
end;
$$;

grant execute on function public.create_listing_with_contact(
  text, text, text, text, text, text, bigint, text, boolean, text, text, text
) to authenticated;

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_contacts enable row level security;
alter table public.listing_images enable row level security;
alter table public.swap_offers enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.user_ratings enable row level security;
alter table public.reports enable row level security;

-- Profiles RLS
drop policy if exists "profiles_public_select" on public.profiles;
create policy "profiles_public_select" on public.profiles
  for select to anon, authenticated
  using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_self_or_admin_update" on public.profiles;
create policy "profiles_self_or_admin_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Listings RLS: active only for public, all statuses for owner & admin
drop policy if exists "listings_select_active_or_owner" on public.listings;
create policy "listings_select_active_or_owner" on public.listings
  for select to anon, authenticated
  using (status = 'active' or auth.uid() = owner_id or public.is_admin());

drop policy if exists "listings_owner_insert" on public.listings;
create policy "listings_owner_insert" on public.listings
  for insert to authenticated
  with check (auth.uid() = owner_id and not public.is_banned() and status = 'active');

drop policy if exists "listings_owner_or_admin_update" on public.listings;
create policy "listings_owner_or_admin_update" on public.listings
  for update to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "listings_owner_or_admin_delete" on public.listings;
create policy "listings_owner_or_admin_delete" on public.listings
  for delete to authenticated
  using (auth.uid() = owner_id or public.is_admin());

-- Listing contacts RLS: owner or admin only
drop policy if exists "listing_contacts_owner_select" on public.listing_contacts;
create policy "listing_contacts_owner_select" on public.listing_contacts
  for select to authenticated
  using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "listing_contacts_owner_insert" on public.listing_contacts;
create policy "listing_contacts_owner_insert" on public.listing_contacts
  for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "listing_contacts_owner_update" on public.listing_contacts;
create policy "listing_contacts_owner_update" on public.listing_contacts
  for update to authenticated
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

-- Listing images RLS
drop policy if exists "listing_images_select" on public.listing_images;
create policy "listing_images_select" on public.listing_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "listing_images_owner_insert" on public.listing_images;
create policy "listing_images_owner_insert" on public.listing_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "listing_images_owner_delete" on public.listing_images;
create policy "listing_images_owner_delete" on public.listing_images
  for delete to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

-- Swap offers RLS
drop policy if exists "swap_offers_select_participants" on public.swap_offers;
create policy "swap_offers_select_participants" on public.swap_offers
  for select to authenticated
  using (
    auth.uid() = proposer_id
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "swap_offers_insert_authenticated" on public.swap_offers;
create policy "swap_offers_insert_authenticated" on public.swap_offers
  for insert to authenticated
  with check (
    auth.uid() = proposer_id
    and not public.is_banned()
    and status = 'pending'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'active' and l.owner_id <> auth.uid()
    )
  );

drop policy if exists "swap_offers_update_participants" on public.swap_offers;
create policy "swap_offers_update_participants" on public.swap_offers
  for update to authenticated
  using (
    auth.uid() = proposer_id
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  )
  with check (
    auth.uid() = proposer_id
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- Favorites RLS
drop policy if exists "favorites_owner_all" on public.favorites;
create policy "favorites_owner_all" on public.favorites
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversations RLS: participants only
drop policy if exists "conversations_participants_select" on public.conversations;
create policy "conversations_participants_select" on public.conversations
  for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "conversations_buyer_insert" on public.conversations;
create policy "conversations_buyer_insert" on public.conversations
  for insert to authenticated
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and not public.is_banned()
  );

-- Messages RLS: conversation participants only
drop policy if exists "messages_participants_select" on public.messages;
create policy "messages_participants_select" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "messages_participants_insert" on public.messages;
create policy "messages_participants_insert" on public.messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and not public.is_banned()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "messages_participants_update_read" on public.messages;
create policy "messages_participants_update_read" on public.messages
  for update to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  )
  with check (is_read = true);

-- User Ratings RLS: public read, verified interaction write
drop policy if exists "user_ratings_public_select" on public.user_ratings;
create policy "user_ratings_public_select" on public.user_ratings
  for select to anon, authenticated
  using (true);

drop policy if exists "user_ratings_verified_insert" on public.user_ratings;
create policy "user_ratings_verified_insert" on public.user_ratings
  for insert to authenticated
  with check (
    auth.uid() = rater_id
    and not public.is_banned()
    and public.can_rate_user(auth.uid(), rated_user_id)
  );

drop policy if exists "user_ratings_verified_update" on public.user_ratings;
create policy "user_ratings_verified_update" on public.user_ratings
  for update to authenticated
  using (auth.uid() = rater_id)
  with check (
    auth.uid() = rater_id
    and not public.is_banned()
    and public.can_rate_user(auth.uid(), rated_user_id)
  );

-- Reports RLS
drop policy if exists "reports_reporter_or_admin_select" on public.reports;
create policy "reports_reporter_or_admin_select" on public.reports
  for select to authenticated
  using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "reports_authenticated_insert" on public.reports;
create policy "reports_authenticated_insert" on public.reports
  for insert to authenticated
  with check (auth.uid() = reporter_id and not public.is_banned());

drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update" on public.reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============ REALTIME ============
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- ============ STORAGE: listing-images ============
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listing-images');

drop policy if exists "listing_images_user_folder_upload" on storage.objects;
create policy "listing_images_user_folder_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing_images_user_folder_update" on storage.objects;
create policy "listing_images_user_folder_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing_images_user_folder_delete" on storage.objects;
create policy "listing_images_user_folder_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
