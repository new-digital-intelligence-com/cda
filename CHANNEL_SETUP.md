# CDA Multi-Channel Assistant (Demo) – Setup Guide

Demo built by **NDI (New Digital Intelligence)** for **CDA** (UK kitchen appliance brand, www.cda.co.uk).
Not an official CDA service. Last updated: **21 September 2026**.

> **This repository is public. No secrets in this file.** Keys and tokens live in the tools themselves,
> in Vercel and in `.env.local` — see [Credentials](#12-credentials).

## Contents

1. [Overview](#1-overview)
2. [Ellie, the ElevenLabs agent](#2-ellie-the-elevenlabs-agent)
3. [Telegram](#3-telegram)
4. [Email](#4-email)
5. [Instagram and Facebook Messenger](#5-instagram-and-facebook-messenger)
6. [Alexa](#6-alexa)
7. [Website](#7-website)
8. [Customer memory across channels](#8-customer-memory-across-channels)
9. [Aida rooms](#9-aida-rooms)
10. [Admin page](#10-admin-page)
11. [Web app reference](#11-web-app-reference)
12. [Credentials](#12-credentials)
13. [Maintenance](#13-maintenance)
14. [Not built yet](#14-not-built-yet)
15. [Troubleshooting](#15-troubleshooting)

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
| Instagram **@new_digital_intelligence** | ✅ | Meta webhook → web app → Custom Channel "CDA Instagram" |
| Facebook Messenger, Page **New Digital Intelligence** | ✅ | Meta webhook → web app → Custom Channel "CDA Messenger" |
| Alexa skill **CDA Assistant** (Echo / Alexa app) | ✅ (development) | Amazon → web app → Custom Channel "CDA Alexa" |
| Hosted page / QR code | ✅ | ElevenLabs talk-to link (no password) |
| Slack | ⏳ | Waiting for a Slack workspace (section 14) |
| WhatsApp, phone number | ⏸ | Parked (section 14) |

```
 Website chat / voice / files ─────────►┐
 Avatar tab ─► Anam (video face) ───────►│
 Telegram bot ──────────────────────────►│   ElevenLabs agent "Ellie"
 Email ─► Gmail ─► web app ─────────────►│   Gemini 3.7 Flash · 31 documents (RAG)
 Instagram / Messenger ─► web app ──────►│
 Alexa (Echo) ─► web app ──────────────►│
 Hosted page / QR ──────────────────────►┘
                                             │ 2 tools + post-call webhook
                                             ▼
 web app (Vercel) ── Supabase: customers, notes, email log, Aida rooms, Instagram/Messenger threads
 Aida tab (customers) + /admin (staff) ── LiveKit calls, Aida drafts for staff
 Admin: Claude through the ElevenLabs connector (e.g. switch email replies to drafts)
```

**Words used in this guide**

| Word | Meaning |
|---|---|
| **Trigger** | A link between Ellie and a channel, set in ElevenLabs → Ellie → **Channels** |
| **Custom Channel** | ElevenLabs' trigger for channels it has no built-in support for. It gives three values: an **Inbound URL** and **Inbound Secret** (where the web app sends the customer's message) and an **Outbound Signing Secret** (proves that an answer really comes from ElevenLabs). Its **Reply Webhook URL** is where ElevenLabs sends Ellie's answer |
| **Webhook / Callback URL** | An address a platform (Meta, Google) calls when something happens, e.g. a new message |
| **Verify token** | A secret word Meta sends once to check a Callback URL is really ours |
| **Web app** | This repository, running on Vercel at https://cda-demo.vercel.app |
| **Daily cron** | A job Vercel runs every day at 06:00 UTC (`/api/cron/daily`): renews the Gmail watch, refreshes the Instagram token |

---

## 2. Ellie, the ElevenLabs agent

| Setting | Value |
|---|---|
| Plan | **Creator**, 121,005 credits a month, resets ~17th |
| Agent | `CDA Assistant – Demo`, ID `agent_3601m2p374tce96b7p6hdfz5f1tv`, branch `agtbrch_9301m2p375xzetbbsyymxnbnsf1s` (Main, 100% of traffic) |
| LLM | Gemini 3.7 Flash, temperature 0 |
| Voice | **Shelley** – Clear, Confident and British (`4CrZuIW9am7gYAxgo2Af`), in every language |
| Languages | **English** (default): TTS **Eleven Flash v2**. **Polish**: language preset `pl` with a Polish greeting and TTS **Eleven Flash v2.5** (multilingual), chosen by the website at the start of a voice or avatar call. Built-in tool **language detection** is on: during a call Ellie follows the customer between English and Polish by herself. Security → the `language` override is allowed (as is `text_only` for the chat) |
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
`SKIP` to robots; *Alexa only*: 1–3 short spoken sentences) · Goal · Knowledge rules (only knowledge-base facts; spare parts delivery: give both
48 h and 3–5 days; warranty: only current 60-day terms) · Collecting details for repairs · Safety (gas
0800 111 999) · Handover to a human · Style (British English) · Operating mode: AGENT (summary of the
request, never claims something is booked) · Recognising the customer (section 8).

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

**What the customer does:** opens **@CDA_2026_Support_Bot** in Telegram and types a message.

**How it works:** ElevenLabs connects to Telegram by itself (a native trigger). No web app code is involved.

```
Customer → Telegram bot → ElevenLabs Telegram trigger → Ellie → answer in the same chat
```

| Where | Value |
|---|---|
| Bot | **@CDA_2026_Support_Bot** ("CDA Support Demo"), link https://t.me/CDA_2026_Support_Bot |
| ElevenLabs | Ellie → Channels → **Telegram** → trigger **Message Received**, with the bot's token |

**Set it up from zero**
1. In Telegram, message **@BotFather** → `/newbot` → give a name and a username ending in `bot` → copy the **token**.
2. ElevenLabs → Agents → **CDA Assistant – Demo** → **Channels** → **Telegram** → **Add trigger** →
   **Message Received** → new connection → paste the token → **Save**. Paste a token only once.
3. **Test:** send "What warranty do CDA appliances have?" to the bot → Ellie answers in a few seconds.

**Good to know**
- Private chats: every message is answered. Groups: only messages that @mention the bot or reply to it.
- **Text only**: Ellie does not see photos, files or voice notes (she asks the customer to type the details).
- Not answering? Open `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`: its `url` must point to `api.us.elevenlabs.io`.

---

## 4. Email

**What the customer does:** sends an email to **cda_domestic_appliances@new-digital-intelligence.com**
and gets Ellie's answer as a normal reply in the same email thread.

**How it works**

```
1. Customer email arrives in Gmail
2. Google tells the web app at once (Gmail "watch" + Pub/Sub)        → /api/email/gmail-push
3. The web app skips robots (codes, alerts, newsletters, no-reply)   → no credits spent
4. It passes the email to Ellie through the "CDA email" Custom Channel
5. Ellie's answer comes back                                        → /api/email/ellie-reply
6. The web app sends it in the customer's thread (auto)
   or saves it as a Gmail draft for staff (draft), and labels the email in Gmail
```

| Where | Value |
|---|---|
| Mailbox | **cda_domestic_appliances@new-digital-intelligence.com** (Google Workspace) |
| Google Cloud | Project `cda-email-509312`: Gmail API + Pub/Sub. OAuth client "Desktop", consent screen **Internal**, scope `gmail.modify` |
| Pub/Sub | Topic `gmail-inbox`; subscription `gmail-inbox-push` → `https://cda-demo.vercel.app/api/email/gmail-push?token=<GMAIL_PUSH_SECRET>` |
| ElevenLabs | Ellie → Channels → Custom Channel, connection **CDA email**, Reply Webhook URL `https://cda-demo.vercel.app/api/email/ellie-reply` |
| Auto or draft | `email_mode` (`auto` / `draft`), stored on the **Aida** agent |

**Set it up from zero**
1. **Google Cloud** (console.cloud.google.com) → new project → link a billing account (Pub/Sub stays in
   the free tier) → enable **Gmail API** and **Cloud Pub/Sub API**.
2. **OAuth consent screen** → Internal. **Credentials** → Create OAuth client ID → **Desktop app** → keep
   the Client ID and Client secret.
3. **Allow access once**: open Google's consent link for that client with scope `gmail.modify`
   (`access_type=offline`, `prompt=consent`, a `http://localhost` redirect), sign in as the mailbox, click
   **Allow**, and exchange the returned code for a **refresh token**.
4. **Pub/Sub** → create topic `gmail-inbox` → on the topic, add principal
   `gmail-api-push@system.gserviceaccount.com` with role **Pub/Sub Publisher** → create subscription
   `gmail-inbox-push`: type **Push**, endpoint `…/api/email/gmail-push?token=<GMAIL_PUSH_SECRET>`,
   expiration **never**, acknowledgement deadline **60 s**.
5. **ElevenLabs** → Ellie → Channels → **Custom Channel** → Add trigger → new connection `CDA email` →
   Reply Webhook URL `…/api/email/ellie-reply` → copy the **Inbound URL**, **Inbound Secret** and
   **Outbound Signing Secret**.
6. **Vercel**: add the email variables (section 11) → Redeploy. **Supabase**: run `supabase/schema.sql`.
7. **Start the watch once**: `GET https://cda-demo.vercel.app/api/email/gmail-watch` with header
   `Authorization: Bearer <GMAIL_PUSH_SECRET>`. From then on the daily cron keeps it alive.
8. **Test:** from another address, email "How long is the warranty on a CDA oven?" → a reply arrives
   in the same thread within ~30 s, and the email gets the green **Ellie/Replied** label.

**Using it**
- **Labels in Gmail** (under "Ellie"): **Replied** · **Draft ready** (open the email, check the draft,
  press Send) · **Skipped** (a robot or newsletter) · **Failed** (answer it by hand).
- **Switch auto / draft**: `/admin` → **Email** tab, or ask Claude with the ElevenLabs connector:
  *"Set the dynamic variable placeholder email_mode on the agent Aida – CDA copilot to draft"*.
  It is read for every reply. It does not appear in Aida's **Vars** panel in ElevenLabs; that is normal.

**Good to know**
- Each email is a separate conversation for Ellie; earlier messages are quoted in the email itself.
- Ellie gets up to 6,000 characters; she cannot open attachments.
- Robots are skipped twice: by rules first (`src/lib/emailParse.ts`), then by Ellie, who answers
  `SKIP` to anything not written by a person. Mail older than 24 hours is never answered.
- If the mailbox password changes, Gmail access stops ("invalid_grant" in the logs): repeat step 3.

---

## 5. Instagram and Facebook Messenger

Both work the same way and run in the web app (`src/lib/metaChat.ts`, with the settings of each in
`src/lib/instagram.ts` and `src/lib/messenger.ts`). Both use one Meta developer app, **"Customer Support"**.

```
1. The customer sends a message
2. Meta calls the web app                   → /api/instagram/webhook  or  /api/messenger/webhook
3. The web app passes it to Ellie through that channel's Custom Channel
4. Ellie's answer comes back                → /api/instagram/reply    or  /api/messenger/reply
5. The web app sends it with Instagram's or Messenger's API
```

A person's messages stay in **one conversation for 10 minutes**, then a new one starts. "Typing…"
shows while Ellie writes. Answers are plain text; Ellie cannot see photos or files. The Meta app must
stay **Published** (it needs a public privacy policy link). No App Review is needed: people with no
role on the app got answers in testing. Don't use "CDA" in any Meta account or Page name (Meta
restricted one before).

### Instagram

**What the customer does:** sends a DM to **@new_digital_intelligence** (https://ig.me/m/new_digital_intelligence).

| Where | Value |
|---|---|
| Account | **@new_digital_intelligence**, Business account, ID `17841430407573788` |
| Meta app | "Customer Support" → use case **Manage messaging & content on Instagram** → **API setup with Instagram login** |
| Webhook | Callback URL `https://cda-demo.vercel.app/api/instagram/webhook?token=<INSTAGRAM_WEBHOOK_SECRET>`, Verify token = the same secret, field `messages` |
| ElevenLabs | Custom Channel, connection **CDA Instagram**, Reply Webhook URL `https://cda-demo.vercel.app/api/instagram/reply` |
| Token | Lasts 60 days, **renewed automatically** every 7 days by the daily cron (stored in Supabase) |

**Set it up from zero**
1. On Instagram, make the account **Professional** (Business or Creator).
2. **developers.facebook.com** → the app → **Use cases** → "Manage messaging & content on Instagram" →
   **API setup with Instagram login** → **Add account** → log in → **Generate token**.
   ("Insufficient developer role"? App roles → add the account as **Instagram Tester**, accept at
   instagram.com/accounts/manage_access, try again.)
3. Find the account ID: open `https://graph.instagram.com/v25.0/me?fields=user_id,username&access_token=<TOKEN>` → `user_id`.
4. **ElevenLabs** → Ellie → Channels → **Custom Channel** → Add trigger → new connection `CDA Instagram`
   → Reply Webhook URL `…/api/instagram/reply` → copy Inbound URL, Inbound Secret, Outbound Signing Secret.
5. **Vercel**: add the `INSTAGRAM_*` variables (section 11) → Redeploy. **Supabase**: run `supabase/schema.sql`.
6. Meta app → **Configure webhooks** → Callback URL and Verify token as in the table → **Verify and save**
   → subscribe **messages**. Then connect the account once:
   `POST https://graph.instagram.com/v25.0/me/subscribed_apps?subscribed_fields=messages&access_token=<TOKEN>`.
7. **App settings → Basic** → Privacy Policy URL → switch the app to **Live** (Publish).
8. **Test:** from another Instagram account, DM "What's the spare parts phone number?" → Ellie answers
   **01949 862019** within ~20 s.

Good to know: replies are cut to 1,000 characters and must go out within 24 hours of the DM (Ellie
answers in seconds).

### Facebook Messenger

**What the customer does:** messages the Facebook Page **New Digital Intelligence** (https://m.me/1450409441479124).

| Where | Value |
|---|---|
| Page | **New Digital Intelligence**, Page ID `1450409441479124` |
| Meta app | The same app → use case **Engage with customers on Messenger from Meta** → **Messenger API Settings** |
| Webhook | Callback URL `https://cda-demo.vercel.app/api/messenger/webhook?token=<MESSENGER_WEBHOOK_SECRET>`, Verify token = the same secret, Page subscribed to `messages` |
| ElevenLabs | Custom Channel, connection **CDA Messenger**, Reply Webhook URL `https://cda-demo.vercel.app/api/messenger/reply` |
| Token | Page token, **never expires** (if Messenger ever stops after 20 Dec 2026, generate it again) |

**Set it up from zero**
1. Have a Facebook **Page** (not a personal profile) that you are admin of.
2. Meta app → **Add use case** → "Engage with customers on Messenger from Meta" → **Messenger API
   Settings** → **Generate access tokens** → connect the Page → **Generate token**.
3. **ElevenLabs** → Ellie → Channels → **Custom Channel** → Add trigger → new connection `CDA Messenger`
   → Reply Webhook URL `…/api/messenger/reply` → copy Inbound URL, Inbound Secret, Outbound Signing Secret.
4. **Vercel**: add the `MESSENGER_*` variables (section 11) → Redeploy. **Supabase**: run `supabase/schema.sql`.
5. Messenger API Settings → **Configure webhooks** → Callback URL and Verify token as in the table →
   **Verify and save** → next to the Page, **Add subscriptions** → **messages**.
6. **Test:** from a personal Facebook account, message the Page "How long is the warranty on a CDA
   oven?" → Ellie answers within ~20 s.

Good to know: long answers are split into messages of up to 2,000 characters.

---

## 6. Alexa

**What the customer does:** talks to an **Amazon Echo** or the **Alexa app**:
*"Alexa, ask cda assistant why my oven shows F3."* Alexa reads Ellie's answer out loud, and the
customer can keep asking follow-up questions.

**How it works**

```
1. "Alexa, ask cda assistant …"          → Amazon → /api/alexa (checks Amazon's signature)
2. The web app passes the question to Ellie through the "CDA Alexa" Custom Channel
   (with the marker [Alexa], so she answers in 1–3 short spoken sentences)
3. Alexa says "One moment" while Ellie thinks
4. Ellie's answer comes back                → /api/alexa/reply → Alexa reads it out
```

| Where | Value |
|---|---|
| Skill | **CDA Assistant** in the Alexa developer console (developer.amazon.com/alexa/console/ask), ID `amzn1.ask.skill.600a03ff-284b-4e60-a168-8aa279888b9a`, **English (US)** |
| Invocation name | `cda assistant` (an acronym like "c. d. a." is misheard too often; the skill is still called CDA Assistant) |
| Endpoint | HTTPS `https://cda-demo.vercel.app/api/alexa`, certificate option "sub-domain of a domain that has a wildcard certificate" |
| Words (interaction model) | `alexa/interaction-model.json`, generated from `src/lib/alexaModel.ts` |
| ElevenLabs | Custom Channel, connection **CDA Alexa**, Reply Webhook URL `https://cda-demo.vercel.app/api/alexa/reply` |

**Set it up from zero**
1. **developer.amazon.com/alexa/console/ask** → **Create Skill**: name `CDA Assistant`, locale matching
   the Echo's language, model **Custom**, hosting **Provision your own**, **Start from scratch** → copy
   the Skill ID.
2. **ElevenLabs** → Ellie → Channels → **Custom Channel** → Add trigger → new connection `CDA Alexa` →
   Reply Webhook URL `…/api/alexa/reply` → copy Inbound URL, Inbound Secret, Outbound Signing Secret.
3. **Vercel**: add the `ALEXA_*` variables (section 11) → Redeploy. **Supabase**: run `supabase/schema.sql`.
4. Alexa console → **Build → Interaction Model → JSON Editor** → paste `alexa/interaction-model.json`
   → **Save** → **Build skill**.
5. **Build → Endpoint** → HTTPS → Default Region `https://cda-demo.vercel.app/api/alexa` → certificate
   "My development endpoint is a sub-domain of a domain that has a wildcard certificate…" → **Save**.
6. **Test** tab → set "Skill testing is enabled in" to **Development** → type or say
   *"ask cda assistant what is the spare parts phone number"* → Ellie answers **01949 862019**.
   On an Echo or the Alexa app it works too, if they use the same Amazon account as the developer console.

**Good to know**
- A question must **start with a question word** (why, how, what, where, can, is, my, I, it's, the…):
  a classic Alexa skill only hands over free speech after such a word. Answers to Ellie's questions
  work the same way: *"it's a CDA SK511 oven"*, *"my postcode is …"*, "yes", "no".
- Alexa waits about 8 seconds. If Ellie needs longer, Alexa says *"say continue to hear the answer"*.
- Alexa speaks in **its own voice** (not Shelley), in **English** only.
- The same Alexa account is recognised between conversations (customer memory, channel `alexa`).
  Linking it to a CDA account with a code is not possible by voice.
- For the demo the skill stays in **Development** (your own Amazon account only). Publishing it for
  everyone needs Amazon's certification.
- *"There was a problem with the requested skill's response"* means Amazon got no usable answer.
  First look at **Build → Endpoint**: the **Default Region** URL empties itself if the page is saved
  while it is blank, and then Alexa has nowhere to call (this happened on 22 Sep). Put
  `https://cda-demo.vercel.app/api/alexa` back with the wildcard certificate option and save.
  If the URL is right, the Vercel logs show whether Amazon reached us and with what answer.
- An app on **Alexa+** shows skills under **More → Alexa+ Store → Your Skills → Dev**, and a question
  must name the skill: *"ask cda assistant …"*. Typing only a question reaches Amazon's own
  assistant, not Ellie — the console's "Skill Invocations" panel stays empty when that happens.

---

## 7. Website

**What the customer does:** opens https://cda-demo.vercel.app, types the **site password**, and uses
one of four tabs. The website talks to Ellie directly through ElevenLabs' SDK.

| Tab | What happens |
|---|---|
| 💬 **Chat** | Typed chat with Ellie; the customer can attach photos or PDFs (3 per message, 10 MB each) |
| 🎙️ **Voice** | A spoken call with Ellie in the browser, with a live transcript |
| 🧑‍💼 **Avatar** | A video call with Ellie's face (below) |

**Voice and Avatar language:** an **English | Polski** switch above the start button (one choice for
both tabs) sets the language Ellie starts in. During the call there is no button: just speak the other
language, or ask her to switch, and she follows (ElevenLabs' language detection). Shelley's voice either way. Text
channels need no switch: Ellie answers in the language the customer writes in.
| 📞 **Aida** | A live call with CDA staff: join with a code or open a room (section 9) |

Also on the page: **Your CDA account** (link channels with a code, section 8), buttons that open
Email, Telegram, Instagram and Messenger, and **Email me this conversation** under chat, voice and
avatar (one click for a signed-in customer). The staff page `/admin` is not linked from here.

### Video avatar (Anam)

Anam only **draws Ellie's face** (avatar **Sofia**, made from our Ellie picture); Ellie on ElevenLabs
still listens, thinks and speaks. For a Polish call the
web app tells Anam `conversationConfigOverride: { agent: { language: "pl" } }`, and Anam passes it on to ElevenLabs.

**Set it up from zero**
1. **lab.anam.ai** → create an avatar from the picture → copy its ID and the **API key**.
2. ElevenLabs → Ellie → set the **user input audio format to PCM 16000 Hz** (Anam needs it).
3. **Vercel**: `ANAM_API_KEY`, `ANAM_AVATAR_ID`, `ANAM_MAX_SESSION_SECONDS=180` → Redeploy.
4. **Test:** Avatar tab → Start video call → ask a question.

Good to know: Anam's **free plan** gives 30 minutes a month and **3-minute calls**, with a watermark
(Explorer, $49/month: no watermark, 10-minute calls). A voice or avatar minute costs about 600
ElevenLabs credits. If a call won't start, look in the browser console (F12) and the Vercel logs.

### Hosted page and widget (no password)

ElevenLabs' own page: https://elevenlabs.io/app/talk-to?agent_id=agent_3601m2p374tce96b7p6hdfz5f1tv
(voice and text; the QR code is made from this link). Set in Ellie → Channels → **Widget**. To add the
chat bubble to any website:

```html
<elevenlabs-convai agent-id="agent_3601m2p374tce96b7p6hdfz5f1tv"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
```

> Anyone with this link can talk to Ellie and use credits. Turning on authentication in Ellie's
> **Security** settings stops the page, QR code and widget; test every channel after such a change.

---

## 8. Customer memory across channels

Ellie recognises the same person on every channel and remembers what they asked. **She never asks
anyone to identify themselves**; someone she cannot place is simply helped.

```
Website: create account → "+ Add a channel" → CDA-4F2K9M → send it from Telegram, Instagram, Messenger or another email
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
| Instagram, Messenger | The web app registers the conversation to the sender and keeps it in `instagram_threads` / `messenger_threads` |
| Alexa | The web app registers the conversation to the Alexa account (a short hash of Amazon's user id) |
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

## 9. Aida rooms

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

## 10. Admin page

`https://cda-demo.vercel.app/admin` — staff only, **Aida staff password** (the site password does not
open it; `/aida` forwards here). Three tabs, which stay open once visited so a call is never dropped:

| Tab | What staff do |
|---|---|
| 📞 **Aida rooms** | Create, join, close rooms; read and email closed ones (section 9) |
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

## 11. Web app reference

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
| `/api/cron/daily` | Vercel Cron, 06:00 UTC: renews the Gmail watch, refreshes the Instagram token | `Bearer CRON_SECRET` |
| `/api/email/gmail-watch` | By hand, to restart the Gmail watch | `Bearer CRON_SECRET` or the push secret |
| `/api/instagram/webhook`, `/api/messenger/webhook` | Meta | `?token=` `INSTAGRAM_WEBHOOK_SECRET` / `MESSENGER_WEBHOOK_SECRET` (+ Meta signature if `META_APP_SECRET` is set) |
| `/api/instagram/reply`, `/api/messenger/reply` | ElevenLabs (replies) | HMAC signature (`INSTAGRAM_CHANNEL_SIGNING_SECRET` / `MESSENGER_CHANNEL_SIGNING_SECRET`) |
| `/api/alexa` | Amazon (Alexa skill) | Amazon's request signature + our skill ID |
| `/api/alexa/reply` | ElevenLabs (Alexa answers) | HMAC signature (`ALEXA_CHANNEL_SIGNING_SECRET`) |
| `/api/email/mode`, `/api/admin/*` | `/admin` | Aida staff token |
| `/api/aida/*` | Aida rooms | Staff token, room ticket, or nothing for customers (each route checks) |
| `/api/elevenlabs/*`, `/api/anam/session`, `/api/account`, `/api/transcript/email` | Customer site | Site password |

**Main files**: `src/components/AssistantApp.tsx` (tabs) · `src/lib/customers.ts` (memory) ·
`src/lib/emailInbox.ts`, `gmail.ts`, `emailParse.ts`, `emailMode.ts` (email) · `src/lib/metaChat.ts`, `instagram.ts`, `messenger.ts` (Instagram, Messenger) · `src/lib/alexa.ts`, `alexaModel.ts`, `alexa/interaction-model.json` (Alexa) · `src/lib/aida.ts`,
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
| `GMAIL_PUBSUB_TOPIC`, `GMAIL_PUSH_SECRET` | Gmail push |
| `CRON_SECRET` | The daily cron: renews the Gmail watch, refreshes the Instagram token |
| `EMAIL_CHANNEL_INBOUND_URL`, `EMAIL_CHANNEL_INBOUND_SECRET`, `EMAIL_CHANNEL_SIGNING_SECRET` | "CDA email" Custom Channel |
| `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` | Instagram: starting token (then refreshed in Supabase) and account ID |
| `INSTAGRAM_WEBHOOK_SECRET` | Secret in the Instagram Callback URL, also the Verify token |
| `INSTAGRAM_CHANNEL_INBOUND_URL`, `INSTAGRAM_CHANNEL_INBOUND_SECRET`, `INSTAGRAM_CHANNEL_SIGNING_SECRET` | "CDA Instagram" Custom Channel |
| `MESSENGER_PAGE_TOKEN`, `MESSENGER_PAGE_ID` | Messenger: the Page token and Page ID |
| `MESSENGER_WEBHOOK_SECRET` | Secret in the Meta Callback URL, also the Verify token |
| `MESSENGER_CHANNEL_INBOUND_URL`, `MESSENGER_CHANNEL_INBOUND_SECRET`, `MESSENGER_CHANNEL_SIGNING_SECRET` | "CDA Messenger" Custom Channel |
| `ALEXA_SKILL_ID` | The Alexa skill's ID (requests for any other skill are refused) |
| `ALEXA_CHANNEL_INBOUND_URL`, `ALEXA_CHANNEL_INBOUND_SECRET`, `ALEXA_CHANNEL_SIGNING_SECRET` | "CDA Alexa" Custom Channel |
| `META_APP_SECRET` (optional) | Also check Meta's signature on Instagram and Messenger webhooks |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Insights on `/admin` |
| `FRESHDESK_API_KEY`, `FRESHDESK_SUBDOMAIN` | Only to recognise old Freshdesk conversations; can go once Freshdesk is closed |

---

## 12. Credentials

| Credential | Lives in | Note |
|---|---|---|
| All `.env` keys above | Vercel + `.env.local` | Never committed (public repo) |
| Telegram bot token | ElevenLabs Telegram connection | From @BotFather |
| Instagram token | Supabase `channel_tokens` (refreshed every 7 days); starting token in `INSTAGRAM_ACCESS_TOKEN` | Never runs out while the daily cron runs |
| Google Drive access | ElevenLabs Google Drive integration | Read-only, picked files |
| Make API token `claude-setup` | Make → Profile → API access | Make is only a switched-off backup now → delete when no longer needed |

**Shared in chat → rotate after the demo:** ElevenLabs, Anam, Supabase service role, LiveKit, Google
OAuth client secret (then run the Gmail consent again), the three Custom Channel secret sets, Instagram
token, Messenger Page token, Anthropic, Freshdesk; delete the Make API token.

---

## 13. Maintenance

| When | What |
|---|---|
| **Now** | Remove the old **Freshdesk** trigger from Ellie (Channels → Freshdesk), so no email can get two answers, and the old Instagram Custom Channel trigger (Reply URL pointing to Make) if it is still there |
| Daily, automatic | Vercel Cron renews the Gmail watch and refreshes the Instagram token (every 7 days) |
| ~17th each month | ElevenLabs credits reset (next 17 Oct 2026) |
| Monthly | Anam gives 30 avatar minutes |
| After 20 Dec 2026, if Messenger stops | Generate the Page token again in the Meta app and update `MESSENGER_PAGE_TOKEN` |
| When CDA content changes | Replace the PDFs in Drive (auto sync) |
| After the demo | Rotate the keys listed in section 12 |

---

## 14. Not built yet

| What | Status | Needed |
|---|---|---|
| **Slack** | Waiting | A workspace under Slack's free 10-app limit (the NDI workspace is full), then the steps below |
| **WhatsApp** | Parked | Meta restricted the WhatsApp Business account: appeal with an own brand name; voice calls also need a 2,000/day messaging limit |
| **Phone number** | Parked | A number bought from **Twilio** (easiest) or a SIP provider → ElevenLabs → Phone Numbers → Import → assign Ellie. No audio change needed. Set max call length, daily and concurrency limits. A mobile SIM cannot be used |

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

## 15. Troubleshooting

| Problem | Fix |
|---|---|
| A channel breaks with "Missing required dynamic variables", or Telegram stops answering | A tool bound to a channel variable, or an `integration__` placeholder: remove it (section 8) |
| Dashboard test works, channel doesn't | The change is still a draft → **Publish** |
| Documents synced but unknown to Ellie | Attach them to the agent and publish |
| "RAG storage limit exceeded" / "exceeds your quota" | Too many documents / credits used up |
| Email: no reply and no Ellie label | Open `/api/email/gmail-watch` with the push secret, then Vercel logs for `gmail-push` |
| Email labelled **Failed** | Reason on `/admin` → Email. "invalid_grant" → run the Gmail consent again |
| A customer's email labelled **Skipped** | Answer by hand; adjust `src/lib/emailParse.ts` if it repeats |
| A customer gets two answers to one email | The Freshdesk trigger is still on Ellie → remove it |
| Instagram or Messenger: no answer | App **Published**? Webhook verified and `messages` subscribed? Token valid (Instagram: `channel_tokens`, see `/api/cron/daily` in the Vercel logs)? Vercel logs for `instagram` / `messenger` |
| Meta: "Insufficient developer role" | Add the account as **Instagram Tester** and accept at instagram.com/accounts/manage_access |
| Avatar call won't start | Browser console (F12) and Vercel logs; check `ANAM_*`, input format PCM 16000 Hz, 3-minute limit |
| Voice widget test "draft_from_user_id" | Use the Inline test mode or refresh |
| Slack answers twice | Subscribed to both `app_mention` and `message.*` → keep one |
