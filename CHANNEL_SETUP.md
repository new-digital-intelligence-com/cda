# CDA Multi-Channel Assistant (Demo) – Setup Guide

Demo built by **NDI (New Digital Intelligence)** for **CDA** (UK kitchen appliance brand, www.cda.co.uk).
Not an official CDA service. Last updated: **21 September 2026**.

> **This repository is public. No secrets in this file.** Keys and tokens live in the tools themselves,
> in Vercel and in `.env.local` — see [Credentials](#11-credentials).

## Contents

1. [Overview](#1-overview)
2. [Ellie, the ElevenLabs agent](#2-ellie-the-elevenlabs-agent)
3. [Telegram](#3-telegram)
4. [Email](#4-email)
5. [Instagram](#5-instagram)
6. [Website](#6-website)
7. [Customer memory across channels](#7-customer-memory-across-channels)
8. [Aida rooms](#8-aida-rooms)
9. [Admin page](#9-admin-page)
10. [Web app reference](#10-web-app-reference)
11. [Credentials](#11-credentials)
12. [Maintenance](#12-maintenance)
13. [Not built yet](#13-not-built-yet)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Overview

One AI agent, **Ellie**, on **ElevenLabs Agents**, answers on every channel with the same prompt,
knowledge and model. She replies directly; staff can check first on email (draft mode) and in
Aida rooms (live calls where the second agent, Aida, drafts answers for staff).

| Channel | Status | How it reaches Ellie |
|---|---|---|
| Website https://cda-demo.vercel.app | ✅ | Next.js app on Vercel, site password: Chat, Voice, Avatar, Aida |
| Admin https://cda-demo.vercel.app/admin | ✅ | Staff page, Aida staff password |
| Telegram **@CDA_2026_Support_Bot** | ✅ | Native ElevenLabs Telegram trigger |
| Email **cda_domestic_appliances@new-digital-intelligence.com** | ✅ | Gmail push → web app → Custom Channel "CDA email" |
| Instagram **@new_digital_intelligence** | ✅ | Make.com → Custom Channel |
| Hosted page / QR code | ✅ | ElevenLabs talk-to link (no password) |
| Slack | ⏳ | Waiting for a Slack workspace (section 13) |
| WhatsApp, phone number | ⏸ | Parked (section 13) |

```
 Website chat / voice / files ─────────►┐
 Avatar tab ─► Anam (video face) ───────►│
 Telegram bot ──────────────────────────►│   ElevenLabs agent "Ellie"
 Email ─► Gmail ─► web app ─────────────►│   Gemini 3.7 Flash · 31 documents (RAG)
 Instagram DM ─► Make.com ──────────────►│
 Hosted page / QR ──────────────────────►┘
                                             │ 2 tools + post-call webhook
                                             ▼
 web app (Vercel) ── Supabase: customers, notes, email log, Aida rooms
 Aida tab (customers) + /admin (staff) ── LiveKit calls, Aida drafts for staff
 Admin: Claude through the ElevenLabs connector (e.g. switch email replies to drafts)
```

---

## 2. Ellie, the ElevenLabs agent

| Setting | Value |
|---|---|
| Plan | **Creator**, 121,005 credits a month, resets ~17th |
| Agent | `CDA Assistant – Demo`, ID `agent_3601m2p374tce96b7p6hdfz5f1tv`, branch `agtbrch_9301m2p375xzetbbsyymxnbnsf1s` (Main, 100% of traffic) |
| LLM | Gemini 3.7 Flash, temperature 0 |
| Voice | **Shelley** – Clear, Confident and British (`4CrZuIW9am7gYAxgo2Af`), TTS **Eleven Flash v2** (English only; use Flash v2.5 for other languages in voice) |
| Speech to text | Scribe Realtime, quality high; turn model turn_v3, turn timeout 7 s |
| Audio | Input **PCM 16000 Hz** (Anam needs it), output PCM 24000 Hz |
| First message | "Hello, you're through to CDA's virtual assistant, Ellie. How can I help you today?" (not sent on Custom Channel text channels) |
| Files | Images and PDFs, max 10 per conversation |
| Transcripts | Kept without limit (`retention_days: -1`) |
| Cost | Voice or avatar ≈ **600 credits a minute**; a text reply ≈ 60–100 credits |

**Changing settings by API:** back up the agent JSON, `PATCH /v1/convai/agents/{id}?branch_id=…` with only
the changed part, then read it back. API changes go live at once; dashboard changes need **Publish**.

**Prompt sections:** Personality · Company context · Environment (channel rules: phone/avatar short
answers; *Telegram only* text; *Instagram only* plain text under 900 characters; *Website chat* reads
images and PDFs; *Email only*: body of one plain-text reply, never asks for the email address, answers
`SKIP` to robots) · Goal · Knowledge rules (only knowledge-base facts; spare parts delivery: give both
48 h and 3–5 days; warranty: only current 60-day terms) · Collecting details for repairs · Safety (gas
0800 111 999) · Handover to a human · Style (British English) · Operating mode: AGENT (summary of the
request, never claims something is booked) · Recognising the customer (section 7).

### Knowledge base

31 documents, ~840 KB of 20 MB. RAG **every turn**, embedding `multilingual_e5_large_instruct`,
50,000 characters, 20 chunks.

- **21 cda.co.uk pages**, added as single URLs (crawl **off**; 11 of them auto-sync weekly):
  `customer-care/`, `customer-care/book-an-engineer/`, `warranty/`, `warranty/serial-numbers/`,
  `lifetime-warranty/`, `contact-us/`, `parts/`, `parts/faq/`, `parts/terms/`, `parts/contact-us/`,
  `advice-centre/frequently-asked-questions/faq-general/`, `blog/where-is-my-rating-plate/`, and the
  FAQ pages for hobs, refrigeration, ovens, extractors, dishwashers, laundry, wine coolers, sinks and
  compact appliances
- **10 PDFs from Google Drive** (auto sync daily, auto remove on): company overview · customer care,
  warranty and parts · 106 FAQs and buying advice · where to buy · products (cooking, extractors,
  cooling/dishwashers/laundry, sinks and taps) · discontinued models · 61 contradictions on CDA's
  own website. Fact-checked against the live site 16–17 Sep 2026 (251 products)

To update: replace the PDF in Drive (it re-syncs) and it stays attached. Rules: never "crawl entire
website" (1,000+ old pages, storage full); a synced document must also be **attached** to the agent;
Google Sheets/Slides are not supported by the Drive sync.

---

## 3. Telegram

| Item | Value |
|---|---|
| Bot | **@CDA_2026_Support_Bot** ("CDA Support Demo"), made with @BotFather |
| ElevenLabs | Ellie → Channels → **Telegram** → trigger **Message Received**, connection with the bot token |

Private chats: every message is answered. Groups: only @mentions and replies to the bot. **Text
only** (no photos, files or voice notes). Check the webhook with
`https://api.telegram.org/bot<TOKEN>/getWebhookInfo` — its `url` must point to `api.us.elevenlabs.io`.
Never connect the same bot token twice.

---

## 4. Email

The web app reads the CDA mailbox through the Gmail API, hands each email to Ellie through her own
Custom Channel trigger, and **sends her reply or leaves it as a Gmail draft**. Freshdesk is no longer used.

| Item | Value |
|---|---|
| Mailbox | **cda_domestic_appliances@new-digital-intelligence.com** (Google Workspace) |
| Google Cloud | Project `cda-email-509312` (billing linked; stays in the free tier). Gmail API + Pub/Sub API |
| Gmail access | OAuth client "Desktop", consent screen **Internal**, scope `gmail.modify`, one refresh token |
| Pub/Sub | Topic `gmail-inbox` (Publisher: `gmail-api-push@system.gserviceaccount.com`); push subscription `gmail-inbox-push` → `/api/email/gmail-push?token=<GMAIL_PUSH_SECRET>`, never expires, ack deadline 60 s |
| ElevenLabs | Ellie → Channels → Custom Channel, connection **CDA email** (`trigger_cxn_4401m321spm3f9nah3y9bsn5mn4n`), Reply Webhook URL `https://cda-demo.vercel.app/api/email/ellie-reply` |
| Send or draft | `email_mode` = `auto` / `draft`, a dynamic variable placeholder on the **Aida** agent |

```
Customer email → Gmail → Pub/Sub → /api/email/gmail-push
   → rules skip robots (no credits) → Ellie via "CDA email"
Ellie's answer → /api/email/ellie-reply → reads email_mode on Aida
   → auto:  sent in the customer's thread         → label Ellie/Replied
   → draft: Gmail draft in the customer's thread  → label Ellie/Draft ready
```

- **Each email is its own ElevenLabs conversation** (Custom Channel conversations end after one turn).
  Ellie gets `[Email to CDA customer care]`, sender, subject and up to 6,000 characters of text;
  attachments are named, not opened. Her reply is cleaned (no copied header, no markdown) and sent
  as `"CDA Customer Care (demo)"` with `Re:` and In-Reply-To/References, so it lands in the thread
- **Robots are skipped**: rules in `src/lib/emailParse.ts` (no-reply and notification senders,
  "security code"-type subjects, Gmail Promotions/Social/Forums, newsletter and bulk headers, bounces,
  more than 5 emails an hour from one sender), then Ellie answers `SKIP` to anything else not written
  by a person. Mail older than 24 hours or from the mailbox itself is never answered. Automatic
  replies carry `Auto-Submitted: auto-replied` so out-of-office robots don't loop
- **Labels** under "Ellie" in Gmail: **Replied** (green, email marked read) · **Draft ready**
  (orange: open, check, press Send) · **Skipped** (grey) · **Failed** (red: answer by hand)
- **Switch send/draft**: `/admin` → **Email** tab, or ask Claude with the ElevenLabs connector:
  *"Set the dynamic variable placeholder email_mode on the agent Aida – CDA copilot to draft"*.
  Read again for every reply; anything unreadable counts as `draft`. It sits on Aida, not Ellie, so
  it cannot affect Ellie's channel triggers. The dashboard's **Vars** panel does not list it (only
  variables used as `{{…}}` are shown)
- **Supabase**: `email_messages` (one row per email: sender, subject, status, reason, conversation —
  never the text; the row also stops double replies) and `gmail_state` (how far the inbox was read)
- **Gmail watch** lasts 7 days: Vercel Cron renews it daily at 06:00 UTC (`vercel.json`) and catches
  up on anything missed. By hand: `GET /api/email/gmail-watch` with `Authorization: Bearer <GMAIL_PUSH_SECRET>`
- The refresh token belongs to the mailbox: if its password changes or access is removed, email
  stops ("invalid_grant" in the logs) → run the Google consent again

---

## 5. Instagram

ElevenLabs has no native Instagram channel, so Make.com passes messages both ways.

| Item | Value |
|---|---|
| Account | **@new_digital_intelligence** (Business), IG user ID `17841430407573788` |
| Meta app | New developer app (21 Sep 2026), use case "Manage messaging & content on Instagram" → **API setup with Instagram login**, **Published**, privacy policy in a public Google Doc |
| Permissions | `instagram_business_basic`, `instagram_business_manage_messages` (Standard Access) |
| Webhook | Field `messages`, Callback URL = Make webhook `instagram-in`, verify token = the one in Make's "Meta verification" filter |
| Make.com | Team "My Team" (eu1), free plan (1,000 operations a month). Scenarios **IG – Instagram in** (7456234) and **IG – Ellie reply out** (7456248); data store `ig_conversations` (190081) |
| ElevenLabs | Ellie → Channels → Custom Channel, trigger `trigger_cxn_0101m2pccemse2591rmxbbet8742`, Reply Webhook URL = Make webhook `ellie-reply` |

```
DM → Meta webhook → Make "IG – Instagram in" → Custom Channel → Ellie
DM ← Instagram Send API ← Make "IG – Ellie reply out" ← reply webhook ←┘
```

- **In**: answers Meta's verification (`hub.challenge`); for a real DM (text, not from our account,
  not an echo) posts to the Custom Channel with header `X-Webhook-Secret` and body
  `{data:{type:"user_message", text, user_identifier}, user_message_id:"<sender>|<mid>", conversation_id?, dynamic_variables:{instagram_id}}`.
  A conversation continues for 10 minutes (data store), then a new one starts
- **Out**: for each `agent_response` in `data[]`, POST `graph.instagram.com/v25.0/17841430407573788/messages`
  with `Authorization: Bearer <Instagram token>` to the sender taken from `user_message_ids` (max 1,000 characters)
- Replies must go out within 24 hours of the DM; text only
- **Token: 60 days at most** (Meta has no longer token). Refresh after it is 24 h old:
  `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<TOKEN>`,
  then put the new token in the reply scenario's Authorization header
- **Switching account or app**: generate a token in the app → `GET /me?fields=user_id,username` →
  replace the IG user ID in both scenarios and the token in the reply one → subscribe the account
  (`POST /v25.0/me/subscribed_apps?subscribed_fields=messages`) → set the app's webhook → publish →
  update the button in `src/components/ChannelLinks.tsx`. Nothing changes in ElevenLabs
- Don't brand the account or Meta business "CDA" (Meta restricted an account named "CDA Customer Care")

---

## 6. Website

### Customer site `https://cda-demo.vercel.app` (site password)

- **Tabs**: 💬 **Chat** (markdown replies, images/PDFs up to 3 per message, 10 MB each) ·
  🎙️ **Voice** (WebRTC, live transcript) · 🧑‍💼 **Avatar** (below) · 📞 **Aida** (join a live call
  with CDA staff by code, or open a room — always as the customer, section 8)
- **Your CDA account**: create an account, link channels with a code (section 7)
- **Message Ellie on your app**: Email (Gmail compose), Telegram, Instagram @new_digital_intelligence
- **Email me this conversation** (chat, voice, avatar): the text comes from ElevenLabs' transcript,
  only the browser that had the conversation can send it, the session is ended first; one click for
  a signed-in customer. Sent from `gmail_sender`
- The staff page is `/admin` (section 9); it is not linked from here

### Video avatar (Anam)

**Anam draws Ellie's face** (avatar **Sofia**, our Ellie picture, model Cara 4, Director Notes
`warm` 0.5); Ellie on ElevenLabs still listens, thinks and speaks. The server gets an ElevenLabs
signed URL and creates an Anam session token joined to Ellie (`/api/anam/session`); the browser
streams it with the Anam SDK. Horizontal 1152×768 or vertical 768×1152, live captions.

**Free plan**: 30 minutes a month, **3-minute calls** (`ANAM_MAX_SESSION_SECONDS=180`), watermark.
Explorer ($49/month) removes the watermark and allows 10-minute calls (then raise the variable).
The "Olivia" persona in Anam Lab is not used.

### Hosted page and widget (no password)

https://elevenlabs.io/app/talk-to?agent_id=agent_3601m2p374tce96b7p6hdfz5f1tv (voice + text; the QR
code can be regenerated from this link). Widget for any site:

```html
<elevenlabs-convai agent-id="agent_3601m2p374tce96b7p6hdfz5f1tv"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
```

> Anyone with the link or agent ID can use credits. Turning on agent authentication (Security) stops
> the page, QR and widget; retest every channel after such a change.

---

## 7. Customer memory across channels

Ellie recognises the same person on every channel and remembers what they asked. **She never asks
anyone to identify themselves**; someone she cannot place is simply helped.

```
Website: create account → "+ Add a channel" → CDA-4F2K9M → send it from Telegram, Instagram or another email
Any conversation → customer_lookup(system__conversation_id) → known? greet by name, use the last 3 notes
Conversation ends → post-call webhook → one short note (max 400 characters)
```

- **Accounts**: Supabase Auth (`email_confirm: true`); signing up links and verifies that email.
  One code works once, 30 minutes; several accounts of the same kind are fine
- **Anonymous people** are remembered per channel (same Telegram chat, same browser); their notes
  move to the account when they link. **Robots get no record** (no-reply senders; a sender Ellie
  answers `SKIP` to is dropped again if the record holds nothing else)
- **Stored**: no messages. `customer_conversations` (conversation → customer) and `customer_notes`
  (one line per conversation). Full transcripts stay in ElevenLabs

| Channel | How the person is identified |
|---|---|
| Telegram | Chat id inside the conversation id: `…_tg_6486763839` (undocumented ending) |
| Email | The web app registers the conversation to the sender when it hands the email to Ellie; `customer_lookup` waits up to ~1 s for that. Old Freshdesk conversations: `…_fd_<ticket>` |
| Website | Registered when the session starts: signed-in account, else the `cda_visitor` cookie |
| Instagram | `instagram_id` that Make sends is read from the stored ElevenLabs conversation (Custom Channel only) |
| Slack | Not wired up (`integration__slack_user_id` exists) |

> **Never bind a tool parameter to a channel-specific dynamic variable, and never give an
> `integration__…` variable a placeholder.** Both took channels down on 17 Sep 2026 ("Missing required
> dynamic variables"; Telegram stopped completely). Tools use only `system__conversation_id`; anything
> else is registered or read server-side.

| On the agent | ID |
|---|---|
| Workspace secret `CDA_AGENT_TOOL_SECRET` | `DXmaQafUvJljsoKMs0nO` |
| Tool `customer_lookup` (conversation_id) | `tool_9201m2rhvc78e339hna52s5jfryf` |
| Tool `customer_link` (conversation_id, code) | `tool_0301m2rhvckwepns0q0dhn26xnvr` |
| Post-call webhook | `cdbf083668794fe0b107eb26730cdbc6` |

Tables (`supabase/schema.sql`, safe to re-run): `customers`, `customer_channels` (channel + key →
customer, `verified`), `link_codes`, `customer_conversations`, `customer_notes`. Row level security on,
no policies: only the service role key reads it. **Use fake customers only** (UK GDPR).

---

## 8. Aida rooms

A live call between CDA staff and a customer: everyone can **talk or type**, the call is
**transcribed live**, and **Aida** drafts a reply to each customer message that **only staff see**
(Approve & send / Edit / Decline).

| | Gets in with | Sees |
|---|---|---|
| **Staff** | `/admin` → Aida staff password → **Aida rooms** tab | Everything, including Aida's drafts |
| **Customer** | The **📞 Aida** tab on the site, or an invite link `/aida/join?code=…` (no password) | Talk, chat and transcript — **never** drafts |

- The role comes from how you got in, never from what you type. The staff token lives **per browser
  tab** (`x-aida-staff`); to test alone, open the invite link in a new tab. Changing
  `AIDA_STAFF_PASSWORD` signs every staff tab out
- **LiveKit** carries voice (microphone only) and chat; the server writes the role into the LiveKit
  ticket, which participants cannot change. Each browser transcribes its **own** microphone with
  Scribe (`scribe_v2_realtime`), only once an employee is in the room
- **Aida runs in one staff browser** (the first employee; the next takes over). Customer lines →
  `sendUserMessage` → draft; staff lines → `sendContextualUpdate`. Labels like `[Check]` are shown to
  staff and stripped before sending; `[No reply needed]` drafts are dropped
- **Signed-in customers**: no name asked, the room is linked to them, Aida gets what CDA knows about
  them, and closing the room adds one line to their memory
- **Closing is final**: nothing more can be added (410), the history stays readable (staff: Closed
  rooms; customers: with the code) and can be emailed (max 10 emails per room). Rooms expire after
  4 hours. Codes are 6 characters without I, O, 0, 1 (`4F2-K9M`)
- Supabase: `aida_rooms` (with `customer_id`), `aida_events`

| Aida agent | |
|---|---|
| ID | `agent_2601m31rbrn8emrbfe8vgxgxdta9` — "Aida – CDA copilot (drafts for staff)" |
| Setup | Gemini 3.7 Flash, temperature 0, the same 31 documents, text only, no first message, 1-hour sessions |
| Tools / channels | **None** (created fresh, not duplicated, so it has none of Ellie's triggers) |
| Dynamic variables | Only `email_mode` (the email switch, section 4); nothing in her prompt uses it |

Costs: LiveKit Cloud free "Build" plan (5,000 participant-minutes a month; project
`wss://test-o70a5e7x.livekit.cloud`); live transcript ≈ $0.39 per hour of speech per speaker; drafts are text.

---

## 9. Admin page

`https://cda-demo.vercel.app/admin` — staff only, **Aida staff password** (the site password does not
open it; `/aida` forwards here). Three tabs, which stay open once visited so a call is never dropped:

| Tab | What staff do |
|---|---|
| 📞 **Aida rooms** | Create, join, close rooms; read and email closed ones (section 8) |
| 👥 **Customers** | Numbers (customers, accounts, 2+ channels, active this week / now, conversations per channel, email outcomes, open rooms); a searchable list; one customer's channels (✓ verified), activity and timeline |
| ✉️ **Email** | Send automatically / Draft for staff, and the latest emails with what happened to each |

**AI insights** (Claude Haiku, `ANTHROPIC_MODEL=claude-haiku-4-5`, only when a staff member clicks,
nothing stored, a fraction of a cent each):
- ✨ *Ask Claude* on a customer: summary, topics, products, mood, open issues, flags, next step —
  from their notes, emails, rooms and last 3 transcripts
- ✨ *Summarise with Claude*: what customers asked about in the last 7 days, on every channel

Customer notes and transcripts are sent to Anthropic for these insights (fine for the demo; for real
customers it belongs in the privacy notice). Website "channels" are browser cookies, so only 6
characters are shown.

---

## 10. Web app reference

| Item | Value |
|---|---|
| Repository | `github.com/new-digital-intelligence-com/cda`, branch `main` → Vercel deploys automatically |
| Stack | Next.js 16 (read `node_modules/next/dist/docs/`), React 19, Tailwind 4, `@elevenlabs/react`, LiveKit, Anam SDK |
| Run | `npm install` · `npm run dev` · `npm run build` (before `npx tsc --noEmit`) · `npm run lint` |
| Commits | Author **HelmiDev03**; pushed straight to `main` |

**Who can open what** (`src/proxy.ts`): everything needs the **site password** except `/login`,
`/admin` and `/aida/join` (they ask for their own proof) and the routes that check their own secret:

| Routes | Called by | Protected by |
|---|---|---|
| `/api/agent/customer-lookup`, `/customer-link` | Ellie's tools | `x-cda-agent-secret` |
| `/api/agent/post-call` | ElevenLabs post-call webhook | HMAC signature (`ELEVENLABS_WEBHOOK_SECRET`) |
| `/api/email/gmail-push` | Google Pub/Sub | `?token=` `GMAIL_PUSH_SECRET` |
| `/api/email/ellie-reply` | ElevenLabs (email replies) | HMAC signature (`EMAIL_CHANNEL_SIGNING_SECRET`) |
| `/api/email/gmail-watch` | Vercel Cron, daily | `Bearer CRON_SECRET` (or the push secret) |
| `/api/email/mode`, `/api/admin/*` | `/admin` | Aida staff token |
| `/api/aida/*` | Aida rooms | Staff token, room ticket, or nothing for customers (each route checks) |
| `/api/elevenlabs/*`, `/api/anam/session`, `/api/account`, `/api/transcript/email` | Customer site | Site password |

**Main files**: `src/components/AssistantApp.tsx` (tabs) · `src/lib/customers.ts` (memory) ·
`src/lib/emailInbox.ts`, `gmail.ts`, `emailParse.ts`, `emailMode.ts` (email) · `src/lib/aida.ts`,
`livekit.ts`, `src/components/aida/` (rooms) · `src/components/admin/`, `src/lib/adminData.ts`,
`anthropic.ts` (admin) · `supabase/schema.sql` · `vercel.json` (cron).

### Environment variables (`.env.local` and Vercel → Redeploy after a change)

| Name | Purpose |
|---|---|
| `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` | Ellie (`agent_3601m2p374tce96b7p6hdfz5f1tv`) |
| `SITE_PASSWORD` | Customer site password |
| `ANAM_API_KEY`, `ANAM_AVATAR_ID`, `ANAM_MAX_SESSION_SECONDS` | Avatar (Sofia `90e0c565-6c16-42a2-bd45-255f904df7a2`, 180) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database (service role: server only) |
| `AGENT_TOOL_SECRET`, `ELEVENLABS_WEBHOOK_SECRET` | Ellie's tools, post-call webhook |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Aida rooms |
| `AIDA_AGENT_ID`, `AIDA_STAFF_PASSWORD` | Aida agent, staff password (`/admin`) |
| `gmail_sender`, `gmail_app_password` | Mailbox that sends conversation emails (lower-case names) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Gmail API |
| `GMAIL_PUBSUB_TOPIC`, `GMAIL_PUSH_SECRET`, `CRON_SECRET` | Gmail push and its daily renewal |
| `EMAIL_CHANNEL_INBOUND_URL`, `EMAIL_CHANNEL_INBOUND_SECRET`, `EMAIL_CHANNEL_SIGNING_SECRET` | "CDA email" Custom Channel |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Insights on `/admin` |
| `FRESHDESK_API_KEY`, `FRESHDESK_SUBDOMAIN` | Only to recognise old Freshdesk conversations; can go once Freshdesk is closed |

---

## 11. Credentials

| Credential | Lives in | Note |
|---|---|---|
| All `.env` keys above | Vercel + `.env.local` | Never committed (public repo) |
| Telegram bot token | ElevenLabs Telegram connection | From @BotFather |
| Instagram token | Make "IG – Ellie reply out" header (copy `INSTAGRAM_ACCESS_TOKEN` in `.env.local`) | **Expires ~20 Nov 2026** |
| Instagram Custom Channel secrets | ElevenLabs trigger; input secret in Make's HTTP header | |
| Meta webhook verify token | Make filter "Meta verification" + Meta app | |
| Google Drive access | ElevenLabs Google Drive integration | Read-only, picked files |
| Make API token `claude-setup` | Make → Profile → API access | Delete when no longer needed |
| Slack bot token + signing secret | ElevenLabs Slack connection (when built) | |

**Shared in chat → rotate after the demo:** ElevenLabs, Anam, Supabase service role, LiveKit, Google
OAuth client secret (then run the Gmail consent again), both Custom Channel secret pairs, Instagram
token, Anthropic, Freshdesk; delete the Make API token.

---

## 12. Maintenance

| When | What |
|---|---|
| **Now** | Remove the old **Freshdesk** trigger from Ellie (Channels → Freshdesk), so no email can get two answers |
| Daily, automatic | Vercel Cron renews the Gmail watch |
| ~17th each month | ElevenLabs credits reset (next 17 Oct 2026) |
| Monthly | Make free operations reset; Anam gives 30 avatar minutes |
| **Before ~20 Nov 2026** | Refresh the Instagram token (section 5) and update the Make reply header |
| When CDA content changes | Replace the PDFs in Drive (auto sync) |
| After the demo | Rotate the keys listed in section 11 |

---

## 13. Not built yet

| What | Status | Needed |
|---|---|---|
| **Slack** | Waiting | A workspace under Slack's free 10-app limit (the NDI workspace is full), then the steps below |
| **WhatsApp** | Parked | Meta restricted the WhatsApp Business account: appeal with an own brand name; voice calls also need a 2,000/day messaging limit |
| **Phone number** | Parked | A number bought from **Twilio** (easiest) or a SIP provider → ElevenLabs → Phone Numbers → Import → assign Ellie. No audio change needed. Set max call length, daily and concurrency limits. A mobile SIM cannot be used |
| Facebook Messenger | Idea | Copy the Instagram Make scenarios (needs a Facebook Page) |

### Slack steps (native ElevenLabs integration, own app "CDA_Support")

1. api.slack.com/apps → Create New App → **From a manifest** (YAML):
   ```yaml
   display_information: { name: CDA_Support, description: CDA customer assistant (NDI demo), background_color: "#e84339" }
   features:
     app_home: { home_tab_enabled: false, messages_tab_enabled: true, messages_tab_read_only_enabled: false }
     bot_user: { display_name: CDA_Support, always_online: true }
   oauth_config:
     scopes:
       bot: [app_mentions:read, channels:history, channels:join, channels:manage, chat:write, files:read, groups:history, groups:write, im:history, reactions:write]
   settings: { org_deploy_enabled: false, socket_mode_enabled: false, token_rotation_enabled: false }
   ```
2. Install → copy the **Bot User OAuth Token** and **Signing Secret**
3. ElevenLabs → Integrations → Slack → **Bring your own bot** → paste both → copy the Events and Interactivity URLs
4. Slack app → Event Subscriptions: `app_mention` (mention-only) **or** `message.channels` + `message.groups`
   (all messages) — never both — plus `message.im`; Interactivity → the Interactivity URL
5. Ellie → triggers **Channel Message** (channel ID `C…`, only humans) and **Direct Message**; `/invite @CDA_Support` in private channels

---

## 14. Troubleshooting

| Problem | Fix |
|---|---|
| A channel breaks with "Missing required dynamic variables", or Telegram stops answering | A tool bound to a channel variable, or an `integration__` placeholder: remove it (section 7) |
| Dashboard test works, channel doesn't | The change is still a draft → **Publish** |
| Documents synced but unknown to Ellie | Attach them to the agent and publish |
| "RAG storage limit exceeded" / "exceeds your quota" | Too many documents / credits used up |
| Email: no reply and no Ellie label | Open `/api/email/gmail-watch` with the push secret, then Vercel logs for `gmail-push` |
| Email labelled **Failed** | Reason on `/admin` → Email. "invalid_grant" → run the Gmail consent again |
| A customer's email labelled **Skipped** | Answer by hand; adjust `src/lib/emailParse.ts` if it repeats |
| A customer gets two answers to one email | The Freshdesk trigger is still on Ellie → remove it |
| Instagram DMs don't arrive | App not **Published**, account not subscribed to `messages`, or webhook not verified |
| Instagram: Ellie answers, nothing is sent | Token expired → refresh it (section 5) |
| Meta: "Insufficient developer role" | Add the account as **Instagram Tester** and accept at instagram.com/accounts/manage_access |
| Avatar call won't start | Browser console (F12) and Vercel logs; check `ANAM_*`, input format PCM 16000 Hz, 3-minute limit |
| Voice widget test "draft_from_user_id" | Use the Inline test mode or refresh |
| Slack answers twice | Subscribed to both `app_mention` and `message.*` → keep one |
