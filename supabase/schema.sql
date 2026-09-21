-- Customer memory shared by every channel (Telegram, Instagram, email, website, Slack), Aida
-- rooms, and the email channel's record of what Ellie did with each email.
-- Run this once in the Supabase project: SQL Editor -> New query -> paste -> Run.
--
-- A customer is a person. Every way of reaching them - a Telegram chat, an Instagram sender id, an
-- email address, a website cookie - is a row in customer_channels, so one person can have several
-- of the same kind (two email addresses, two Telegram accounts) with no special case.
--
-- Channels are linked either automatically (the id is in the conversation id) or by the person
-- themselves: they sign in on the website, get a short code, and send it from the channel.

-- Safe to run again at any time: every statement only creates what is missing and never drops or
-- changes existing data.

create extension if not exists "pgcrypto";

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

-- ---------------------------------------------------------------------------------------------
-- Aida: live rooms where CDA employees and a customer talk, with Aida drafting replies that only
-- the employees see. Voice and chat travel through LiveKit; these tables keep the record.
-- ---------------------------------------------------------------------------------------------

create table if not exists aida_rooms (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,        -- what people type to join, e.g. 4F2K9M
  title           text,
  created_by_role text not null,               -- employee | customer
  created_by_name text,
  status          text not null default 'open', -- open | closed
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  closed_at       timestamptz
);

create index if not exists aida_rooms_open_idx on aida_rooms (status, created_at desc);

-- The customer in the room, when they joined signed in to their CDA account: Aida then gets what we
-- remember about them, and the call is added to their memory when the room is closed.
alter table aida_rooms add column if not exists customer_id uuid references customers (id) on delete set null;

-- Everything said, typed, suggested and decided in a room, in order. The author comes from the
-- signed room ticket on the server, never from what the browser claims.
create table if not exists aida_events (
  id              bigint generated always as identity primary key,
  room_id         uuid not null references aida_rooms (id) on delete cascade,
  kind            text not null,               -- speech | chat | suggestion | approved | declined
  author_identity text not null,
  author_name     text,
  author_role     text not null,               -- employee | customer
  text            text,
  ref             text,                        -- the suggestion an approval or decline belongs to
  created_at      timestamptz not null default now()
);

create index if not exists aida_events_room_idx on aida_events (room_id, id);

alter table aida_rooms  enable row level security;
alter table aida_events enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Email: mail to the CDA mailbox arrives through Gmail push, Ellie answers through a Custom
-- Channel, and the web app sends her reply or leaves it as a Gmail draft (src/lib/emailInbox.ts).
-- ---------------------------------------------------------------------------------------------

-- One row per email. Inserting it is what stops a repeated notification from answering twice.
-- Who wrote and the subject only; the text of the email stays in Gmail.
create table if not exists email_messages (
  gmail_id          text primary key,             -- Gmail's message id
  thread_id         text not null,
  from_email        text,
  from_name         text,
  reply_to          text,
  subject           text,
  message_id        text,                         -- RFC 822 Message-ID, for In-Reply-To
  references_header text,
  status            text not null default 'new',  -- new | waiting | replying | sent | draft | skipped | failed
  reason            text,                         -- why it was skipped or failed
  conversation_id   text unique,                  -- Ellie's conversation for this email
  mode              text,                         -- auto | draft, as it was when the reply came back
  received_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists email_messages_recent_idx on email_messages (created_at desc);
create index if not exists email_messages_sender_idx on email_messages (from_email, created_at desc);

-- Where Gmail push has got to: the mailbox history id already handled. A single row.
create table if not exists gmail_state (
  id               int primary key default 1 check (id = 1),
  history_id       bigint not null,
  watch_expires_at timestamptz,
  updated_at       timestamptz not null default now()
);

alter table email_messages enable row level security;
alter table gmail_state    enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Messenger: one row per person writing to the Facebook Page (src/lib/messenger.ts). Which Ellie
-- conversation they are in (continued for 10 minutes) and the last answer sent, so a repeated
-- delivery never sends twice. No message text.
-- ---------------------------------------------------------------------------------------------

create table if not exists messenger_threads (
  psid            text primary key,              -- the person's Page-scoped id
  conversation_id text,
  last_reply      text,
  updated_at      timestamptz not null default now()
);

create index if not exists messenger_threads_conversation_idx on messenger_threads (conversation_id);

alter table messenger_threads enable row level security;

-- Instagram, the same way as Messenger (psid holds the person's Instagram-scoped id).
create table if not exists instagram_threads (
  psid            text primary key,
  conversation_id text,
  last_reply      text,
  updated_at      timestamptz not null default now()
);

create index if not exists instagram_threads_conversation_idx on instagram_threads (conversation_id);

alter table instagram_threads enable row level security;

-- Tokens the web app renews itself: the Instagram token (60 days) is refreshed every 7 days by the
-- daily cron. Only the service role key can read this table.
create table if not exists channel_tokens (
  channel      text primary key,               -- instagram
  token        text not null,
  refreshed_at timestamptz not null default now(),
  expires_at   timestamptz
);

alter table channel_tokens enable row level security;
