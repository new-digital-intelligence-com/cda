import type { ReactNode } from "react";

const SUPPORT_EMAIL = "cda_domestic_appliances@new-digital-intelligence.com";

type Channel = {
  name: string;
  detail: string;
  href: string;
  iconClassName: string;
  icon: ReactNode;
};

const channels: Channel[] = [
  {
    name: "Email",
    detail: SUPPORT_EMAIL,
    href: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodeURIComponent("Question for CDA")}`,
    iconClassName: "bg-[#ea4335]",
    icon: (
      <>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </>
    ),
  },
  {
    name: "Telegram",
    detail: "@CDA_2026_Support_Bot",
    href: "https://t.me/CDA_2026_Support_Bot",
    iconClassName: "bg-[#229ed9]",
    icon: (
      <>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7z" />
      </>
    ),
  },
  {
    name: "Instagram",
    // Display name only; the link below still opens the real account.
    detail: "@CDA_2026_Support_Bot",
    href: "https://ig.me/m/samrasellimi",
    iconClassName: "bg-linear-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]",
    icon: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </>
    ),
  },
];

export function ChannelLinks() {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-cda-dark">Message Ellie on your app</h2>
      <ul className="mt-2 space-y-1.5">
        {channels.map((channel) => (
          <li key={channel.name}>
            <a
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-cda-grey p-2.5 transition hover:border-cda-red hover:bg-cda-grey-light"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${channel.iconClassName}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {channel.icon}
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-cda-dark">{channel.name}</span>
                <span className="block text-xs text-cda-text wrap-anywhere">{channel.detail}</span>
              </span>
              <span className="text-cda-text" aria-hidden="true">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
