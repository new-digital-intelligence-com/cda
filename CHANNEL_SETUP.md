# CDA Multi-Channel Assistant (Demo) – Channel Setup Guide

Demo built by **NDI (New Digital Intelligence)** for **CDA** (UK kitchen appliance brand, www.cda.co.uk).
It is a demo and not an official CDA service.

Last updated: **17 September 2026**

> **Secrets are not written in this file.** API keys, tokens and passwords are stored in the tools
> themselves (ElevenLabs, Make.com, Anam, Slack, Vercel, `.env.local`). See [Credentials and where they live](#12-credentials-and-where-they-live).

---

## Contents

1. [Architecture](#1-architecture)
2. [Core: the ElevenLabs agent "Ellie"](#2-core-the-elevenlabs-agent-ellie)
3. [Knowledge base](#3-knowledge-base)
4. [Telegram](#4-telegram)
5. [Email (Freshdesk)](#5-email-freshdesk)
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

---

## 1. Architecture

One AI agent (**Ellie**) on **ElevenLabs Agents** answers on every channel. Every channel uses the
same prompt, the same knowledge base and the same model, so answers are consistent.

```
                         ┌──────────────────────────────────────────┐
 Telegram bot ──────────►│                                          │
                         │     ElevenLabs agent "CDA Assistant –    │
 Email ─► Freshdesk ────►│     Demo" (Ellie)                        │
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
| Email | Native ElevenLabs Freshdesk trigger | No |
| Web chat + voice | ElevenLabs hosted page (talk-to link) | No |
| Web app | ElevenLabs React SDK in a Next.js app | Yes (own repo) |
| Instagram | Make.com scenarios + ElevenLabs Custom Channel | No code (Make blocks) |
| Video avatar | Anam avatar (our Ellie picture) joined to the ElevenLabs agent, in the web app's **Avatar** tab | Small (one API route + Anam SDK) |
| Slack | Native ElevenLabs Slack trigger (in progress) | No |

**Mode:** only **Agent mode** is active (Ellie replies directly). Copilot mode (draft only) is parked.

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

## 5. Email (Freshdesk)

| Item | Value |
|---|---|
| Customer email address | **cda_domestic_appliances@new-digital-intelligence.com** (Google Workspace mailbox) |
| Helpdesk | Freshdesk **14-day trial**, portal `newdigitalintelligence-help.freshdesk.com` |
| Mailbox connection | Freshdesk **custom mailbox** with Google sign-in (IMAP `imap.gmail.com` + SMTP `smtp.gmail.com`, OAuth) |
| Freshdesk agent ID used as responder | `158020727358` |
| ElevenLabs trigger | Freshdesk **Ticket Event**, Shadow Mode **OFF** |

### How it works

```
Customer email → Google mailbox → Freshdesk ticket → ElevenLabs Freshdesk trigger → Ellie
             ← reply sent by Freshdesk from cda_domestic_appliances@… ←
```

A reply normally arrives within about a minute.

### Setup steps

1. Freshdesk trial → **skip** Freshdesk's own AI agent (Freddy), otherwise customers get two replies
2. Freshdesk → Admin → Channels → **Email** → **New support email** → the Google address → connect via Google sign-in
3. Rename the mailbox display name (e.g. "CDA Customer Care (Demo)") so customers don't see "Example"
4. Freshdesk → profile → Profile settings → copy **API key**
5. ElevenLabs workspace → **Integrations** → **Freshdesk** → Connect (API key + subdomain `newdigitalintelligence-help`)
6. Agent → **Channels** → **Freshdesk** → Add trigger → Agent + Responder Agent ID `158020727358` + Shadow Mode OFF

### Notes

- Test from an address that is **not** the Freshdesk login address
- **Shadow Mode ON** = Ellie writes a private note instead of replying (possible future "copilot" mode for email)
- Freshdesk **trial ends about 1 October 2026** (trial started 17 September); after that a paid Freshdesk plan is needed

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
| Live URL | https://cda-nine-ebon.vercel.app (password protected) |
| Stack | Next.js 16, React 19, Tailwind 4, `@elevenlabs/react` |
| Style | CDA website colours (red `#e84339`, dark `#222222`, blue-grey `#9dbdcb`), no CDA logo, "NDI demo" banner |

### Features

- **Chat**: text-only session, markdown replies, suggested questions
- **File upload**: images (PNG/JPG/WEBP/GIF) and PDFs, max 3 per message, 10 MB each (`uploadFile` + `sendMultimodalMessage`)
- **Voice**: real-time WebRTC, animated orb, mute, end call, live transcript
- **Avatar**: Anam video call with our own Ellie face and live captions, max 3 minutes per call (see section 9)
- **Other channels card**: buttons that open Email (Gmail compose to the support address), the Telegram bot and an Instagram DM (`src/components/ChannelLinks.tsx`)
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
| Instagram account | **@samrasellimi** (Business account), IG user ID `17841437047562810` |
| Meta app | **cda demo** (Meta App ID `1869137394246515`), **Published** |
| Meta use case | Manage messaging & content on Instagram → **API setup with Instagram login** |
| Instagram app ID | `1101309845810502` |
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
    "conversation_id": "<only when continuing>"
  }
  ```
- Text is encoded with `escapeJSON()` so quotes and line breaks don't break the request
- The sender ID is put inside `user_message_id` so the reply scenario knows who to answer
- **Data store** `ig_conversations` (data structure `ig_conversation`: `conversation_id`, `updated_at`) remembers each customer's conversation for 10 minutes

### Make scenario 2: `IG – Ellie reply out` (webhook `ellie-reply`)

```
Webhooks (ellie-reply)  ← Custom Channel "Reply Webhook URL"
  └─ Iterator over data[]
       └─ filter: type = agent_response
            └─ HTTP POST https://graph.instagram.com/v25.0/17841437047562810/messages
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

---

## 12. Credentials and where they live

| Credential | Stored in | Notes |
|---|---|---|
| ElevenLabs API key | Vercel env vars, `cda-web-app/.env.local` | Was shared in chat → rotate after the demo |
| Telegram bot token | ElevenLabs Telegram connection | From @BotFather |
| Freshdesk API key | ElevenLabs Freshdesk connection, Vercel env vars, `.env.local` | Also used to find who wrote an email ticket (section 16) |
| Google mailbox access | Freshdesk (Google OAuth) | |
| Google Drive access | ElevenLabs Google Drive integration | Read-only, picked files only |
| Custom Channel secrets (input/output) | ElevenLabs trigger; input secret in Make HTTP header | |
| Instagram access token | Make scenario "IG – Ellie reply out" (Authorization header) | **Expires every 60 days** |
| Instagram app secret | Meta developer dashboard | Not used in Make |
| Webhook verify token | Make filter "Meta verification" + Meta webhook settings | |
| `SITE_PASSWORD` | Vercel env vars, `.env.local` | |
| Make API token `claude-setup` | Make → Profile → API access | Delete when no longer needed |
| Anam API key | Vercel env vars, `.env.local` | Was shared in chat → rotate after the demo |
| LiveAvatar API key + ElevenLabs key copy (old avatar) | LiveAvatar account | Not used any more → delete the LiveAvatar API key and secret |
| Slack bot token + signing secret | ElevenLabs Slack connection | From the CDA_Support Slack app |
| Supabase service role key | Vercel env vars, `.env.local` | Was shared in chat → rotate after the demo |
| `AGENT_TOOL_SECRET` | Vercel env vars, `.env.local`, ElevenLabs workspace secret | Generated randomly; must match in both places |
| `ELEVENLABS_WEBHOOK_SECRET` | Vercel env vars, `.env.local` | Shown once when the post-call webhook is created |

---

## 13. Maintenance calendar

| When | What |
|---|---|
| ~1 Oct 2026 | Freshdesk trial ends → choose a plan or email stops |
| Early/mid Oct 2026 | Make free operations reset (1,000/month) |
| 17 Oct 2026 | ElevenLabs Creator credits reset |
| **Before ~16 Nov 2026** | **Refresh the Instagram token** (link in section 8) and update the Make reply scenario header |
| Monthly | Anam free plan gives 30 avatar minutes |
| After the demo | Rotate the ElevenLabs API key (update Vercel), rotate the Anam API key, **rotate the Supabase service role key**, delete the Make API token and the old LiveAvatar key |
| When CDA content changes | Update the PDFs in Drive (auto sync) |

---

## 14. Parked / not yet built

| Channel | Status | What's needed |
|---|---|---|
| **Slack** | In progress | Slack app in a workspace below the app limit, then the steps in section 10 |
| **Avatar for the CDA demo** | Optional | Anam Explorer ($49/month): no watermark, 10-minute calls, 250 minutes (section 9) |
| **WhatsApp** | Parked | Meta restricted the WhatsApp Business account; needs an appeal and an own brand name. Live calls also need a 2,000/day messaging limit |
| **Phone number** | Parked | No real phone number; the SIP import of a mobile number was removed (mobile SIMs can't route to SIP) |
| **Copilot mode** | Parked | Draft-only mode (e.g. Freshdesk Shadow Mode, or a second agent) |

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
| **Email without Freshdesk** | Make.com Gmail module + Custom Channel | Free | Low, useful when the Freshdesk trial ends (~1 Oct 2026) |
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
| Freshdesk replies twice | Freshdesk's own AI agent (Freddy) is on → keep it off |
| Voice widget test error "draft_from_user_id" | Use the **Inline** test mode or refresh the page |
| Avatar call fails to start | The real reason is in the browser console (F12 → Console) and the Vercel function logs. Check the `ANAM_*` variables, that the agent's input format is PCM 16000 Hz, and the Anam plan's call length (old LiveAvatar lesson: `max_session_duration (180s) exceeds the maximum allowed (120s)`) |
| Our HeyGen "Ellie" avatar can't answer live | HeyGen app avatars only make recorded videos → recreate the face from the same picture on a live platform (done with Anam, free) |
| Slack: "… has reached its app limit" | Free Slack workspaces allow 10 apps → use another workspace or remove an unused app |
| Slack bot answers twice | The Slack app subscribes to both `app_mention` and `message.channels`/`message.groups` → keep one mode |

---

## 16. Cross-channel customer memory

Ellie recognises the same person on every channel. A customer talks on Telegram and gives their
email once; later they DM Instagram and give the same email once; from then on Ellie knows it is
the same person everywhere, with no more questions.

**The email address is the bridge.** Telegram, Instagram and Meta deliberately never tell you who
their users are, so the only reliable link is something the customer tells you. An IP address is
not usable: ElevenLabs stores none for chat channels, the IP you would see on Telegram or
Instagram belongs to *their* servers (the same for every customer), and on the website one IP is
shared by everyone on the same WiFi or mobile network.

### How it works

```
Start of any conversation → Ellie calls customer_lookup (silent)
     known   → greets by name, can refer to the last topic
     unknown → helps normally, asks nothing
        └─ only if the request needs identity (repair, warranty, parts, order chase)
             → asks once for the email → customer_link → the channels become one person
After the conversation → ElevenLabs post-call webhook → one short note saved
```

### The database (Supabase)

Run `supabase/schema.sql` once in the Supabase project (SQL Editor → New query → paste → Run).

| Table | Holds |
|---|---|
| `customers` | id, email (unique), name |
| `customer_channels` | channel + channel key → customer id |
| `customer_conversations` | conversation id → customer, so the post-call note knows where to go |
| `customer_notes` | one short line per conversation |

Row level security is on with no policies, so **only** the service role key (server side) can read
the data. The publishable key sees nothing.

Channel keys: `telegram` = chat id, `instagram` = sender id, `website` = the `cda_visitor` cookie,
`email` = the address itself (so email needs no question at all), `slack` = Slack user id.

### The routes in the web app

| Route | Called by | Protected by |
|---|---|---|
| `POST /api/agent/customer-lookup` | tool `customer_lookup` | `x-cda-agent-secret` header |
| `POST /api/agent/customer-link` | tool `customer_link` | `x-cda-agent-secret` header |
| `POST /api/agent/post-call` | ElevenLabs post-call webhook | HMAC signature |

These three are exempt from `SITE_PASSWORD` in `src/proxy.ts` because ElevenLabs calls them, not a
browser. They carry their own proof instead — see `src/lib/agentAuth.ts`.

A lookup that fails always answers "not found" with status 200, so a customer never sees an error
because the database was slow or down.

### The two tools on the agent

Agent → **Tools** → **Add tool** → **Webhook**. Put the secret in **Workspace secrets** first, then
pick it for the header.

**`customer_lookup`** — `POST https://cda-nine-ebon.vercel.app/api/agent/customer-lookup`

Description for the LLM: *"Check whether this person has contacted CDA before. Call once, silently,
at the very start of every conversation. Never mention this tool."*

| Body parameter | Value type | Value |
|---|---|---|
| `conversation_id` | Dynamic variable | `system__conversation_id` |
| `telegram_chat_id` | Dynamic variable | `integration__telegram_chat_id` |
| `website_id` | Dynamic variable | `website_id` (sent by the web app) |
| `instagram_id` | Dynamic variable | *(confirm the name first — see below)* |
| `email_address` | Dynamic variable | *(confirm the name first — see below)* |

Returns `{ found, name, channels, recent }`. `recent` is at most three short lines.

**`customer_link`** — `POST https://cda-nine-ebon.vercel.app/api/agent/customer-link`

Description for the LLM: *"Save the email address the customer just gave so CDA recognises them on
every channel. Call once, right after they give it."*

Same parameters as above, plus `email` (LLM, required) and `name` (LLM, optional).
Returns `{ ok, name, channels, recent }` — including what they told us on **other** channels.

> Every dynamic variable used above needs a **placeholder / default of an empty string** in
> Agent → Dynamic variables. Otherwise the tool call fails on the channels where that variable
> does not exist (for example `integration__telegram_chat_id` on Instagram).

### The post-call webhook

ElevenLabs → **Settings** → **Webhooks** → add
`https://cda-nine-ebon.vercel.app/api/agent/post-call`, event **post_call_transcription**.
Copy the signing secret into `ELEVENLABS_WEBHOOK_SECRET` (`.env.local` **and** Vercel → Redeploy).

This writes the memory, so no extra tool call is needed during the conversation.

### Prompt block to add

```
# Recognising the customer

At the very start of every conversation, call customer_lookup once. Never mention the tool and
never read out any id.

If it returns found = true:
- Greet them by their first name.
- You may briefly refer to what "recent" says, if it is relevant to what they ask now.
- Do NOT read out addresses, order numbers, dates or other personal details from memory. If they
  ask about something personal, first ask them to confirm one detail (for example the postcode on
  the account), then continue.

If it returns found = false:
- Say nothing about it. Help them normally and ask no questions.
- Only when the request needs their identity - booking an engineer, warranty, ordering a part,
  chasing an existing repair or order - ask once for their email address, and say why:
  "I can arrange that - what's the best email for the confirmation?"
- When they give it, call customer_link with that email (and their name if you know it), then
  carry on. If customer_link returns recent items from another channel, you may say that you can
  see their earlier message.
- If they would rather not give an email, say that is no problem and keep helping.

Never ask for the email twice in one conversation, and never ask for it just to say hello.
```

### Setup order

1. Add the Instagram dynamic variable to the Make scenario (below)
2. Supabase project → run `supabase/schema.sql` → copy the project URL and **service role** key
3. Add the four variables to `.env.local` **and** Vercel → Redeploy
4. ElevenLabs → Workspace secrets → add the value of `AGENT_TOOL_SECRET`
5. Create the two tools, set the dynamic variable placeholders, add the prompt block → **Publish**
6. Add the post-call webhook and save its secret
7. Test with fake customers: Telegram first, then Instagram with the same email

### How each channel is identified

| Channel | Identifier | Where it comes from |
|---|---|---|
| Telegram | `integration__telegram_chat_id` | Provided by the integration (documented) |
| Slack | `integration__slack_user_id` | Provided by the integration (documented) |
| Website / voice | `website_id` | The web app sends it with the session (cookie `cda_visitor`) |
| Instagram | `instagram_id` | **We** put it in the Make request — see below |
| Email | the sender's address | Looked up from the Freshdesk ticket — see below |

**Instagram.** The Custom Channel payload takes a **top-level** `dynamic_variables` object, so the
name is ours to choose. Add this to the HTTP body in the Make scenario **"IG – Instagram in"**,
next to `data` and `user_message_id`:

```json
"dynamic_variables": { "instagram_id": "<sender id>" }
```

**Email.** Freshdesk provides no dynamic variables, and ElevenLabs strips the sender's address from
the text the agent sees — a real email arrived as just `"I need a support"`. But the conversation id
ends with the ticket number (`conv_52_0dcad3387484c5fa_fd_8` → ticket 8), and `system__conversation_id`
is available everywhere. So `customer_lookup` reads the ticket number, asks Freshdesk
`GET /api/v2/tickets/{id}?include=requester`, and uses the requester's address as the key. It also
gets their name, so Ellie can greet them properly on the very first email — no question asked.

> That `_fd_<number>` format is **not documented**. If ElevenLabs changes it, email quietly stops
> being recognised and every other channel carries on; the code returns "not found" rather than
> failing. Tested 17 Sep 2026 against ticket 8.

### Verified by test

Run against the live site and the real Supabase project on 17 September 2026:

- wrong secret → 401; unsigned post-call webhook → 401
- link on Telegram, then link on Instagram with the same email → one customer, both channels
- email with **only** a conversation id → recognised as "Helmi Lakhder" with no question
- unknown ticket number and a non-Freshdesk id → "not found", no error
- post-call webhook with a valid signature → note saved and visible on the other channel

### Privacy

Customer records across channels are personal data under UK GDPR. For the demo use **fake
customers only**. A typed email proves nothing, which is why the prompt makes Ellie verify one
detail before revealing anything personal. The service role key is server-side only and must never
be committed — this repository is public.
