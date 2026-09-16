import AssistantApp from "@/components/AssistantApp";

const helpTopics = [
  "Product features, dimensions and energy ratings",
  "Warranty and appliance registration",
  "Faults, repairs and engineer visits",
  "Spare parts, accessories and user manuals",
  "Where to buy CDA appliances",
];

export default function Home() {
  return (
    <>
      <div className="bg-cda-ink px-4 py-1.5 text-center text-xs text-white/80">
        NDI demo · not an official CDA website
      </div>

      <header className="bg-cda-dark text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-cda-red px-2.5 py-1 text-xl font-extrabold tracking-wider">CDA</span>
            <span className="text-lg font-semibold">Customer Assistant</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.cda.co.uk/customer-care/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm text-white/80 hover:text-white sm:block"
            >
              CDA Customer Care ↗
            </a>
            <form action="/api/logout" method="post">
              <button type="submit" className="rounded-full border border-white/30 px-3 py-1 text-xs text-white/80 hover:text-white">
                Log out
              </button>
            </form>
          </div>
        </div>
        <div className="h-1 bg-cda-red" />
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-bold text-cda-dark">Hi, I&apos;m Ellie</h1>
            <p className="mt-2 text-cda-text">
              The virtual assistant for CDA kitchen appliances. Chat with me, send a photo or PDF, or switch to
              voice and just talk.
            </p>
          </section>
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-cda-dark">I can help with</h2>
            <ul className="mt-3 space-y-2 text-sm text-cda-text">
              {helpTopics.map((topic) => (
                <li key={topic} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cda-red" />
                  {topic}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border-l-4 border-cda-red bg-white p-5 text-sm text-cda-text shadow-sm">
            <p className="font-semibold text-cda-dark">Smell gas?</p>
            <p className="mt-1">
              Leave the property and call the National Gas Emergency Service on <strong>0800 111 999</strong>.
            </p>
          </section>
        </aside>

        <AssistantApp />
      </main>

      <footer className="mt-auto bg-cda-blue text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-sm sm:flex-row sm:justify-between">
          <span>CDA Customer Care: 01949 862012 · Mon–Fri 9am–5pm, Sat 9am–1pm</span>
          <span>Demo built by NDI with ElevenLabs Agents</span>
        </div>
      </footer>
    </>
  );
}
