// Emails CDA staff when a customer is upset, so someone follows up while it still matters.
// Recipients: STAFF_ALERT_EMAIL (one address, or several separated by commas). Without it nobody is
// emailed and the conversation simply waits on /admin → 😊 Mood.

import { mailboxAddress } from "./gmail";
import { mailConfigured, sendMail } from "./mailer";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CHANNEL_NAMES: Record<string, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  messenger: "Facebook Messenger",
  email: "Email",
  phone: "Phone",
  website: "Website",
  alexa: "Alexa",
  slack: "Slack",
  messaging: "Messaging app",
};

export function channelName(channel: string | null | undefined): string {
  return channel ? (CHANNEL_NAMES[channel] ?? channel) : "Unknown channel";
}

/** Never the CDA mailbox itself: Ellie would read the alert as a customer email. */
function recipients(): string[] {
  const own = mailboxAddress();
  return (process.env.STAFF_ALERT_EMAIL ?? "")
    .split(/[,;\s]+/)
    .map((address) => address.trim().toLowerCase())
    .filter((address) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) && address !== own);
}

export function moodAlertsConfigured(): boolean {
  return mailConfigured() && recipients().length > 0;
}

function adminLink(): string | null {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}/admin` : null;
}

const LONDON = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });

type Alert =
  | {
      kind: "conversation";
      channel: string | null;
      customerName: string | null;
      when: Date;
      label: string;
      score: number;
      frustration: number;
      lowPoint: string | null;
      title: string | null;
      summary: string | null;
      followUp: boolean;
    }
  | {
      kind: "email";
      fromName: string | null;
      fromEmail: string | null;
      subject: string | null;
      when: Date;
      frustration: number;
      reason: string;
    };

/** True when at least one staff member was emailed. */
export async function sendMoodAlert(alert: Alert): Promise<boolean> {
  const to = recipients();
  if (!to.length || !mailConfigured()) return false;

  const rows: [string, string][] =
    alert.kind === "conversation"
      ? [
          ["Customer", alert.customerName ?? "Not identified"],
          ["Channel", channelName(alert.channel)],
          ["When", `${LONDON.format(alert.when)} (UK time)`],
          ["Mood", `${alert.label}, sentiment ${alert.score.toFixed(1)}, frustration ${Math.round(alert.frustration * 100)}%`],
          ...(alert.followUp ? ([["Follow-up", "Ellie told the customer that the CDA team will get back to them"]] as [string, string][]) : []),
          ...(alert.lowPoint ? ([["Where it turned", `“${alert.lowPoint}”`]] as [string, string][]) : []),
          ...(alert.summary ? ([["Summary", alert.summary]] as [string, string][]) : []),
        ]
      : [
          ["From", alert.fromName ? `${alert.fromName} <${alert.fromEmail ?? ""}>` : alert.fromEmail ?? "Unknown sender"],
          ["Subject", alert.subject || "(no subject)"],
          ["When", `${LONDON.format(alert.when)} (UK time)`],
          ["Mood", `upset, frustration ${Math.round(alert.frustration * 100)}%${alert.reason ? ` (${alert.reason})` : ""}`],
          ["What Ellie did", "She did not reply. Her answer is waiting as a Gmail draft labelled “Ellie/Upset customer” for you to check."],
        ];

  const heading =
    alert.kind === "email"
      ? "An upset customer emailed CDA"
      : alert.followUp && alert.frustration < 0.6
        ? "A customer is waiting for a follow-up"
        : "A customer was upset talking to Ellie";
  const subject =
    alert.kind === "email"
      ? `[CDA demo] Upset customer email: ${alert.subject || "(no subject)"}`
      : `[CDA demo] ${heading} (${channelName(alert.channel)})`;
  const link = adminLink();

  const text = [heading, "", ...rows.map(([name, value]) => `${name}: ${value}`), "", link ? `Open /admin → 😊 Mood: ${link}` : ""]
    .join("\n")
    .trim();
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;color:#333333">
<h2 style="margin:0 0 12px;font-size:18px;color:#c8362d">${escapeHtml(heading)}</h2>
<table style="border-collapse:collapse;font-size:14px;width:100%">${rows
    .map(
      ([name, value]) =>
        `<tr><td style="padding:6px 10px;color:#666666;vertical-align:top;white-space:nowrap">${escapeHtml(name)}</td><td style="padding:6px 10px">${escapeHtml(value)}</td></tr>`,
    )
    .join("")}</table>
${link ? `<p style="margin-top:18px"><a href="${escapeHtml(link)}" style="color:#e84339">Open /admin → 😊 Mood</a></p>` : ""}
<p style="margin-top:18px;color:#999999;font-size:12px">Sent by the CDA customer assistant demo (NDI). Mood scores come from ElevenLabs and Claude.</p>
</div>`;

  await sendMail({ to: to.join(", "), subject, text, html });
  return true;
}
