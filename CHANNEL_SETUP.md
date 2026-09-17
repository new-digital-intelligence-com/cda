# CDA Multi-Channel Assistant (Demo) – Channel Setup Guide

Demo built by **NDI (New Digital Intelligence)** for **CDA** (UK kitchen appliance brand, www.cda.co.uk).
It is a demo and not an official CDA service.

Last updated: **17 September 2026**

> **Secrets are not written in this file.** API keys, tokens and passwords are stored in the tools
> themselves (ElevenLabs, Make.com, Vercel, `.env.local`). See [Credentials and where they live](#10-credentials-and-where-they-live).

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
9. [Admin through Claude (ElevenLabs connector)](#9-admin-through-claude-elevenlabs-connector)
10. [Credentials and where they live](#10-credentials-and-where-they-live)
11. [Maintenance calendar](#11-maintenance-calendar)
12. [Parked / not yet built](#12-parked--not-yet-built)
13. [Troubleshooting and lessons learned](#13-troubleshooting-and-lessons-learned)

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
 Next.js web app ───────►│  • 20 knowledge documents (RAG)          │
 (chat, voice, files)    │  • Agent mode: replies directly          │
                         │                                          │
 Instagram DM ─► Make ──►│  (Custom Channel)                        │
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
| Voice | British voice from the voice library (`4CrZuIW9am7gYAxgo2Af`) |
| Language | English (answers in the customer's language) |
| Time zone | Europe/London |
| First message | "Hello, you're through to CDA's virtual assistant, Ellie. How can I help you today?" |
| File input | Enabled: images and PDFs, max 10 files per conversation |

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

Source files: `CDA_Knowledge_Base/1_UPLOAD_TO_GOOGLE_DRIVE/` in this project folder.
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
| QR code | `CDA_Demo_Assets/Ellie_voice_chat_QR.png` |
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

---

## 7. Custom web app (Next.js on Vercel)

| Item | Value |
|---|---|
| Folder | `cda-web-app/` |
| Repository | `github.com/new-digital-intelligence-com/cda` (branch `main`) |
| Live URL | https://cda-nine-ebon.vercel.app (password protected) |
| Stack | Next.js 16, React 19, Tailwind 4, `@elevenlabs/react` |
| Style | CDA website colours (red `#e84339`, dark `#222222`, blue-grey `#9dbdcb`), no CDA logo, "NDI demo" banner |

### Features

- **Chat**: text-only session, markdown replies, suggested questions
- **File upload**: images (PNG/JPG/WEBP/GIF) and PDFs, max 3 per message, 10 MB each (`uploadFile` + `sendMultimodalMessage`)
- **Voice**: real-time WebRTC, animated orb, mute, end call, live transcript
- **Password lock**: every page and API route requires `SITE_PASSWORD` (checked in `src/proxy.ts` and again in the API routes); site stays locked if the variable is missing

### Important files

| File | Purpose |
|---|---|
| `src/components/AssistantApp.tsx` | Chat, voice and upload logic |
| `src/app/api/elevenlabs/signed-url/route.ts` | Creates chat sessions (API key stays on the server) |
| `src/app/api/elevenlabs/conversation-token/route.ts` | Creates voice sessions |
| `src/proxy.ts`, `src/lib/auth.ts`, `src/app/login/` | Password lock |

### Environment variables (Vercel → Settings → Environment Variables, and `.env.local` locally)

| Name | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | Server-side ElevenLabs key |
| `ELEVENLABS_AGENT_ID` | `agent_3601m2p374tce96b7p6hdfz5f1tv` |
| `SITE_PASSWORD` | Password for the demo site |

After changing a variable on Vercel → **Redeploy**.

### Run locally

```bash
cd cda-web-app
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

## 9. Admin through Claude (ElevenLabs connector)

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

## 10. Credentials and where they live

| Credential | Stored in | Notes |
|---|---|---|
| ElevenLabs API key | Vercel env vars, `cda-web-app/.env.local` | Was shared in chat → rotate after the demo |
| Telegram bot token | ElevenLabs Telegram connection | From @BotFather |
| Freshdesk API key | ElevenLabs Freshdesk connection | |
| Google mailbox access | Freshdesk (Google OAuth) | |
| Google Drive access | ElevenLabs Google Drive integration | Read-only, picked files only |
| Custom Channel secrets (input/output) | ElevenLabs trigger; input secret in Make HTTP header | |
| Instagram access token | Make scenario "IG – Ellie reply out" (Authorization header) | **Expires every 60 days** |
| Instagram app secret | Meta developer dashboard | Not used in Make |
| Webhook verify token | Make filter "Meta verification" + Meta webhook settings | |
| `SITE_PASSWORD` | Vercel env vars, `.env.local` | |
| Make API token `claude-setup` | Make → Profile → API access | Delete when no longer needed |

---

## 11. Maintenance calendar

| When | What |
|---|---|
| ~1 Oct 2026 | Freshdesk trial ends → choose a plan or email stops |
| Early/mid Oct 2026 | Make free operations reset (1,000/month) |
| 17 Oct 2026 | ElevenLabs Creator credits reset |
| **Before ~16 Nov 2026** | **Refresh the Instagram token** (link in section 8) and update the Make reply scenario header |
| After the demo | Rotate the ElevenLabs API key (update Vercel), delete the Make API token |
| When CDA content changes | Update the PDFs in Drive (auto sync) |

---

## 12. Parked / not yet built

| Channel | Status | What's needed |
|---|---|---|
| **HeyGen avatar** | Next step | HeyGen LiveAvatar account + ElevenLabs agent connector (needs paid ElevenLabs plan ✅), agent audio set to PCM 24000 Hz, embed added as "Avatar" tab in the web app |
| **WhatsApp** | Parked | Meta restricted the WhatsApp Business account; needs an appeal and an own brand name. Live calls also need a 2,000/day messaging limit |
| **Phone number** | Parked | No real phone number; the SIP import of a mobile number was removed (mobile SIMs can't route to SIP) |
| **Copilot mode** | Parked | Draft-only mode (e.g. Freshdesk Shadow Mode, or a second agent) |

---

## 13. Troubleshooting and lessons learned

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
