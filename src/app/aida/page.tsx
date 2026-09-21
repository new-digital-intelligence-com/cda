import type { Metadata } from "next";
import Link from "next/link";
import { AidaLobby } from "@/components/aida/AidaLobby";

export const metadata: Metadata = {
  title: "Aida rooms – CDA Customer Assistant Demo",
  robots: { index: false, follow: false },
};

// The employee side of Aida. Behind the site password like the rest of the site (see src/proxy.ts).
export default function AidaPage() {
  return (
    <>
      <div className="bg-cda-ink px-4 py-1.5 text-center text-xs text-white/80">NDI demo · not an official CDA website</div>
      <header className="bg-cda-dark text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-cda-red px-2.5 py-1 text-xl font-extrabold tracking-wider">CDA</span>
            <span className="text-lg font-semibold">Aida · staff</span>
          </div>
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Customer assistant
          </Link>
        </div>
        <div className="h-1 bg-cda-red" />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">
        <AidaLobby />
      </main>
    </>
  );
}
