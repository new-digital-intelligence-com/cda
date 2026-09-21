# CDA Multi-Channel Assistant (Demo) – Channel Setup Guide

Demo built by **NDI (New Digital Intelligence)** for **CDA** (UK kitchen appliance brand, www.cda.co.uk).
It is a demo and not an official CDA service.

Last updated: **21 September 2026**

> **Secrets are not written in this file.** API keys, tokens and passwords are stored in the tools
> themselves (ElevenLabs, Make.com, Anam, Slack, Vercel, `.env.local`). See [Credentials and where they live](#12-credentials-and-where-they-live).

---

## Contents

1. [Architecture](#1-architecture)
2. [Core: the ElevenLabs agent "Ellie"](#2-core-the-elevenlabs-agent-ellie)
3. [Knowledge base](#3-knowledge-base)
4. [Telegram](#4-telegram)
5. [Email (Gmail + Custom Channel)](#5-email-gmail--custom-channel)
6. [Web chat and voice (ElevenLabs hosted page)](#6-web-chat-and-voice-elevenlabs-hosted-page)
7. [Custom web app (Next.js on Vercel)](#7-custom-web-app-nextjs-on-vercel)
8. [Instagram (Make.com + ElevenLabs Custom Channel)](#8-instagram-makecom--elevenlabs-custom-channel)
9. [Video avatar (Anam)](#9-video-avatar-anam)
10. [Slack (in progress)](#10-slack-in-progress)
11. [Admin through Claude (ElevenLabs connector)](#11-admin-through-claude-elevenlabs-connector)
12. [Credentials and where they live](#12-credentials-and-where-they-live)
13. [Maintenance calendar](#13-maintenance-calendar)
14. [Parked / not yet built](#14-parked--not-yet-built)
15. [Troubleshooting and lessons learned](#15-troubleshooting-and-lessons-learned)
16. [Cross-channel customer memory](#16-cross-channel-customer-memory)
17. [Aida rooms (live calls with an AI copilot)](#17-aida-rooms-live-calls-with-an-ai-copilot)
18. [Admin page (staff)](#18-admin-page-staff)

---

## 1. Architecture

One AI agent (**Ellie**) on **ElevenLabs Agents** answers on every channel. Every channel uses the
same prompt, the same knowledge base and the same model, so answers are consistent.

Customers can also link their channels to one account, so Ellie recognises the same person on
Telegram, email and the website and remembers what they asked before — see
[section 16](#16-cross-channel-customer-memory).

```
                         ┌──────────────────────────────────────────┐
 Telegram bot ──────────►│                                          │
                         │     ElevenLabs agent "CDA Assistant –    │
 Email ─► Gmail ─► app ─►│     Demo" (Ellie)                        │
                         │                                          │
 Web page / QR code ────►│  • Gemini 3.7 Flash                      │
                         │  • British voice                         │
 Next.js web app ───────►│  • 31 knowledge documents (RAG)          │
 (chat, voice, files)    │  • Agent mode: replies directly          │
                         │                                          │
 Avatar tab ─► Anam ────►│  (Anam draws Ellie's video face)         │
                         │                                          │
 Instagram DM ─► Make ──►│  (Custom Channel)                        │
                         │                                          │
 Slack (in progress) ───►│  (native Slack trigger)                  │
                         └──────────────────────────────────────────┘
                                          ▲
                   Admin: Claude ─────────┘ (ElevenLabs MCP connector)
```

| Channel | How it connects to Ellie | Code needed? |
|---|---|---|
| Telegram | Native ElevenLabs Telegram trigger | No |
| Email | Gmail push → the web app → ElevenLabs Custom Channel; the web app sends the reply or leaves a Gmail draft | Yes (web app routes) |
| Web chat + voice | ElevenLabs hosted page (talk-to link) | No |
| Web app | ElevenLabs React SDK in a Next.js app | Yes (own repo) |
| Instagram | Make.com scenarios + ElevenLabs Custom Channel | No code (Make blocks) |
| Video avatar | Anam avatar (our Ellie picture) joined to the ElevenLabs agent, in the web app's **Avatar** tab | Small (one API route + Anam SDK) |
| Slack | Native ElevenLabs Slack trigger (in progress) | No |

**Mode:** **Agent mode** (Ellie replies directly) everywhere. Two places let staff check first: email
can be switched to **drafts** (section 5), and **Aida rooms** draft answers for staff on live calls (section 17).

---

## 2. Core: the ElevenLabs agent "Ellie"

| Setting | Value |
|---|---|
| ElevenLabs plan | **Creator** (121,005 credits/month, 20 MB RAG storage) |
| Agent name | `CDA Assistant – Demo` |
| Agent ID | `agent_3601m2p374tce96b7p6hdfz5f1tv` |
| Branch | `Main` (100% of live traffic) |
| LLM | Gemini 3.7 Flash |
| Voice | **Shelley – Clear, Confident and British** (young British female, voice library, `4CrZuIW9am7gYAxgo2Af`) |
| Language | English (answers in the customer's language) |
| Time zone | Europe/London |
| First message | "Hello, you're through to CDA's virtual assistant, Ellie. How can I help you today?" |
| File input | Enabled: images and PDFs, max 10 files per conversation |
| Audio format | Input **PCM 16000 Hz** (required by Anam), output **PCM 24000 Hz** |

### Voice models (checked 17 Sep 2026)

Used by the **web voice tab, the video avatar and phone calls**. Text channels (web chat, Telegram, email,
Instagram, Slack) only use the LLM.

| Part | Model / setting |
|---|---|
| Speech to text (hearing the customer) | **Scribe Realtime**, quality **high** |
| Text to speech (Ellie speaking) | **Eleven Flash v2** (fastest model), stability 0.5, similarity 0.8, speed 1.0 |
| Voice | **Shelley – Clear, Confident and British** |
| LLM (the "brain") | **Gemini 3.7 Flash**, temperature 0 |
| Turn-taking (knowing when the customer finished talking) | **turn_v3**, eagerness normal, turn timeout 7 s |
| Audio format | PCM 16000 Hz in, PCM 24000 Hz out |
| Cost | About **600 ElevenLabs credits per voice minute** (measured on a 95-second avatar call) |

> **Flash v2 is English-only.** The prompt tells Ellie to answer in the customer's language: fine in text
> channels, but in voice a non-English reply is read with an English voice. For other languages in voice,
> switch to **Flash v2.5** (multilingual) and add the languages in the agent's language settings.

### System prompt sections

The prompt is edited in **Agent → System prompt**. Sections:

- **Personality**: Ellie, CDA's virtual assistant, honest that she is an AI
- **Company context**: founded 1991, Nottinghamshire head office, part of Amica Group since Dec 2015
- **Environment**: channel rules
  - Phone / avatar: 1–3 short sentences
  - **Telegram only**: text only, cannot see photos or voice notes
  - **Instagram only**: plain text, no markdown, under 900 characters
  - **Website chat**: can read attached images and PDFs
  - **Email only**: messages starting `[Email to CDA customer care]`; writes only the body of the
    reply (no copied header), plain text, signed "Ellie, CDA virtual assistant", never asks for the
    email address, cannot open attachments, answers exactly `SKIP` to anything not written by a
    person who wants help (section 5)
- **Goal**: products, warranty and registration, repairs, spare parts and manuals, where to buy
- **Knowledge rules**: only facts from the knowledge base; check model numbers; discontinued products;
  - conflicting sources: give both statements briefly (never mention "older FAQs" or internal documents)
  - spare parts delivery: 48 hours (order before 1pm) vs 3–5 working days → mention both + Parts Department 01949 862019
  - warranty registration: give only the current 60-day terms
- **Collecting details** for repairs and complaints (one or two questions at a time)
- **Safety**: gas smell → National Gas Emergency Service 0800 111 999; electrical safety; Gas Safe engineers
- **Handover to a human**: complaints, refunds, legal, safety, or when asked
- **Style**: British English, same language as the customer, concise
- **Operating mode: AGENT**: handles requests end to end, gives a "Summary of your request", never claims something is booked or refunded

### How it was created

1. ElevenLabs → **ElevenAgents** → Agents → New agent → **Blank template**
2. Prompt, first message, voice, language, LLM set in the **Agent** tab
3. Knowledge base attached (see section 3)
4. **Publish**: channels always use the **published** version, never the draft

> **Important:** the first agent (a renamed "Anna" test agent) had a hidden fault: its Telegram trigger
> never ran. An identical fresh agent worked, so the current agent was created new and the old one was deleted.

---

## 3. Knowledge base

**Total:** 31 documents, about 840 KB of 20 MB. RAG is enabled.

### RAG configuration (Knowledge Base → Configure RAG)

| Setting | Value |
|---|---|
| Mode | **Every turn** |
| Embedding model | **Multilingual optimized** (`multilingual_e5_large_instruct`) |
| Character limit | 50,000 |
| Chunk limit | 20 |

### A) 10 public CDA web pages (added as single URLs, **crawl OFF**)

- https://www.cda.co.uk/customer-care/
- https://www.cda.co.uk/customer-care/book-an-engineer/
- https://www.cda.co.uk/warranty/
- https://www.cda.co.uk/warranty/serial-numbers/
- https://www.cda.co.uk/contact-us/
- https://www.cda.co.uk/parts/
- https://www.cda.co.uk/parts/faq/
- https://www.cda.co.uk/advice-centre/frequently-asked-questions/faq-general/
- https://www.cda.co.uk/hobs/faq-hobs/
- https://www.cda.co.uk/refrigeration/faq-refrigeration/

### A2) 11 more CDA pages (added 17 Sep 2026, single URLs, **auto-sync weekly**)

- https://www.cda.co.uk/ovens/faq-ovens/
- https://www.cda.co.uk/extractors/faq-extractors/
- https://www.cda.co.uk/dishwasher-tips/faq-dishwashers/
- https://www.cda.co.uk/laundry/faq-laundry/
- https://www.cda.co.uk/wine-coolers/faq-wine-cooler/
- https://www.cda.co.uk/sinks/faq-sinks/
- https://www.cda.co.uk/compact-appliances/faq-compact-appliances/
- https://www.cda.co.uk/lifetime-warranty/
- https://www.cda.co.uk/parts/terms/
- https://www.cda.co.uk/parts/contact-us/
- https://www.cda.co.uk/blog/where-is-my-rating-plate/

> Never use "crawl entire website": it copied 1,000+ pages (old blogs, discontinued products) and exceeded storage.
> Don't add blog/promotion pages that expire, or the old `Warranty33.pdf` ("3 year + 3 year" warranty).

### B) 10 PDFs from Google Drive (auto sync)

Source files: `CDA_Knowledge_Base/1_UPLOAD_TO_GOOGLE_DRIVE/` in the parent project folder (not in this repository).
Editable Word/Excel copies: `CDA_Knowledge_Base/2_EDITABLE_COPIES_DO_NOT_SYNC/` (not uploaded).

| File | Content |
|---|---|
| CDA_01_Company_Overview.pdf | History, Amica Group, site, careers, promotions (expired ones marked), social links |
| CDA_02_Customer_Care_Warranty_Parts.pdf | Warranty terms, repair prices, engineer booking, spare parts, returns, all contacts |
| CDA_03_FAQ_Troubleshooting_Buying_Advice.pdf | 106 FAQ answers + buying guides |
| CDA_04_Where_To_Buy.pdf | Retailers and CDA Select Partners |
| CDA_10_Products_Cooking.pdf | Cookers, compact appliances, ovens, hobs |
| CDA_11_Products_Extractors.pdf | Extractors / cooker hoods |
| CDA_12_Products_Cooling_Dishwashers_Laundry.pdf | Refrigeration, wine coolers, dishwashers, laundry |
| CDA_13_Products_Sinks_and_Taps.pdf | Sinks and taps |
| CDA_20_Discontinued_Models.pdf | Discontinued models (so Ellie doesn't offer them) |
| CDA_90_Knowledge_Clarifications.pdf | 61 contradictions found on CDA's own website ("clarifying questions") |

All data was collected from the live CDA website and fact-checked on **16–17 September 2026**
(251 current products).

### How the Drive sync was set up

1. ElevenLabs workspace → **Integrations** → **Google Drive** → Connect
2. Workspace → **Knowledge Base** → **Sync Documents** → pick the 10 PDFs → **Auto sync** (daily) + **Auto remove** ON
3. Attach the synced documents to the agent (agent → Knowledge Base) → **Publish**

> Syncing alone does **not** attach documents to the agent; they must be attached and published.

### How to update the knowledge

- Edit or replace a PDF in the Drive folder → ElevenLabs re-syncs automatically (daily) or click **Sync now**
- Google **Sheets / Slides are not supported** by the Drive sync; use PDF, DOCX or Google Docs

---

## 4. Telegram

| Item | Value |
|---|---|
| Bot | **@CDA_2026_Support_Bot** ("CDA Support Demo") |
| Created with | @BotFather (`/newbot`) |
| ElevenLabs setup | Agent → **Channels** → **Telegram** → **Add trigger** → trigger **Message Received** → connection with the bot token |
| Bot description | "Demo AI assistant for CDA kitchen appliances (NDI demo, not an official CDA channel)…" |

### How it works

```
Customer → Telegram bot → ElevenLabs Telegram trigger → Ellie → reply in the same chat
```

- Private chats: every message is answered
- Groups: only messages that **@mention** the bot or **reply** to it
- **Text only**: photos, files and voice notes are not passed to the agent
- Trigger changes are live immediately (no Publish needed); prompt changes need **Publish**

### Setup steps

1. @BotFather → `/newbot` → name + username ending in `bot` → copy the token
2. ElevenLabs → agent → Channels → Telegram → Add trigger → create connection (paste token **once**) → Save
3. Test in a private chat with the bot

### Check that Telegram reaches ElevenLabs

Open in a browser (replace the token):
```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```
The `url` must point to `api.us.elevenlabs.io/.../telegram/triggers/message?...`. Don't connect the same bot token twice.

---

## 5. Email (Gmail + Custom Channel)

Since 21 September 2026 email no longer goes through Freshdesk. The web app reads the mailbox
through the Gmail API, hands each email to Ellie through a Custom Channel trigger of its own, and
**sends her reply or leaves it as a Gmail draft**, depending on a switch staff control.

**No new agent.** Ellie answers every email, with the same prompt and knowledge as every other
channel. The only thing added to her is a second Custom Channel trigger ("CDA email"). The
existing **Aida** agent (section 17) merely stores the auto/draft switch; she never sees an email.

| Item | Value |
|---|---|
| Customer email address | **cda_domestic_appliances@new-digital-intelligence.com** (Google Workspace mailbox) |
| Google Cloud project | `cda-email-509312` (billing linked; Pub/Sub stays inside the free tier) |
| Gmail access | OAuth client "Desktop", consent screen **Internal**, scope `gmail.modify`, one refresh token for the mailbox |
| Pub/Sub | Topic `gmail-inbox` (publisher: `gmail-api-push@system.gserviceaccount.com`), push subscription `gmail-inbox-push` → `https://cda-demo.vercel.app/api/email/gmail-push?token=<GMAIL_PUSH_SECRET>`, never expires, ack deadline 60 s |
| ElevenLabs trigger | Ellie → Channels → **Custom Channel**, connection **CDA email** (`trigger_cxn_4401m321spm3f9nah3y9bsn5mn4n`), Reply Webhook URL `https://cda-demo.vercel.app/api/email/ellie-reply`. Separate from Instagram's trigger |
| Reply or draft | `email_mode` = `auto` or `draft`, a dynamic variable placeholder on the **Aida** agent |

### How it works

```
Customer email → Gmail → Pub/Sub → /api/email/gmail-push
     → rules skip codes, alerts, newsletters, no-reply senders   (no credits spent)
     → Ellie, through the "CDA email" Custom Channel
Ellie's answer → /api/email/ellie-reply → reads email_mode on Aida
     → auto:  sent in the customer's thread        → label Ellie/Replied
     → draft: a Gmail draft in the customer's thread → label Ellie/Draft ready
```

A reply normally arrives within a few seconds. Every email is its own ElevenLabs conversation: a
Custom Channel conversation ends after one turn. The customer's earlier messages are quoted in
their email, and the customer memory (section 16) carries the rest.

What Ellie receives (at most 6,000 characters of text, attachments named but not opened):

```
[Email to CDA customer care]
From: Jane Doe <jane@example.com>
Subject: Oven shows F3

<the email text>
```

Her prompt tells her to write **only the body** of the reply. If she still starts it with those
header lines, the web app removes them before sending (`plainReply` in `src/lib/emailParse.ts`),
along with any markdown. The reply goes out as `"CDA Customer Care (demo)" <cda_domestic_appliances@…>`,
with `Re:` on the subject and In-Reply-To / References, so it lands in the customer's thread.

### Which emails get a reply

Two filters, so Ellie never answers robots:

1. **Rules in the web app** (`src/lib/emailParse.ts`), before Ellie is involved: no-reply and
   robot senders (`no-reply`, `security@`, `notification@`, `mailer-daemon`…), notification
   services (facebookmail.com, mail.instagram.com, accounts.google.com), subjects like
   "security code", "sign-in attempt", "out of office", Gmail's Promotions / Social / Forums tabs,
   newsletter and bulk headers, bounces, and more than 5 emails from one sender in an hour.
   Checked against the real mailbox: every Google, Instagram and Facebook code or alert was
   skipped, and every email written by a person went through.
2. **Ellie's judgement**: her prompt ("Email only") tells her to answer exactly `SKIP` when an
   email was not written by someone who wants help from CDA.

Mail older than 24 hours, mail from the mailbox itself, and anything already handled is never
answered. Replies sent automatically carry `Auto-Submitted: auto-replied`, so out-of-office robots
do not answer back and start a loop.

### Labels in Gmail

Under **Ellie** in Gmail's side bar:

| Label | Meaning |
|---|---|
| **Ellie/Replied** (green) | Ellie's answer was sent. The email is marked read |
| **Ellie/Draft ready** (orange) | Draft mode: open the email, check the draft under it, press **Send**. The email stays unread |
| **Ellie/Skipped** (grey) | Not answered: a robot, a newsletter, or Ellie said SKIP. The reason is on the staff page |
| **Ellie/Failed** (red) | Ellie or Gmail could not be reached. Answer it by hand |

### Switching between sending and drafts

The switch is the dynamic variable placeholder **`email_mode`** on the agent **Aida – CDA copilot**
(`auto` or `draft`; anything unreadable counts as `draft`). It is read again for every reply.

- **Website**: `/admin` → staff password → **Email** tab → *Send automatically* / *Draft for
  staff*. The card also lists the latest emails with what happened to each and an "Open in Gmail" link
- **Claude** with the ElevenLabs connector: *"Set the dynamic variable placeholder email_mode on the
  agent Aida – CDA copilot to draft"* (or `auto`)

It sits on Aida, not Ellie, on purpose: a placeholder on Ellie could change how her channel triggers
start conversations (an `integration__` placeholder once took Telegram down). Aida has no channels,
and nothing in her prompt uses it.

### The routes

| Route | Called by | Protected by |
|---|---|---|
| `POST /api/email/gmail-push` | Google Pub/Sub | `?token=` = `GMAIL_PUSH_SECRET` |
| `POST /api/email/ellie-reply` | ElevenLabs (Custom Channel replies) | HMAC signature, `EMAIL_CHANNEL_SIGNING_SECRET` |
| `GET /api/email/gmail-watch` | Vercel Cron, daily at 06:00 UTC (`vercel.json`) | `Bearer CRON_SECRET` (or `GMAIL_PUSH_SECRET` by hand) |
| `GET/POST /api/email/mode` | The **Email** tab on `/admin` | Aida staff token |

All four are exempt from the site password in `src/proxy.ts`. Gmail stops posting 7 days after a
watch starts, so the daily cron renews it and also catches up on anything a missed notification
left behind.

**Supabase** (`supabase/schema.sql`): `email_messages` has one row per email — who wrote, subject,
status, reason, Ellie's conversation. Never the text. Inserting the row is the lock that stops a
repeated notification from answering twice. `gmail_state` holds how far the inbox has been read.

### Setup steps (done 21 September 2026)

1. Google Cloud → new project → link billing → enable **Gmail API** and **Cloud Pub/Sub API**
2. **OAuth consent screen**: Internal. **Credentials** → OAuth client ID → **Desktop app**
3. Consent as the CDA mailbox with scope `gmail.modify` → refresh token (a one-off local script)
4. Pub/Sub: topic `gmail-inbox` → grant **Pub/Sub Publisher** to `gmail-api-push@system.gserviceaccount.com`
   → push subscription to `/api/email/gmail-push?token=…`, never expires, ack deadline 60 s
5. ElevenLabs → Ellie → Channels → Custom Channel → Add trigger → **new** connection → Reply Webhook URL
   `/api/email/ellie-reply` → copy the Inbound URL, Inbound Secret and Outbound Signing Secret
6. Run `supabase/schema.sql`; set the email variables (section 7) in `.env.local` and on Vercel
7. Start the watch once: `GET /api/email/gmail-watch` with `Authorization: Bearer <GMAIL_PUSH_SECRET>`

### Verified by test (21 September 2026)

- **Local, no credits spent** (33 checks, Ellie's reply faked with a correctly signed webhook in
  the documented format): every route refuses a missing or wrong secret or signature; the site is
  still locked; the switch reads and writes Aida; the watch starts and renews; a reply becomes
  exactly one draft in the right thread with the right headers and UTF-8 text; the same reply
  delivered twice makes no second draft; `SKIP` → Skipped; labels are created and swapped
- **Live**: an email in **auto** mode got Ellie's reply in the same thread, labelled Ellie/Replied;
  an email in **draft** mode got no reply, and the draft waited in the thread (Ellie/Draft ready)
  until staff pressed Send
- Two problems found by the live test and fixed the same day: the reply text is at
  `data[].event.agent_response` (it was read one level too high, so the first answer was never
  sent), and Ellie copied the `[Email to CDA customer care]` / From / Subject header into her reply

### Notes

- **Freshdesk is no longer used for email.** Remove its trigger from Ellie (Channels → Freshdesk), or
  customers could get a second answer if Freshdesk starts importing mail again. Old Freshdesk
  conversations (`_fd_` ids) are still recognised by the customer memory
- The refresh token belongs to the CDA mailbox. If its password changes or access is removed in the
  Google account, email stops (Ellie/Failed, or nothing at all): run the consent again
- The Custom Channel is **Alpha** and text only: Ellie cannot open attachments, and her prompt tells her so

---

## 6. Web chat and voice (ElevenLabs hosted page)

| Item | Value |
|---|---|
| Link | https://elevenlabs.io/app/talk-to?agent_id=agent_3601m2p374tce96b7p6hdfz5f1tv |
| QR code | `CDA_Demo_Assets/Ellie_voice_chat_QR.png` (parent project folder, not in this repository) |
| Modes | Voice + text input |
| Page text | "Talk or chat with Ellie, the virtual assistant for CDA kitchen appliances. NDI demo - not an official CDA service." |
| Buttons | "Questions? Ask Ellie" / "Talk to Ellie" |

### Setup

Agent → **Channels** → **Widget** → Interface: text input ON → shareable page text → Publish.

To put the bubble on any website, paste before `</body>`:
```html
<elevenlabs-convai agent-id="agent_3601m2p374tce96b7p6hdfz5f1tv"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
```
If used on a real site, add the domain in **Security → Allowlist**.

> This page is **not password protected**: anyone with the link (or the agent ID) can talk to Ellie and use
> ElevenLabs credits. To lock it, turn on authentication in the agent's **Security** settings. The public
> page, QR code and widget then stop working. The web app signs its sessions with the API key, so it
> should keep working; the other channels are not tested with authentication on yet — test each one after the change.

---

## 7. Custom web app (Next.js on Vercel)

| Item | Value |
|---|---|
| Folder | This repository (local folder `cda-web-app/`) |
| Repository | `github.com/new-digital-intelligence-com/cda` (branch `main`) |
| Live URL | https://cda-demo.vercel.app (password protected) |
| Stack | Next.js 16, React 19, Tailwind 4, `@elevenlabs/react` |
| Style | CDA website colours (red `#e84339`, dark `#222222`, blue-grey `#9dbdcb`), no CDA logo, "NDI demo" banner |

### Features

- **Chat**: text-only session, markdown replies, suggested questions
- **File upload**: images (PNG/JPG/WEBP/GIF) and PDFs, max 3 per message, 10 MB each (`uploadFile` + `sendMultimodalMessage`)
- **Voice**: real-time WebRTC, animated orb, mute, end call, live transcript
- **Avatar**: Anam video call with our own Ellie face and live captions, max 3 minutes per call (see section 9)
- **Aida**: the fourth tab. A customer joins a live call with CDA staff with a room code, or opens a
  new room for staff to join (section 17). Anyone here is always a **customer**; staff work from `/admin`
- **Admin page** `/admin` (not linked from the customer site): staff only, behind the Aida staff
  password — Aida rooms, the email reply switch, and customers with AI insights (section 18)
- **Other channels card**: buttons that open Email (Gmail compose to the support address), the Telegram bot and an Instagram DM (`src/components/ChannelLinks.tsx`)
- **Your CDA account**: create an account and link Telegram, email and other channels to it with a
  short code, so Ellie recognises the same person everywhere (section 16)
- **Email me this conversation**: under the chat, the voice transcript and after an avatar call. The
  text comes from ElevenLabs' own transcript (`POST /api/transcript/email`), never from the browser,
  and only the browser that had the conversation can send it. A chat or call is ended first, so the
  email is complete. Sent from `gmail_sender`. A customer signed in to their CDA account gets it
  with **one click** at the address they signed up with (shown, with an "another address" link);
  anyone else types an address
- **Password lock**: every page and API route requires `SITE_PASSWORD` (checked in `src/proxy.ts` and again in the API routes); site stays locked if the variable is missing

### Important files

| File | Purpose |
|---|---|
| `src/components/AssistantApp.tsx` | Chat, voice and upload logic |
| `src/app/api/elevenlabs/signed-url/route.ts` | Creates chat sessions (API key stays on the server) |
| `src/app/api/elevenlabs/conversation-token/route.ts` | Creates voice sessions |
| `src/components/AvatarPanel.tsx` | Avatar tab (Anam SDK video, captions, end call) |
| `src/app/api/anam/session/route.ts` | Creates the Anam session token joined to Ellie (both API keys stay on the server) |
| `src/proxy.ts`, `src/lib/auth.ts`, `src/app/login/` | Password lock |
| `src/lib/emailInbox.ts`, `src/lib/gmail.ts`, `src/lib/emailParse.ts`, `src/lib/emailMode.ts`, `src/app/api/email/` | The email channel (section 5) |
| `src/components/aida/EmailModeCard.tsx` | Staff switch between sending and drafts, and the latest emails (the **Email** tab on `/admin`) |
| `vercel.json` | Daily cron that renews the Gmail watch |

### Environment variables (Vercel → Settings → Environment Variables, and `.env.local` locally)

| Name | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | Server-side ElevenLabs key |
| `ELEVENLABS_AGENT_ID` | `agent_3601m2p374tce96b7p6hdfz5f1tv` |
| `SITE_PASSWORD` | Password for the demo site |
| `ANAM_API_KEY` | Anam API key (lab.anam.ai) |
| `ANAM_AVATAR_ID` | Avatar shown in the Avatar tab: Sofia (our Ellie picture) `90e0c565-6c16-42a2-bd45-255f904df7a2` |
| `ANAM_MAX_SESSION_SECONDS` | `180` (free plan maximum; the code default is also 180) |
| `SUPABASE_URL` | Supabase project URL for the customer memory (section 16) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — **server only, never in the browser** |
| `AGENT_TOOL_SECRET` | Shared secret the agent's tools send in the `x-cda-agent-secret` header |
| `ELEVENLABS_WEBHOOK_SECRET` | Signing secret of the post-call webhook (section 16) |
| `FRESHDESK_API_KEY` | Freshdesk API key, used to find who wrote an email ticket (section 16) |
| `FRESHDESK_SUBDOMAIN` | `newdigitalintelligence-help` |
| `LIVEKIT_URL` | LiveKit Cloud project URL, `wss://….livekit.cloud` (Aida rooms, section 17) |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit Cloud project key and secret — server only |
| `AIDA_AGENT_ID` | `agent_2601m31rbrn8emrbfe8vgxgxdta9`, the Aida copilot agent |
| `AIDA_STAFF_PASSWORD` | Password that makes someone CDA staff in Aida rooms (separate from `SITE_PASSWORD`) |
| `gmail_sender` | `cda_domestic_appliances@new-digital-intelligence.com` — sends conversation emails (lower-case name) |
| `gmail_app_password` | Gmail app password for that mailbox (16 characters) — server only |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client (Desktop) of project `cda-email-509312` — the email channel (section 5) |
| `GMAIL_REFRESH_TOKEN` | The CDA mailbox's Gmail sign-in, scope `gmail.modify` — server only |
| `GMAIL_PUBSUB_TOPIC` | `projects/cda-email-509312/topics/gmail-inbox` |
| `GMAIL_PUSH_SECRET` | Random secret in the Pub/Sub push URL (`?token=`) |
| `CRON_SECRET` | Random secret Vercel Cron sends to `/api/email/gmail-watch` |
| `EMAIL_CHANNEL_INBOUND_URL` | Inbound Webhook URL of Ellie's "CDA email" Custom Channel trigger |
| `EMAIL_CHANNEL_INBOUND_SECRET` | That trigger's Inbound Secret (sent as `X-Webhook-Secret`) |
| `EMAIL_CHANNEL_SIGNING_SECRET` | That trigger's Outbound Signing Secret (checks Ellie's replies) |
| `ANTHROPIC_API_KEY` | Anthropic API key for the AI insights on `/admin` (section 18) — server only |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5` (small and fast; the code default is the same) |

After changing a variable on Vercel → **Redeploy**.

### Run locally

```bash
npm install
npm run dev     # http://localhost:3000
```

Commits are pushed with author **HelmiDev03**; Vercel deploys `main` automatically.

---

## 8. Instagram (Make.com + ElevenLabs Custom Channel)

ElevenLabs has **no native Instagram channel**, so Make.com passes messages in both directions.

| Item | Value |
|---|---|
| Instagram account | **@new_digital_intelligence** (Business account), IG user ID `17841430407573788` — since 21 Sep 2026 |
| Meta app | A **new** Meta developer app (created 21 Sep 2026), **Published** |
| Meta use case | Manage messaging & content on Instagram → **API setup with Instagram login** |
| Previous account and app | @samrasellimi (`17841437047562810`), app "cda demo" (`1869137394246515`, Instagram app `1101309845810502`) — Meta blocked its API access; no longer used |
| Permissions | `instagram_business_basic`, `instagram_business_manage_messages` (Standard Access, no App Review) |
| Webhook field | `messages` (subscribed) |
| Privacy policy | Public Google Doc (required to publish) |
| Make.com | Team "My Team" (eu1), **free plan** (1,000 operations/month) |
| ElevenLabs | Agent → Channels → **Custom Channel** trigger |

### How it works

```
Customer DM → Meta webhook → Make "IG – Instagram in" → ElevenLabs Custom Channel → Ellie
                                                                                     │
Customer gets DM ← Instagram Send API ← Make "IG – Ellie reply out" ← reply webhook ←┘
```

### Make scenario 1: `IG – Instagram in` (webhook `instagram-in`)

```
Webhooks (instagram-in)
  └─ Router
      ├─ Route 1 — filter "Meta verification" (hub.verify_token = verify token)
      │     └─ Webhook response: status 200, body = hub.challenge
      └─ Route 2 — filter "Instagram DM" (text exists, sender ≠ own account, not an echo)
            └─ Data store: Get record (key = sender ID) from "ig_conversations"
                 └─ Router
                     ├─ "Continue conversation" (record exists and updated < 10 min ago)
                     │     └─ HTTP POST to Custom Channel with conversation_id → save record
                     └─ "New conversation" (no record or older than 10 min)
                           └─ HTTP POST to Custom Channel without conversation_id → save record
```

- HTTP header `X-Webhook-Secret` = Custom Channel **Agent Input** secret
- Request body:
  ```json
  {
    "data": { "type": "user_message", "text": "<escaped DM text>", "user_identifier": "<sender id>" },
    "user_message_id": "<sender id>|<message id>",
    "conversation_id": "<only when continuing>",
    "dynamic_variables": { "instagram_id": "<sender id>" }
  }
  ```
- Text is encoded with `escapeJSON()` so quotes and line breaks don't break the request
- The sender ID is put inside `user_message_id` so the reply scenario knows who to answer
- `instagram_id` is stored on the ElevenLabs conversation; the web app reads it from there to
  recognise the person (section 16). It is **not** bound to any tool parameter
- **Data store** `ig_conversations` (data structure `ig_conversation`: `conversation_id`, `updated_at`) remembers each customer's conversation for 10 minutes

### Make scenario 2: `IG – Ellie reply out` (webhook `ellie-reply`)

```
Webhooks (ellie-reply)  ← Custom Channel "Reply Webhook URL"
  └─ Iterator over data[]
       └─ filter: type = agent_response
            └─ HTTP POST https://graph.instagram.com/v25.0/17841430407573788/messages
                 header Authorization: Bearer <Instagram token>
                 body: {"recipient":{"id":"<sender id from user_message_ids>"},
                        "message":{"text":"<escaped reply, max 1,000 chars>"}}
```

### Setup steps (summary)

1. **Instagram**: account must be Professional (Business/Creator)
2. **Meta developer app**: Create app → use case "Manage messaging & content on Instagram"
3. **App roles → Roles** → add the account as **Instagram Tester** → accept on instagram.com/accounts/manage_access/ (Tester invites)
4. **API setup with Instagram login** → Generate access tokens → Add account → copy token
5. Extend token to 60 days:
   ```
   https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<TOKEN>
   ```
6. **Make**: create webhooks `ellie-reply` and `instagram-in`
7. **ElevenLabs** → agent → Channels → **Custom Channel** → Add trigger → Reply Webhook URL = `ellie-reply` → copy Inbound URL + secrets
8. **Meta** → Configure webhooks → Callback URL = `instagram-in`, Verify token = the token used in the Make filter → **Verify and save**
9. Subscribe the account to `messages` (dashboard, or `POST https://graph.instagram.com/v25.0/me/subscribed_apps?subscribed_fields=messages&access_token=<TOKEN>`)
10. Build both Make scenarios (done through the Make API, tested with a public echo service before switching to real endpoints)
11. **App settings → Basic** → Privacy Policy URL → **Publish** the app (webhooks are only delivered when published)

### Switching to another Instagram account or Meta app (done 21 Sep 2026)

Nothing changes in ElevenLabs, and the Make webhooks keep their URLs. Only these do:

1. New app: **API setup with Instagram login** → Add account → **Generate token** (steps 1–4 above)
2. `GET https://graph.instagram.com/v25.0/me?fields=user_id,username&access_token=<TOKEN>` → the
   new IG user ID (`user_id`)
3. **Make**: in "IG – Instagram in" replace the old IG user ID in the "Instagram DM" filter; in "IG –
   Ellie reply out" replace it in the URL and put the new token in the Authorization header
   (done through the Make API; the old blueprints were backed up first)
4. Subscribe the account to `messages` (step 9)
5. New app → **Configure webhooks**: Callback URL = the `instagram-in` webhook URL (Make → Webhooks),
   Verify token = the one in the "Meta verification" filter → Verify and save → subscribe **messages**
6. Privacy Policy URL → **Publish** (step 11)
7. Website: the Instagram button in `src/components/ChannelLinks.tsx`

### Notes

- Custom Channel is **Alpha** and **text only**
- Instagram replies must be sent within **24 hours** of the customer's message (Ellie answers in seconds)
- Instagram message limit is 1,000 characters; the prompt keeps replies under 900
- Don't brand the Instagram account or Meta business as "CDA" (Meta restricted a WhatsApp account named "CDA Customer Care")

---

## 9. Video avatar (Anam)

The web app's **Avatar** tab is a live video call with **our own Ellie face** (made from the same picture as
the HeyGen video). **Anam only draws the face** and moves the lips; Ellie on ElevenLabs still listens,
thinks and speaks, with the same prompt, voice and knowledge as every other channel.

| Item | Value |
|---|---|
| Platform | **Anam** (lab.anam.ai) |
| Anam plan | Free: 30 minutes a month, **3-minute calls**, 1 custom avatar, 1 call at a time |
| Avatar | **Sofia** = our Ellie picture (CDA background, headset), model **Cara 4** |
| Performance | Director Notes preset `warm`, expressivity 0.5 |
| Max call length | **180 seconds** (`ANAM_MAX_SESSION_SECONDS`, free plan maximum) |
| Captions | Live transcript under the video |
| Layout | **Horizontal** (1152×768) or **Vertical** (768×1152), picked before the call; the only two sizes Anam supports for Cara 4 |

> The "Olivia" persona that Anam's onboarding creates (its own prompt, voice and GPT model) is **not used**:
> the web app only borrows the Sofia face and plugs it into the ElevenLabs agent.

### How it works

```
Visitor (logged in to the web app) → "Start video call"
  → web app server POST /api/anam/session
       1. ElevenLabs: get a signed conversation URL for Ellie (API key stays on the server)
       2. Anam: create a session token (avatar Sofia, cara-4, max length, elevenLabsAgentSettings)
  → browser: Anam JavaScript SDK createClient(token) → streamToVideoElement → microphone on
  → Anam's engine joins Ellie on ElevenLabs server-to-server: speech → Ellie → voice → lip-synced face
```

### Setup steps

1. lab.anam.ai → sign up → **Avatars** → create an avatar from the picture (about 2 minutes)
2. lab.anam.ai → copy the **API key**
3. ElevenLabs agent → **user input audio format = PCM 16000 Hz** (Anam supports no other input format);
   output stays PCM 24000 Hz (Anam matches the output automatically)
4. Vercel → `ANAM_API_KEY`, `ANAM_AVATAR_ID`, `ANAM_MAX_SESSION_SECONDS` (section 7) → **Redeploy**

Optional (from Anam's guide): Turn **Eagerness** to *Eager* for faster replies; use the ElevenLabs
**V3 Conversational** voice model so tags like `[laughs]` also change the avatar's expression.

### Plans (anam.ai/pricing, 17 Sep 2026)

| Plan | Price | Minutes a month | Call length | Custom avatars | Notes |
|---|---|---|---|---|---|
| Free | $0 | 30 | 3 min | 1 | 1 call at a time |
| Starter | $12 | 50 | 5 min | 2 | Commercial use, $0.16 per extra minute |
| Explorer | $49 | 250 | 10 min | 3 | No watermark (embed), 3 calls at a time |
| Growth | $299 | 2,000 | 2 h | 5 | 5 calls at a time |

ElevenLabs credits are used as for a voice call (about 600 credits a minute). Creating a session token is free;
Anam minutes are only used once the video call starts.

### Previous avatar: HeyGen LiveAvatar (removed 17 Sep 2026)

The first Avatar tab used a HeyGen **LiveAvatar** embed (commit `69eb3da`) with a stock avatar. It was replaced because:
- avatars made in the **HeyGen app** can't be used in LiveAvatar, and an own image avatar needs LiveAvatar **Essential ($99/month, 720p)**
- the free plan stops calls after **120 seconds**, adds a watermark and has no own avatar

To bring it back: restore `src/app/api/liveavatar/embed/route.ts` and the old `AvatarPanel.tsx` from git history,
keep the agent's output format at PCM 24000 Hz and add the `LIVEAVATAR_*` variables again.

---

## 10. Slack (in progress)

ElevenLabs has a **native Slack integration** (Alpha) with two triggers: **Channel Message** and
**Direct Message**. No Make.com and no code.

| Option | Bot name in Slack | In channel threads |
|---|---|---|
| Quick connect (ElevenLabs' shared Slack app, OAuth) | "Eleven" (cannot be renamed) | @mention needed on every message |
| **Own Slack app (chosen)** | **CDA_Support** | Mention-only **or** all messages (set by Slack events) |

**Status (17 Sep 2026):** the "New Digital Intelligence" Slack workspace hit the **free plan limit of 10 apps**,
so the app goes into a separate demo workspace (e.g. "CDA Demo") or an unused app must be removed first.

### Setup steps

1. https://api.slack.com/apps → **Create New App** → **From a manifest** → pick the workspace → **YAML**:
   ```yaml
   display_information:
     name: CDA_Support
     description: CDA customer assistant (NDI demo)
     background_color: "#e84339"
   features:
     app_home:
       home_tab_enabled: false
       messages_tab_enabled: true
       messages_tab_read_only_enabled: false
     bot_user:
       display_name: CDA_Support
       always_online: true
   oauth_config:
     scopes:
       bot:
         - app_mentions:read
         - channels:history
         - channels:join
         - channels:manage
         - chat:write
         - files:read
         - groups:history
         - groups:write
         - im:history
         - reactions:write
   settings:
     org_deploy_enabled: false
     socket_mode_enabled: false
     token_rotation_enabled: false
   ```
2. **Install App** → **Install to Workspace** → copy the **Bot User OAuth Token** (`xoxb-…`) and the
   **Signing Secret** (Basic Information → App Credentials)
3. ElevenLabs → **Integrations** → **Add integration** → **Slack** → **Bring your own bot** → paste token and
   signing secret → copy the **Events URL** and **Interactivity URL** shown on the connection page
4. Slack app → **Event Subscriptions** → on → Request URL = Events URL → bot events:
   - mention-only: `app_mention`
   - all messages: `message.channels` and `message.groups`
   - direct messages (either mode): `message.im`

   Never subscribe to `app_mention` **and** `message.channels`/`message.groups` together (double replies).
5. Slack app → **Interactivity & Shortcuts** → on → Request URL = Interactivity URL → reinstall the app if Slack asks
6. ElevenLabs agent → add trigger **Channel Message** (Channel ID starting with `C`, "Only humans") and
   trigger **Direct Message** → Save
7. Private channels only: type `/invite @CDA_Support` in the channel
8. Test in the channel and in a direct message

### How it works

```
Slack message → CDA_Support app → ElevenLabs Slack trigger → Ellie → reply in a thread
```

- One Slack thread = one conversation (Ellie remembers the thread)
- An `:eyes:` reaction shows while Ellie is writing
- Images and PDFs attached in Slack are read (file input is on for this agent)
- One Channel Message trigger per channel, one Direct Message trigger per Slack connection
- If replies look badly formatted (Slack uses its own "mrkdwn"), add a "Slack only" style rule to the prompt

---

## 11. Admin through Claude (ElevenLabs connector)

Claude acts as the **NDI Admin Service** for the agent.

1. Claude (claude.ai or Claude Desktop) → **Settings → Connectors**
2. Find **ElevenLabs** → **Connect** → sign in → choose workspace → **Authorize**
   (or **Add custom connector** with URL `https://api.elevenlabs.io/v1/mcp`)
3. In the connector's tool settings, set delete/update tools to **ask before running**

Example prompts:
- "List my ElevenLabs agents and summarise CDA Assistant – Demo's settings."
- "Show the last 10 conversations of CDA Assistant – Demo and list questions it couldn't answer."
- "How big is CDA Assistant – Demo's knowledge base?"
- "Estimate the cost per conversation of CDA Assistant – Demo."
- "Set the dynamic variable placeholder email_mode on the agent Aida – CDA copilot to draft." (or `auto`):
  switches Ellie's email replies between Gmail drafts and sending straight away (section 5)

---

## 12. Credentials and where they live

| Credential | Stored in | Notes |
|---|---|---|
| ElevenLabs API key | Vercel env vars, `cda-web-app/.env.local` | Was shared in chat → rotate after the demo |
| Telegram bot token | ElevenLabs Telegram connection | From @BotFather |
| Freshdesk API key | ElevenLabs Freshdesk connection, Vercel env vars, `.env.local` | Only for old Freshdesk tickets now (section 16). Was shared in chat → rotate or close Freshdesk |
| Google OAuth client secret + Gmail refresh token | Vercel env vars, `.env.local` | Full access to the CDA mailbox. The client secret was shared in chat → reset it in Google Cloud → Credentials after the demo, then run the consent again |
| `GMAIL_PUSH_SECRET`, `CRON_SECRET` | Vercel env vars, `.env.local`; the push secret is also in the Pub/Sub subscription URL | Generated randomly |
| Email Custom Channel secrets (inbound + signing) | ElevenLabs "CDA email" trigger, Vercel env vars, `.env.local` | Shared in chat → regenerate after the demo |
| Anthropic API key | Vercel env vars, `.env.local` | Only for the insights on `/admin`; costs a fraction of a cent per insight |
| Google Drive access | ElevenLabs Google Drive integration | Read-only, picked files only |
| Custom Channel secrets (input/output) | ElevenLabs trigger; input secret in Make HTTP header | |
| Instagram access token | Make scenario "IG – Ellie reply out" (Authorization header); a copy in `.env.local` (`INSTAGRAM_ACCESS_TOKEN`, not used by the web app) for API checks | **Expires every 60 days** (current one ~20 Nov 2026). Shared in chat |
| Instagram app secret | Meta developer dashboard | Not used in Make |
| Webhook verify token | Make filter "Meta verification" + Meta webhook settings | |
| `SITE_PASSWORD` | Vercel env vars, `.env.local` | |
| Make API token `claude-setup` | Make → Profile → API access | Delete when no longer needed |
| Anam API key | Vercel env vars, `.env.local` | Was shared in chat → rotate after the demo |
| LiveAvatar API key + ElevenLabs key copy (old avatar) | LiveAvatar account | Not used any more → delete the LiveAvatar API key and secret |
| Slack bot token + signing secret | ElevenLabs Slack connection | From the CDA_Support Slack app |
| LiveKit API key + secret | Vercel env vars, `.env.local` | Aida rooms. Was shared in chat → rotate after the demo (cloud.livekit.io → project → Settings → Keys) |
| Supabase service role key | Vercel env vars, `.env.local` | Was shared in chat → rotate after the demo |
| `AGENT_TOOL_SECRET` | Vercel env vars, `.env.local`, ElevenLabs workspace secret | Generated randomly; must match in both places |
| `ELEVENLABS_WEBHOOK_SECRET` | Vercel env vars, `.env.local` | Shown once when the post-call webhook is created |

---

## 13. Maintenance calendar

| When | What |
|---|---|
| ~1 Oct 2026 | Freshdesk trial ends — email no longer needs it (section 5) |
| Daily, automatic | Vercel Cron renews the Gmail watch (it lapses after 7 days without renewal) |
| Early/mid Oct 2026 | Make free operations reset (1,000/month) |
| 17 Oct 2026 | ElevenLabs Creator credits reset |
| **Before ~20 Nov 2026** | **Refresh the Instagram token** (generated 21 Sep 2026, valid 60 days; link in section 8) and update the Make reply scenario header. Meta has no longer token; each refresh gives 60 more days |
| Monthly | Anam free plan gives 30 avatar minutes |
| After the demo | Rotate the ElevenLabs API key (update Vercel), rotate the Anam API key, **rotate the Supabase service role key**, **rotate the LiveKit key**, **reset the Google OAuth client secret** (then run the Gmail consent again), regenerate the email Custom Channel secrets, delete the Make API token and the old LiveAvatar key |
| When CDA content changes | Update the PDFs in Drive (auto sync) |

---

## 14. Parked / not yet built

| Channel | Status | What's needed |
|---|---|---|
| **Slack** | In progress | Slack app in a workspace below the app limit, then the steps in section 10 |
| **Avatar for the CDA demo** | Optional | Anam Explorer ($49/month): no watermark, 10-minute calls, 250 minutes (section 9) |
| **WhatsApp** | Parked | Meta restricted the WhatsApp Business account; needs an appeal and an own brand name. Live calls also need a 2,000/day messaging limit |
| **Phone number** | Parked | No real phone number; the SIP import of a mobile number was removed (mobile SIMs can't route to SIP) |
| **Copilot mode** | Partly built | Email drafts for staff (section 5) and Aida rooms for live calls (section 17). Other channels still reply directly |

### Phone calls: what's needed

ElevenLabs does not sell phone numbers. It connects numbers from **Twilio**, any **SIP trunk** provider
(Telnyx, Plivo, Bandwidth, Vonage…) or **Exotel**. Twilio is not required, but it is the easiest.

| Need | Details |
|---|---|
| Phone company account | **Twilio** (paste Account SID + Auth Token or an API key; ElevenLabs configures the number automatically) **or** a SIP provider (SIP address, TCP/TLS transport, username + password) |
| A number that can receive calls | Must be **bought** in that account (a Twilio "verified caller ID" only allows outbound calls). UK numbers usually need an ID/address check. Small monthly fee + per-minute fee |
| ElevenLabs | **Agents → Phone Numbers → Import** → assign Ellie. Creator plan is enough. **No audio change needed**: phone audio is handled separately from the agent's audio format settings |
| Protection against credit drain | Anyone can call a public number: set a **max call duration** (e.g. 5 min), a **daily call limit** and a **concurrency limit** |
| Prompt tweaks | Already: 1–3 short sentences on phone. Add: read phone numbers slowly, no web links (offer email instead), say early that it's an AI and the call may be recorded |
| Optional | **Transfer to number** tool (hand the call to a human, e.g. CDA customer care); **outbound "Ellie calls you"** with your own mobile as Twilio verified caller ID (no bought number, Twilio per-minute charges) |

Cheapest test: **Twilio free trial** + one Twilio number → import into ElevenLabs → assign Ellie. Trial calls
play a short "trial account" message, so upgrade Twilio before showing it to CDA. A normal mobile SIM cannot be used.

### More channel ideas

| Channel | How | Cost | Effort |
|---|---|---|---|
| **Facebook Messenger** | Same as Instagram: Make.com + Custom Channel, same Meta app | Free (needs a Facebook Page) | Low (copy the Instagram scenarios) |
| **WhatsApp** | Native ElevenLabs (messages and voice calls) | Free | Blocked while Meta restricts the account; voice calls need a 2,000/day messaging limit |
| **Intercom / Zendesk** | Native ElevenLabs triggers | Paid after a trial | Medium |

Make.com free plan = **1,000 operations a month shared by all scenarios** (each Instagram message uses several),
enough for a demo but not for real traffic.

---

## 15. Troubleshooting and lessons learned

| Problem | Cause / fix |
|---|---|
| Dashboard test works but a channel doesn't | Changes are still a **draft** → click **Publish** |
| Telegram bot never answers, webhook is correct | Old agent was broken → a fresh agent with identical settings worked |
| "RAG storage limit exceeded" | Too many documents (e.g. a website crawl) → remove documents or upgrade |
| "This request exceeds your quota limit" | ElevenLabs credits used up → upgrade or wait for reset |
| Documents synced but Ellie doesn't know them | Documents weren't **attached** to the agent and published |
| Ellie refuses to read an uploaded file | A Telegram "text only" rule applied everywhere → rules are now scoped per channel |
| Meta: "Insufficient developer role" | Add the Instagram account as **Instagram Tester** and accept the invite |
| Meta webhook "couldn't be validated" | Make must answer with `hub.challenge`; filter must compare `hub.verify_token` |
| Instagram DMs don't arrive | Meta app must be **Published** (needs a privacy policy URL) |
| Freshdesk replies twice | Freshdesk's own AI agent (Freddy) is on → keep it off (Freshdesk is no longer used for email) |
| An email gets no reply and no Ellie label | Watch lapsed or Pub/Sub not delivering: open `/api/email/gmail-watch` with the push secret (section 5), then check Vercel's function logs for `gmail-push` |
| Email labelled **Ellie/Failed** | Ellie or Gmail could not be reached; the reason is on the **Email** tab of `/admin`. Answer it by hand. "Google sign-in failed: invalid_grant" in the logs → run the Gmail consent again |
| A customer's email labelled **Ellie/Skipped** | A rule or Ellie took it for a robot; the reason is on the staff card. Answer it by hand, and adjust the rules in `src/lib/emailParse.ts` if it keeps happening |
| A customer gets two answers to one email | The old Freshdesk trigger is still on Ellie → remove it |
| Ellie's email reply starts with `[Email to CDA customer care]`, `From:`, `Subject:` | She copied the header she was given. Her prompt asks for the body only and the web app strips those lines (fixed 21 Sep) |
| `email_mode` is not in the Aida dashboard's **Vars** panel | Expected: the panel only lists variables used as `{{…}}` in the agent. It exists (check through the API); change it on `/admin` (Email tab) or through Claude |
| Ellie's email answer is in ElevenLabs but never sent; the email stays "Ellie is writing…" | The reply webhook's text is at `data[].event.agent_response`, not `data[].agent_response` (the first live test on 21 Sep hit exactly this; fixed). ElevenLabs shows `delivery_status: success` because the route answered 200 |
| Voice widget test error "draft_from_user_id" | Use the **Inline** test mode or refresh the page |
| Avatar call fails to start | The real reason is in the browser console (F12 → Console) and the Vercel function logs. Check the `ANAM_*` variables, that the agent's input format is PCM 16000 Hz, and the Anam plan's call length (old LiveAvatar lesson: `max_session_duration (180s) exceeds the maximum allowed (120s)`) |
| Our HeyGen "Ellie" avatar can't answer live | HeyGen app avatars only make recorded videos → recreate the face from the same picture on a live platform (done with Anam, free) |
| Slack: "… has reached its app limit" | Free Slack workspaces allow 10 apps → use another workspace or remove an unused app |
| Slack bot answers twice | The Slack app subscribes to both `app_mention` and `message.channels`/`message.groups` → keep one mode |

---

## 16. Cross-channel customer memory

Ellie recognises the same person on every channel and remembers what they asked before. A customer
creates an account on the website, then links each channel by pasting a short code into it.

**Ellie never asks anyone to identify themselves.** Someone she cannot place is simply helped as
normal. Recognition is something the customer switches on, not something she interrogates them for.

### How it works

```
Website:  create account  ->  "+ Add a channel"  ->  CDA-4F2K9M
                                                      |
                              paste that code into Telegram (or email, ...)
                                                      |
                              that channel is now linked and verified

Any message on any channel
   -> customer_lookup(system__conversation_id)
   -> known?  greet by name, may refer to the last few notes
      unknown? just help, say nothing about it

Conversation ends -> post-call webhook -> one short note saved
```

### What the customer sees

On the website, under "Message Ellie on your app", there is a **Your CDA account** panel
(`src/components/AccountPanel.tsx`):

1. **Create account** — name, email address, password. Signing up links that address straight away
   and marks it verified, so email works with nothing else to do.
2. **Your channels** — every linked channel, each with a **Remove** button.
3. **+ Add a channel** — shows a code like `CDA-4F2K9M`. They paste it into Telegram (or send it
   from another email address). Ellie confirms, and that channel is linked and verified.

One code works once and expires after 30 minutes. A person can link **several accounts of the same
kind**: two email addresses, two Telegram accounts, and so on.

People who never create an account still get help exactly as before. They are simply remembered
per channel: the same Telegram chat, or the same browser, picks up where it left off.

**Robots are not customers.** No-reply and notification senders (e.g. `no-reply@mail.instagram.com`,
`noreply@facebookmail.com`) never get a record, and when Ellie answers `SKIP` to an email the record
made for its sender is dropped again, as long as it holds nothing else. Two first messages from the
same new person at the same moment make one record, not two. The robot records left from the
Freshdesk days were removed on 21 Sep 2026.

### What is stored, and what is not

**Supabase holds no messages.** Per conversation there is only:

- a row in `customer_conversations`: `conversation_id -> customer`, with no content at all
- once the conversation ends, **one line** in `customer_notes` (max 400 characters), for example
  *"Asked to book an engineer for a CDA hob."*

Ellie is given the **last 3** of those lines. Full transcripts stay in ElevenLabs, where retention
is set to unlimited (`retention_days: -1`).

Notes are written by the post-call webhook when a conversation **ends**, not while it is running,
and only for conversations that belong to a customer. Someone anonymous leaves nothing behind.

If a person chats on a channel **before** linking it, those notes are moved onto their account when
they redeem the code, so nothing said earlier is lost.

### How each channel is identified

The **only** dynamic variable used is `system__conversation_id`, because it is the one that exists
on every channel. This matters, see the warning below.

| Channel | How the person is identified |
|---|---|
| Telegram | The chat id is inside the conversation id: `conv_85_..._tg_6486763839` |
| Email | The web app knows the sender of every email it hands to Ellie. It ties the conversation to that address as soon as ElevenLabs names it, and `customer_lookup` waits up to a second for that to land (section 5). Old Freshdesk conversations: the ticket number in the conversation id (`..._fd_9`) |
| Website chat / voice / avatar | The server registers the conversation against the signed-in account, or the `cda_visitor` cookie, when the session is created |
| Instagram | Make sends `dynamic_variables: {"instagram_id": ...}` with each message. ElevenLabs stores it on the conversation, and the web app reads it from there (`GET /v1/convai/conversations/{id}`, only for Custom Channel conversations). Never bound to a tool. Linking with a code works since 21 Sep 2026 |
| Slack | `integration__slack_user_id` exists, but is not wired up yet |

> **Never bind a tool parameter to a channel-specific dynamic variable.** Doing so makes the
> conversation fail on every other channel with *"Missing required dynamic variables in tools"*, and
> giving `integration__telegram_chat_id` a placeholder stopped the Telegram trigger creating
> conversations at all. Both mistakes were made on 17 Sep 2026 and both took the channel down.
> If a channel's id is not in the conversation id, register the conversation server-side instead,
> the way the website does.

> The `_tg_<id>` and `_fd_<ticket>` endings are **not documented**. If ElevenLabs changes them, that
> channel quietly stops being recognised and everything else carries on.

### The database (Supabase)

Run `supabase/schema.sql` once (SQL Editor -> New query -> paste -> Run).

| Table | Holds |
|---|---|
| `customers` | the person: id, name, and their Supabase Auth user once they sign up |
| `customer_channels` | channel + key -> customer, with `verified`. **Several rows of the same kind are fine**, so one person can have two email addresses or two Telegram accounts |
| `link_codes` | the short codes: one use, 30 minutes |
| `customer_conversations` | conversation -> customer, so the post-call note knows where to go |
| `customer_notes` | one short line per conversation; Ellie sees the last 3 |

Row level security is on with no policies, so only the service role key can read it.

### Accounts

Supabase Auth, created through its admin endpoint with `email_confirm: true`, so nobody waits for a
confirmation email during a demo. The password is only ever checked by Supabase. After signing in
the app sets its own signed cookie holding the customer id, so there is no JWT refresh to handle.
The site password lock is unchanged and still wraps the whole site.

Signing up links that email address automatically and marks it verified.

### The routes in the web app

| Route | Called by | Protected by |
|---|---|---|
| `POST /api/agent/customer-lookup` | tool `customer_lookup` | `x-cda-agent-secret` header |
| `POST /api/agent/customer-link` | tool `customer_link` | `x-cda-agent-secret` header |
| `POST /api/agent/post-call` | ElevenLabs post-call webhook | HMAC signature |
| `GET/POST/DELETE /api/account` | the account panel | site password + account cookie |

The three `/api/agent/*` routes are exempt from `SITE_PASSWORD` in `src/proxy.ts` because ElevenLabs
calls them, not a browser. A lookup that fails always answers "not found" with status 200, so a
customer never sees an error because the database was slow.

### What is set up on the agent

| Thing | ID |
|---|---|
| Workspace secret `CDA_AGENT_TOOL_SECRET` | `DXmaQafUvJljsoKMs0nO` |
| Tool `customer_lookup` | `tool_9201m2rhvc78e339hna52s5jfryf` |
| Tool `customer_link` | `tool_0301m2rhvckwepns0q0dhn26xnvr` |
| Post-call webhook | `cdbf083668794fe0b107eb26730cdbc6` |

Both tools take only `conversation_id` (bound to `system__conversation_id`); `customer_link` also
takes the `code` the customer typed. There are **no dynamic variable placeholders** on the agent.
The prompt block is under "# Recognising the customer".

The agent API commits straight to the Main branch, which is at 100% of traffic with no draft, so
there is no separate Publish step.

### Verified by test

Run against the live site and the real Supabase project on 17 September 2026:

- wrong secret -> 401; unsigned post-call webhook -> 401
- unknown Telegram chat -> helped normally, no question asked
- account created -> email linked and verified automatically
- code redeemed from Telegram -> both channels on one customer, code refused on second use
- a Telegram chat held **before** linking keeps its notes after linking
- website chat, voice and the avatar carry the Telegram context for a signed-in person
- an unknown ticket number and a non-Freshdesk id -> "not found", no error

### Privacy

Customer records across channels are personal data under UK GDPR. For the demo use **fake
customers only**. Linking by code proves the channel belongs to the account, which a typed email
address never did. The prompt still makes Ellie confirm one detail before revealing anything
personal. The service role key is server-side only and must never be committed: this repository is
public.

---

## 17. Aida rooms (live calls with an AI copilot)

A live call on the website between CDA staff and a customer. Everyone can **talk or type**, the
call is **transcribed live**, and **Aida** — a second ElevenLabs agent — drafts a reply to every
customer message. **Only staff see the drafts**; an employee approves (the reply appears in the chat
as "CDA Support"), edits, or declines. This is the parked "Copilot mode", done as live rooms.

### Who is who

The role comes from **how you got in**, never from what you type. The name is only a label.

| | Gets in with | Sees |
|---|---|---|
| **CDA employee** | The **Aida staff password** (`AIDA_STAFF_PASSWORD`) on **`/admin`** → the **Aida rooms** tab: create, list, join, close | Everything, including Aida's drafts and Approve / Edit / Decline |
| **Customer** | The **📞 Aida** tab on the main site (behind the site password), or an invite link → `/aida/join` (no password at all). Join with a code or open a new room | Talk, chat and the transcript. **Never** the drafts |

Aida has **its own password**, separate from the site password: knowing the site password does
**not** make anyone staff. `/admin`, `/aida` (now only a redirect to `/admin`) and `/aida/join` are open past the site lock.

The staff sign-in is a signed token kept **per browser tab** (sessionStorage) and sent in the
`x-aida-staff` header, not a cookie. Changing `AIDA_STAFF_PASSWORD` signs every staff tab out.

The server writes the role into the LiveKit ticket. LiveKit does not let a participant change its
own attributes, so every browser can trust `participant.attributes.role`. A customer's browser
never receives drafts, and "CDA Support" messages are only accepted from employee participants.

> Testing alone: sign in as staff in one tab, then open the room's invite link in a **new tab** of
> the same browser. The new tab has no staff sign-in, so it joins as the customer.

### How it works

```
LiveKit room ── voice between everyone (microphone only) + chat + data messages
   │
Each browser transcribes ITS OWN microphone with ElevenLabs Scribe (scribe_v2_realtime)
   -> every line is known to come from the person who said it
   │
"Aida" runs in ONE browser: the employee who joined first (the host). If they leave, the next
employee takes over by themselves.
   customer line  -> sendUserMessage       -> Aida drafts a reply
   employee line  -> sendContextualUpdate  -> Aida takes note, stays quiet
   │
Drafts go ONLY to employees -> [Approve & send] [Edit] [Decline]
   │
Supabase keeps the room and every line, draft and decision (aida_rooms, aida_events)
```

Notes starting a draft such as `[Check]` or `[Needs a human decision]` are shown to staff as a label
and are **stripped** before anything is sent to the customer. A draft of `[No reply needed]` is
dropped silently.

The live transcript only starts **once a CDA employee is in the room**, so a customer waiting alone
does not spend transcription minutes.

### The Aida agent

| Setting | Value |
|---|---|
| Agent | `Aida – CDA copilot (drafts for staff)`, ID `agent_2601m31rbrn8emrbfe8vgxgxdta9` |
| Model | Gemini 3.7 Flash, temperature 0 — same as Ellie |
| Knowledge | The same 31 documents and RAG settings as Ellie (shared, not copied) |
| Prompt | Her own copilot rules, plus Ellie's "Company context", "Knowledge rules", "Safety" and "Handover to a human" sections |
| Mode | Text only, no first message, session limit 1 hour (the host reconnects her automatically) |
| Tools / webhook / channels | **None** |
| Dynamic variables | Only the placeholder `email_mode` (`auto` / `draft`): the switch for Ellie's email replies (section 5). Nothing in Aida's prompt uses it, so the dashboard's **Vars** panel does not list it; read or change it through the API, the Email tab on `/admin` or Claude |

She was **created fresh**, not with ElevenLabs' "duplicate agent": a duplicate could carry Ellie's
Telegram or email triggers, and two agents on one channel is how Telegram broke before. Ellie was
checked unchanged afterwards.

### The routes

All under `/api/aida/`, open past the site password and each checking for itself:

| Route | Who | What |
|---|---|---|
| `POST /api/aida/staff` | anyone | the Aida staff password → a staff token for this tab |
| `GET /api/aida/rooms` | staff token | open rooms for the lobby |
| `POST /api/aida/rooms` | anyone | create a room and get a ticket; a staff token makes you staff |
| `POST /api/aida/join` | anyone | join with a code; a staff token makes you staff |
| `GET/POST /api/aida/events` | room ticket | the record; customers cannot post drafts or decisions, and never get drafts back |
| `POST /api/aida/scribe-token` | room ticket | a one-use Scribe token, only for an open room |
| `POST /api/aida/copilot` | employee ticket | a text session with Aida |
| `POST /api/aida/close` | employee ticket, **or** staff token + room code | end the room for everyone — from inside it ("End room") or from the lobby ("Close") without joining |

An employee ticket is only ever issued to someone who sent a valid staff token, so it is enough on
its own for the last two.

Rooms expire after **4 hours**. Codes are 6 characters without I, O, 0 or 1, shown as `4F2-K9M`.

### Costs

| | |
|---|---|
| LiveKit Cloud | Free "Build" plan, no credit card: 5,000 participant-minutes a month, 100 at once |
| Live transcript | Scribe realtime, about $0.39 per hour of speech per speaker, from the ElevenLabs plan |
| Aida's drafts | Text only |

People talking to people through LiveKit uses **no** ElevenLabs voice credits.

### Setup

1. Run `supabase/schema.sql` again (it is now safe to re-run: it never drops or changes data)
2. LiveKit Cloud → new project → copy the URL, API key and API secret
3. Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `AIDA_AGENT_ID` and
   `AIDA_STAFF_PASSWORD` to `.env.local` **and** Vercel → Redeploy
4. Test: `/admin` → staff password → Aida rooms → Create room → Copy invite link → open it in a **new tab** as the
   customer. Headphones on both sides give the cleanest transcript.

### After a room ends

Closing is final: a closed room can **never be reopened**, and nothing more can be said, typed,
transcribed or drafted in it (every route answers `410`). Its **history stays readable**:

| Who | How |
|---|---|
| Staff | Lobby → **Closed rooms** → View (last 30), or "See the conversation & email it" when a room ends |
| Customer | Anyone with the **room code**: joining an ended room opens its history instead |

Staff see Aida's drafts and what was done with each; customers only see the conversation.

**Email the history**: once a room has ended, anyone reading it can have it emailed to the address
they type (`POST /api/aida/email`), from `gmail_sender`. A signed-in customer does not type it: one
click sends it to their account email. Staff always type an address. Customers get the
conversation; staff copies also list Aida's drafts. At most 10 emails per room, so the mailbox cannot be used for spam, and the
recipient address is not stored.

### Customers signed in to their CDA account

If the customer's browser is signed in to their CDA account on the website (section 16):

- they are **not asked for a name** — it comes from the account (`GET /api/aida/me`)
- the room is linked to them (`aida_rooms.customer_id`), and the host employee's browser hands Aida
  what CDA already knows about them from every channel (`GET /api/aida/context`), so her drafts
  build on earlier conversations. Staff see a green "signed in to their CDA account" note
- when the room is closed, the call is **added to their memory** as one line, for example
  *"Live call with CDA staff on 21 September 2026: asked "My oven shows F3"; CDA sent 1 written
  reply."* — so Ellie and Aida can refer to it next time, on any channel

`aida_rooms.customer_id` was added after the table: run `supabase/schema.sql` again. Until then
everything else works and the room simply has no known customer.

---

## 18. Admin page (staff)

`https://cda-demo.vercel.app/admin` — the staff side of the demo, apart from the customer site.

| | Customer site `/` | Admin page `/admin` |
|---|---|---|
| Password | The site password (`SITE_PASSWORD`) | The **Aida staff password** (`AIDA_STAFF_PASSWORD`); the site password does not open it |
| For | Customers: Chat, Voice, Avatar, **Aida** (join a live call with a code, or open a room) | CDA staff |
| Linked from the other | No | No |

The staff sign-in is kept **per browser tab** (sessionStorage), as before. `/aida` now simply
forwards to `/admin`; invite links (`/aida/join?code=…`) are unchanged.

### Tabs

| Tab | What staff can do |
|---|---|
| **📞 Aida rooms** | Everything the old `/aida` lobby did: create, join, close rooms, read and email closed ones (section 17) |
| **👥 Customers** | See every customer, their channels and history, and ask Claude for insights (below) |
| **✉️ Email** | Switch email replies between *Send automatically* and *Draft for staff*, and see the latest emails (section 5) |

Tabs stay open once visited, so moving to Customers during a call does not drop anyone out of it.

### Customers tab

- **Numbers at the top**: customers, with a CDA account, on 2+ channels, active this week, active
  now (a conversation started under 15 minutes ago), open Aida rooms; customers per channel;
  conversations this week per channel; what happened to emails (replied, drafts, skipped, failed)
- **What customers asked this week** — ✨ *Summarise with Claude*: Claude reads the last 7 days of
  conversation notes and email subjects on every channel and returns a summary, top topics, common
  problems, products mentioned and ideas for CDA (e.g. a knowledge gap to fill)
- **The list**: search by name, email or Telegram chat; filters *Known people* (anyone with more
  than an anonymous browser cookie), *With account*, *Active this week*, *Everyone*; sorted by last
  activity, with a green dot for "active now"
- **One customer**: channels (✓ = verified), conversations per channel, notes, emails and live calls,
  one timeline of everything, and ✨ *Ask Claude*: a short summary, topics, products, mood with a
  reason, what is not resolved yet, flags (complaint, safety, repeated contact…) and one next step for staff

Website "channels" are browser cookies, so only their first 6 characters are shown.

### How the insights work

- Claude **Haiku** (`ANTHROPIC_MODEL=claude-haiku-4-5`) through the Anthropic API (`src/lib/anthropic.ts`),
  temperature 0, told to use only the data given and to say so when it is thin
- For one customer it gets their notes, emails, Aida rooms, conversation counts and the transcripts of
  their **last 3 conversations** (read free from ElevenLabs). For the week, the last 7 days of notes
  and email subjects
- Made only when a staff member clicks, and **nothing is stored**. A few seconds each, a fraction of a
  cent. Without `ANTHROPIC_API_KEY` the buttons say so and everything else works
- Privacy: customer notes and transcripts are sent to Anthropic for these insights. Fine for a demo
  with fake customers; for real customers it belongs in the privacy notice

### The routes

| Route | What |
|---|---|
| `GET /api/admin/customers` | The list and the numbers |
| `GET /api/admin/customers/{id}` | One customer: channels, notes, conversations, emails, rooms |
| `POST /api/admin/customers/{id}/insight` | Claude's insight on that customer |
| `POST /api/admin/insights` | Claude's summary of the week |

All need the Aida staff token (`x-aida-staff`) and are exempt from the site password in
`src/proxy.ts`, like `/api/aida/*`. They only read (`src/lib/adminData.ts`). Checked locally on
21 Sep 2026: every route refuses a missing, fake or site-password-only request; `/` still asks for the
site password; `/aida` forwards to `/admin`; `/aida/join` stays open; both Claude answers parse.
