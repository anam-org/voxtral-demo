"use client";

import { useCallback, useMemo, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { RoomAudioRenderer, RoomContext, StartAudio } from "@livekit/components-react";
import { VoxtralSession } from "@/components/voxtral-session";
import type { ConnectionDetails } from "./api/connection-details/route";

export default function Home() {
  const room = useMemo(() => new Room(), []);
  const [state, setState] = useState<"idle" | "connecting" | "connected">("idle");
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setState("connecting");
    setError(null);

    try {
      const res = await fetch("/api/connection-details", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());

      const details: ConnectionDetails = await res.json();

      room.on(RoomEvent.Disconnected, () => setState("idle"));

      await room.localParticipant.setMicrophoneEnabled(true);
      await room.connect(details.serverUrl, details.participantToken);

      setState("connected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setState("idle");
    }
  }, [room]);

  const disconnect = useCallback(async () => {
    await room.disconnect();
    setState("idle");
  }, [room]);

  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <StartAudio label="Start Audio" />

      <div className="flex min-h-dvh flex-col items-center justify-center p-6">
        {state === "idle" && (
          <div className="fade-in flex max-w-lg flex-col items-center text-center">
            {/* Logo / Title */}
            <div className="mb-8">
              <h1 className="mb-2 text-4xl font-bold tracking-tight">
                <span className="text-[var(--color-brand)]">Voxtral</span>{" "}
                <span className="text-white/60">+</span>{" "}
                <span className="text-white">Anam</span>
              </h1>
              <p className="text-white/50 text-lg">
                Full-Mistral voice AI with a real-time avatar
              </p>
            </div>

            {/* Pipeline diagram */}
            <div className="mb-10 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-5 text-sm font-mono">
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-white/40">STT</span>
                <span className="text-[var(--color-brand)]">→</span>
                <span className="text-white/80">Voxtral Mini</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-white/40">LLM</span>
                <span className="text-[var(--color-brand)]">→</span>
                <span className="text-white/80">Mistral Large</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-white/40">TTS</span>
                <span className="text-[var(--color-brand)]">→</span>
                <span className="text-white/80">Voxtral TTS</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-white/40">Avatar</span>
                <span className="text-[var(--color-brand)]">→</span>
                <span className="text-white/80">Anam Face</span>
              </div>
            </div>

            {/* Start button */}
            <button
              onClick={connect}
              className="group relative cursor-pointer rounded-full bg-[var(--color-brand)] px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-[var(--color-brand-light)] hover:shadow-[0_0_40px_rgba(255,107,53,0.3)]"
            >
              Start Conversation
            </button>

            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}

            <p className="mt-6 text-xs text-white/30">
              Requires microphone access
            </p>
          </div>
        )}

        {state === "connecting" && (
          <div className="fade-in flex flex-col items-center gap-4">
            <div className="relative">
              <div className="pulse-ring absolute inset-0 rounded-full bg-[var(--color-brand)]" />
              <div className="relative h-16 w-16 rounded-full bg-[var(--color-brand)]/20 backdrop-blur" />
            </div>
            <p className="text-white/50">Connecting...</p>
          </div>
        )}

        {state === "connected" && (
          <VoxtralSession onDisconnect={disconnect} />
        )}
      </div>
    </RoomContext.Provider>
  );
}
