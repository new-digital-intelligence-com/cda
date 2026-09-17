# Claude handoff – CDA multi-channel assistant demo

Read this first when continuing the project on another device. Last updated: **17 September 2026**.
Full channel-by-channel setup (IDs, steps, costs, troubleshooting): [CHANNEL_SETUP.md](CHANNEL_SETUP.md).

> **This repository is public.** Never write API keys, tokens, passwords or secrets into any committed file.

---

## 1. What this project is

NDI (New Digital Intelligence) is building a **demo** multi-channel front-office assistant for **CDA**
(UK kitchen appliance brand, www.cda.co.uk). It is not an official CDA service.

One AI agent, **Ellie**, runs on **ElevenLabs Agents** and answers on every channel with the same prompt,
knowledge base and model. Only **Agent mode** (Ellie replies directly) is active; Copilot mode is parked.

| Channel | Status | How |
|---|---|---|
| Telegram @CDA_2026_Support_Bot | ✅ Live | Native ElevenLabs Telegram trigger |
| Email cda_domestic_appliances@new-digital-intelligence.com | ✅ Live | Freshdesk trial + native Freshdesk trigger |
| Instagram DMs | ✅ Live | Make.com scenarios + ElevenLabs Custom Channel |
| Hosted web page / QR code | ✅ Live | ElevenLabs talk-to link (not password protected) |
| **This web app** (chat, file upload, voice, video avatar, channel links) | ✅ Live | Next.js on Vercel: https://cda-nine-ebon.vercel.app (password protected) |
| Video avatar (Avatar tab) | ✅ Live | **Anam** avatar "Sofia" (the user's own Ellie picture) joined to the ElevenLabs agent |
| Slack (bot "CDA_Support") | ⏳ In progress | Native ElevenLabs Slack integration, own Slack app (see §5) |
| WhatsApp, phone number, Copilot mode | ⏸ Parked | See CHANNEL_SETUP.md §14 |

---

## 2. How the user wants you to work (important)

- **Never use subagents or workflows.** Do all work yourself.
- **Git commits:** author **HelmiDev03 <helmipaty@gmail.com>**, and **no `Co-Authored-By` trailer**. Only push when the user says so.
- **Don't spend credits testing.** Never start conversations with Ellie (chat, voice, avatar calls, simulate-conversation) or start avatar/phone sessions yourself. Free read-only API checks are fine. Give the user test questions with expected answers instead.
- **One step at a time, simple English** (the user is not a native English speaker). Wait until a step is finished before the next.
- **No bridge/workaround code for channels.** Prefer native ElevenLabs integrations or no-code tools (Make.com). The web app itself is the exception.
- **Verify before claiming a cause.** Use API checks, docs and logs; don't guess (e.g. plan limits).
- When something fails in the browser (avatar, voice), ask the user for the **F12 → Console** output.

---

## 3. Getting set up on a new device

```bash
git clone git@github.com:new-digital-intelligence-com/cda.git
cd cda
npm install
```

Create `.env.local` (git-ignored). Copy the values from **Vercel → project `cda` → Settings → Environment Variables**
(or `npx vercel env pull .env.local` after `vercel login` + `vercel link`):

| Variable | What |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs key (needs Agents read/write, `convai_read`, `user_read`, `voices_read`) |
| `ELEVENLABS_AGENT_ID` | Ellie's agent ID |
| `SITE_PASSWORD` | Password for the demo site |
| `ANAM_API_KEY` | Anam API key |
| `ANAM_AVATAR_ID` | Anam avatar Sofia |
| `ANAM_MAX_SESSION_SECONDS` | `180` (Anam free plan limit) |
| `SUPABASE_URL` | Supabase project for the cross-channel customer memory |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `AGENT_TOOL_SECRET` | Secret the agent's tools send in `x-cda-agent-secret` |
| `ELEVENLABS_WEBHOOK_SECRET` | Signing secret of the post-call webhook |
| `FRESHDESK_API_KEY` / `FRESHDESK_SUBDOMAIN` | Used to find who wrote an email ticket |

```bash
npm run dev      # http://localhost:3000
npm run build    # run before `npx tsc --noEmit` (stale .next types otherwise)
npm run lint
```

Use the keys from `.env.local` for API work (ElevenLabs, Anam). Never print them in full or commit them.

Only this repository is needed on the new device. The folders `CDA_Knowledge_Base/` and `CDA_Demo_Assets/`
stayed on the old device: the knowledge PDFs already live in Google Drive (synced to ElevenLabs) and the QR code
can be regenerated from the talk-to link. The script that generated the PDFs was temporary and is not kept.

---

## 4. Key facts

**ElevenLabs** (Creator plan, 121,005 credits/month, resets ~17th)
- Agent "CDA Assistant – Demo", ID `agent_3601m2p374tce96b7p6hdfz5f1tv`, branch `agtbrch_9301m2p375xzetbbsyymxnbnsf1s`
- Gemini 3.7 Flash (temperature 0), voice **Shelley** (British), TTS **Eleven Flash v2** (English-only), STT **Scribe Realtime**, turn model turn_v3
- **Audio: input PCM 16000 Hz (required by Anam), output PCM 24000 Hz**
- 31 knowledge documents (21 cda.co.uk URLs + 10 PDFs synced from Google Drive), RAG every turn
- Prompt has per-channel rules ("Telegram only", "Instagram only", "Website chat", phone/avatar short answers)
- Settings changes via API: `PATCH /v1/convai/agents/{id}?branch_id=…` with only the changed `conversation_config` part, then re-read to confirm; back up the agent JSON first
- Voice/avatar minutes cost about **600 credits per minute**

**Web app** (Next.js 16 – read `node_modules/next/dist/docs/` before using unfamiliar APIs; see AGENTS.md)
- `src/proxy.ts` + `src/lib/auth.ts`: password lock on every page and API route
- `src/components/AssistantApp.tsx`: tabs Chat / Voice / Avatar
- `src/app/api/elevenlabs/*`: signed URL (chat) and conversation token (voice)
- `src/app/api/anam/session/route.ts` + `src/components/AvatarPanel.tsx`: Anam avatar. The server gets an ElevenLabs signed URL and creates an Anam session token (`avatarModel: cara-4`, `maxSessionLengthSeconds`, `directorNotes` warm 0.5, `sessionOptions` 1152×768 or 768×1152, `environment.elevenLabsAgentSettings`). Anam Lab stores **no** ElevenLabs link; the "Olivia" persona in Lab is not used
- `src/components/ChannelLinks.tsx`: Email (Gmail compose), Telegram and Instagram buttons (Instagram label shows @CDA_2026_Support_Bot but opens @samrasellimi)
- `src/app/api/agent/*` + `src/lib/customers.ts` + `supabase/schema.sql`: **cross-channel customer memory**
  (CHANNEL_SETUP.md §16). Email is the bridge between channels. These three routes are exempt from the
  site password in `src/proxy.ts` and use a shared secret / HMAC instead (`src/lib/agentAuth.ts`).
  Live on Vercel and tested against production. Supabase project and env vars (local + Vercel) are done,
  and all five channels have a working identifier (email comes from the Freshdesk ticket).
  Still to do: the two agent tools, the post-call webhook, the prompt block and the Make edit
- Vercel deploys `main` automatically; after changing env vars on Vercel, redeploy

**Anam** (free plan: 30 min/month, 3-min calls, 1 custom avatar) – avatar Sofia, Cara 4, supports horizontal and vertical.
The earlier HeyGen LiveAvatar tab was removed (commit `69eb3da` has it).

**Make.com** (eu1, free plan 1,000 operations/month): scenarios "IG – Instagram in" (7456234) and
"IG – Ellie reply out" (7456248), data store `ig_conversations` (190081, 10-minute conversation window).

---

## 5. Open tasks (in order)

0. **Cross-channel customer memory** – **live** on Telegram, email and the website. Details: CHANNEL_SETUP.md §16.
   Done: Supabase project + schema, all env vars (local + Vercel), the three routes deployed and tested
   against production, both agent tools created and attached, the prompt block added, the post-call
   webhook created and linked. The agent API commits straight to Main, so no Publish step was needed.
   - **Left to do:** add `"dynamic_variables": {"instagram_id": "<sender id>"}` to the Make scenario
     "IG – Instagram in" (top level, next to `data`), or Instagram customers are not recognised
   - **Left to do:** the user tests it — Telegram first, then the same email on another channel
   - Weak spot: email identity relies on the undocumented `_fd_<ticket>` ending of the conversation id
   - Note: ElevenLabs' own `user_memory` setting is **off** on purpose — Telegram and email conversations
     all carry the workspace owner's `user_id`, so switching it on would merge every customer into one memory
1. **Slack** – waiting for the user:
   - The "New Digital Intelligence" Slack workspace hit the free plan's 10-app limit → use a new demo workspace or remove an unused app.
   - User creates the **CDA_Support** app from the manifest in CHANNEL_SETUP.md §10, installs it, and gives the **Bot User OAuth Token** + **Signing Secret** and the mode (mention-only or all messages).
   - Then: ElevenLabs Integrations → Slack → "Bring your own bot" → Slack Event Subscriptions + Interactivity URLs → triggers Channel Message + Direct Message → test (user tests).
2. **Confirm the Voice tab still works** after the input format change to PCM 16000 (the user confirmed the avatar, not voice yet).
3. Optional: label Anam sessions in the session token (`clientLabel` / persona `name`, e.g. "Ellie – CDA website") so calls are easy to find in Anam Lab.
4. **Security decision (ask the user):** the public repo exposes the agent ID and talk-to link, so anyone can use ElevenLabs credits without the site password. Options: make the repo private (check Vercel still deploys) or enable agent authentication (breaks the public page/QR/widget; retest channels).
5. For the CDA demo: Anam **Explorer ($49/month)** removes the watermark and allows 10-minute calls (then raise `ANAM_MAX_SESSION_SECONDS`).
6. Ideas the user may pick: Facebook Messenger (copy the Instagram Make setup), email via Make + Gmail before Freshdesk ends, phone number via Twilio, Flash v2.5 voice model for non-English voice.

## 6. Dates and housekeeping

| When | What |
|---|---|
| ~1 Oct 2026 | **Freshdesk trial ends** → email stops unless paid or moved to Make + Gmail |
| ~17 Oct 2026 | ElevenLabs credits reset |
| Before ~16 Nov 2026 | **Refresh the Instagram token** (60-day token) and update the Make reply scenario header |
| After the demo | Rotate keys that were shared in chat (ElevenLabs, Anam, **Supabase service role**), delete the Make API token, delete the unused LiveAvatar API key/secret/voice agent |
