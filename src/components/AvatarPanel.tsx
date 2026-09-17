"use client";

import type { AnamClient } from "@anam-ai/js-sdk";
import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "./types";

const VIDEO_ELEMENT_ID = "ellie-avatar-video";
const START_ERROR = "Could not start the video call. Please try again.";

type CallStatus = "idle" | "connecting" | "connected";

export function AvatarPanel() {
  const clientRef = useRef<AnamClient | null>(null);
  // Bumped on every start/stop so a call that is still connecting can tell it was cancelled.
  const attemptRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [maxSeconds, setMaxSeconds] = useState(180);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Stop the stream (and the microphone) when the tab is left.
  useEffect(
    () => () => {
      attemptRef.current += 1;
      void clientRef.current?.stopStreaming();
    },
    [],
  );

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  async function start() {
    const attempt = ++attemptRef.current;
    setStatus("connecting");
    setError(null);
    setMessages([]);
    try {
      const response = await fetch("/api/anam/session", { method: "POST" });
      const body = (await response.json()) as { sessionToken?: string; maxSeconds?: number; error?: string };
      if (!response.ok || !body.sessionToken) {
        throw new Error(body.error ?? START_ERROR);
      }
      setMaxSeconds(body.maxSeconds ?? 180);

      // The SDK needs the browser (WebRTC, microphone), so it is loaded only when a call starts.
      const { AnamEvent, ConnectionClosedCode, MessageRole, createClient } = await import("@anam-ai/js-sdk");
      if (attempt !== attemptRef.current) return;
      const client = createClient(body.sessionToken);
      clientRef.current = client;

      // Captions arrive in chunks; join the chunks of each message by its id.
      client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event) => {
        setMessages((previous) => {
          const index = previous.findIndex((message) => message.id === event.id);
          if (index === -1) {
            const role = event.role === MessageRole.USER ? "user" : "agent";
            return [...previous, { id: event.id, role, text: event.content }];
          }
          const next = [...previous];
          next[index] = { ...next[index], text: next[index].text + event.content };
          return next;
        });
      });
      client.addListener(AnamEvent.CONNECTION_CLOSED, (reason) => {
        if (clientRef.current !== client) return;
        clientRef.current = null;
        setStatus("idle");
        if (reason === ConnectionClosedCode.MICROPHONE_PERMISSION_DENIED) {
          setError("Please allow the microphone to talk to Ellie.");
        } else if (
          reason === ConnectionClosedCode.WEBRTC_FAILURE ||
          reason === ConnectionClosedCode.SIGNALLING_CLIENT_CONNECTION_FAILURE
        ) {
          setError("The connection was lost. Please try again.");
        }
      });

      await client.streamToVideoElement(VIDEO_ELEMENT_ID);
      if (attempt !== attemptRef.current) {
        await client.stopStreaming();
        return;
      }
      setStatus("connected");
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      console.error(err);
      const client = clientRef.current;
      clientRef.current = null;
      await client?.stopStreaming().catch(() => undefined);
      setStatus("idle");
      setError(err instanceof Error && err.message ? err.message : START_ERROR);
    }
  }

  async function stop() {
    attemptRef.current += 1;
    const client = clientRef.current;
    clientRef.current = null;
    setStatus("idle");
    await client?.stopStreaming();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 bg-cda-grey-light p-4">
      <div className={status === "idle" ? "hidden" : "relative overflow-hidden rounded-xl bg-cda-dark shadow-sm"}>
        <video id={VIDEO_ELEMENT_ID} autoPlay playsInline className="aspect-video w-full object-cover" />
        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            Connecting to Ellie…
          </div>
        )}
      </div>

      {status === "idle" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cda-red/10 text-4xl">🧑‍💼</div>
          <div>
            <h2 className="text-xl font-bold text-cda-dark">Talk to Ellie face to face</h2>
            <p className="mt-1 max-w-md text-cda-text">
              Start a video call with Ellie. She listens, answers out loud and uses the same CDA knowledge as the chat.
            </p>
          </div>
          {error && <p className="text-sm text-cda-red-dark">{error}</p>}
          <button
            onClick={() => void start()}
            className="rounded-full bg-cda-red px-8 py-3 font-semibold text-white shadow transition hover:bg-cda-red-dark"
          >
            Start video call
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-cda-text">
              Allow the microphone and just talk. Calls end after {Math.round(maxSeconds / 60)} minutes.
            </p>
            <button
              onClick={() => void stop()}
              className="rounded-full bg-cda-dark px-6 py-2.5 font-semibold text-white transition hover:bg-black"
            >
              End video call
            </button>
          </div>
          {messages.length > 0 && (
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
