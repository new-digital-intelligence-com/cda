"use client";

import { useState } from "react";

type AvatarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "active"; url: string; maxSeconds: number }
  | { status: "error"; message: string };

export function AvatarPanel() {
  const [state, setState] = useState<AvatarState>({ status: "idle" });

  async function start() {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/liveavatar/embed", { method: "POST" });
      const body = (await response.json()) as { url?: string; maxSeconds?: number; error?: string };
      if (!response.ok || !body.url) {
        setState({ status: "error", message: body.error ?? "Could not start the avatar. Please try again." });
        return;
      }
      setState({ status: "active", url: body.url, maxSeconds: body.maxSeconds ?? 120 });
    } catch {
      setState({ status: "error", message: "Could not start the avatar. Please try again." });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 bg-cda-grey-light p-4">
      {state.status === "active" ? (
        <>
          <div className="overflow-hidden rounded-xl bg-cda-dark shadow-sm">
            <iframe
              key={state.url}
              src={state.url}
              title="Ellie video assistant"
              allow="microphone; autoplay"
              className="aspect-video w-full border-0"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-cda-text">
              Press start inside the video and allow the microphone. Calls end after{" "}
              {Math.round(state.maxSeconds / 60)} minutes.
            </p>
            <button
              onClick={() => setState({ status: "idle" })}
              className="rounded-full bg-cda-dark px-6 py-2.5 font-semibold text-white transition hover:bg-black"
            >
              End video call
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cda-red/10 text-4xl">🧑‍💼</div>
          <div>
            <h2 className="text-xl font-bold text-cda-dark">Talk to Ellie face to face</h2>
            <p className="mt-1 max-w-md text-cda-text">
              Start a video call with Ellie. She listens, answers out loud and uses the same CDA knowledge as the chat.
            </p>
          </div>
          {state.status === "error" && <p className="text-sm text-cda-red-dark">{state.message}</p>}
          <button
            onClick={() => void start()}
            disabled={state.status === "loading"}
            className="rounded-full bg-cda-red px-8 py-3 font-semibold text-white shadow transition hover:bg-cda-red-dark disabled:opacity-50"
          >
            {state.status === "loading" ? "Preparing…" : "Start video call"}
          </button>
        </div>
      )}
    </div>
  );
}
