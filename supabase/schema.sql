-- Customer memory shared by every channel (Telegram, Instagram, email, website, Slack).
-- Run this once in the Supabase project: SQL Editor -> New query -> paste -> Run.
--
-- A customer is a person. Every way of reaching them - a Telegram chat, an Instagram sender id, an
-- email address, a website cookie - is a row in customer_channels, so one person can have several
-- of the same kind (two email addresses, two Telegram accounts) with no special case.
--
-- Channels are linked either automatically (the id is in the conversation id) or by the person
-- themselves: they sign in on the website, get a short code, and send it from the channel.

create extension if not exists "pgcrypto";

-- Safe to run as-is: these tables hold demo data only, and the email address moved out of
-- `customers` into `customer_channels`, so the old shape cannot simply be altered in place.
drop table if exists customer_notes cascade;
drop table if exists customer_conversations cascade;
drop table if exists link_codes cascade;
drop table if exists customer_channels cascade;
drop table if exists customers cascade;

create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,                 -- the Supabase Auth user, when they have signed up
  name         text,
  created_at   timestamptz not null default now()
);

create table if not exists customer_channels (
  channel     text not null,                -- telegram | instagram | email | website | slack
  channel_key text not null,                -- chat id, sender id, email address, cookie, ...
  customer_id uuid not null references customers (id) on delete cascade,
  verified    boolean not null default false, -- true when linked with a code or a signed-in session
  created_at  timestamptz not null default now(),
  primary key (channel, channel_key)
);

create index if not exists customer_channels_customer_idx on customer_channels (customer_id);

-- Short codes a signed-in person sends from a channel to prove it is theirs.
create table if not exists link_codes (
  code         text primary key,
  customer_id  uuid not null references customers (id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_at      timestamptz,
  used_channel text,
  used_key     text
);

create index if not exists link_codes_customer_idx on link_codes (customer_id);

-- Which customer a conversation belongs to, so the post-call webhook knows where to file its note.
create table if not exists customer_conversations (
  conversation_id text primary key,
  customer_id     uuid not null references customers (id) on delete cascade,
  channel         text,
  created_at      timestamptz not null default now()
);

-- The memory itself: one short line per conversation.
create table if not exists customer_notes (
  id          bigint generated always as identity primary key,
  customer_id uuid not null references customers (id) on delete cascade,
  channel     text,
  summary     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists customer_notes_recent_idx on customer_notes (customer_id, created_at desc);

-- Row level security on with no policies: only the service role key (server side) can read or
-- write. The publishable key cannot see anything, which is what we want for customer data.
alter table customers              enable row level security;
alter table customer_channels      enable row level security;
alter table link_codes             enable row level security;
alter table customer_conversations enable row level security;
alter table customer_notes         enable row level security;
