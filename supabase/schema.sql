-- Customer memory shared by every channel (Telegram, Instagram, email, website, Slack).
-- Run this once in the Supabase project: SQL Editor -> New query -> paste -> Run.
--
-- The email address is the bridge between channels: one customer row per email, and one
-- customer_channels row per channel key (Telegram chat id, Instagram sender id, cookie, ...).
-- A customer row only ever exists together with an email, so two rows never need merging.

create extension if not exists "pgcrypto";

create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists customer_channels (
  channel     text not null,
  channel_key text not null,
  customer_id uuid not null references customers (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (channel, channel_key)
);

create index if not exists customer_channels_customer_idx on customer_channels (customer_id);

-- Which customer a conversation belongs to, so the post-call webhook knows where to file its note.
create table if not exists customer_conversations (
  conversation_id text primary key,
  customer_id     uuid not null references customers (id) on delete cascade,
  channel         text,
  created_at      timestamptz not null default now()
);

-- The memory itself: one short line per conversation.
create table if not exists customer_notes (
  id         bigint generated always as identity primary key,
  customer_id uuid not null references customers (id) on delete cascade,
  channel    text,
  summary    text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_recent_idx on customer_notes (customer_id, created_at desc);

-- Row level security on with no policies: only the service role key (server side) can read or
-- write. The publishable/anon key cannot see anything, which is what we want for customer data.
alter table customers              enable row level security;
alter table customer_channels      enable row level security;
alter table customer_conversations enable row level security;
alter table customer_notes         enable row level security;
