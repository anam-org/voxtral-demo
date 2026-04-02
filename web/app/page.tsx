"use client";

import { useCallback, useMemo, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { RoomAudioRenderer, RoomContext, StartAudio } from "@livekit/components-react";
import { ConfigPanel, type DemoConfig } from "@/components/config-panel";
import { VoxtralSession } from "@/components/voxtral-session";
import type { ConnectionDetails } from "./api/connection-details/route";

export default function Home() {
  const room = useMemo(() => new Room(), []);
  const [state, setState] = useState<"idle" | "connecting" | "connected">("idle");
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (config: DemoConfig) => {
    setState("connecting");
    setError(null);

    try {
      const metadata: Record<string, string> = {
        avatarId: config.avatarId,
        voice: config.voice,
      };
      // Signal that voice cloning audio will be sent via data channel
      if (config.refAudio) {
        metadata.hasRefAudio = "true";
      }

      const res = await fetch("/api/connection-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata }),
      });
      if (!res.ok) throw new Error(await res.text());

      const details: ConnectionDetails = await res.json();

      room.on(RoomEvent.Disconnected, () => setState("idle"));

      await room.connect(details.serverUrl, details.participantToken);
      setState("connected");

      // Send voice clone audio via data channel in chunks (64KB limit per message)
      // Wait for the agent to join before sending, so it can receive the data
      if (config.refAudio) {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (room.remoteParticipants.size > 0) {
              resolve();
            } else {
              room.once(RoomEvent.ParticipantConnected, () => resolve());
              // Fallback timeout
              setTimeout(resolve, 5000);
            }
          };
          check();
        });

        // Small extra delay to ensure agent's event handlers are registered
        await new Promise((r) => setTimeout(r, 500));

        const CHUNK_SIZE = 60000;
        const total = Math.ceil(config.refAudio.length / CHUNK_SIZE);
        for (let i = 0; i < total; i++) {
          const chunk = config.refAudio.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const header = `${i}/${total}:`;
          await room.localParticipant.publishData(
            new TextEncoder().encode(header + chunk),
            { reliable: true, topic: "voice-clone" }
          );
        }
      }

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        console.warn("Microphone access denied");
      }
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
            <div className="mb-8">
              <h1 className="mb-3 text-4xl font-bold tracking-tight">
                <a href="https://mistral.ai/news/voxtral-tts" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand)] hover:underline">Voxtral</a>
                {" "}
                <span className="text-white/40">+</span>
                {" "}
                <a href="https://anam.ai" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">Anam</a>
              </h1>
              <p className="text-white/40">
                Real-time AI avatar powered by Voxtral TTS
              </p>
            </div>

            <ConfigPanel onStart={connect} disabled={state !== "idle"} />

            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}

            <div className="mt-8 flex items-center gap-6 text-xs">
              <a href="https://docs.anam.ai" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[var(--color-brand)] transition-colors">
                Anam Docs
              </a>
              <a href="https://lab.anam.ai" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[var(--color-brand)] transition-colors">
                Try Anam Lab
              </a>
              <a href="https://github.com/anam-org/voxtral-demo" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[var(--color-brand)] transition-colors">
                Source Code
              </a>
            </div>
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

        <div className="fixed bottom-4 right-4">
          <a
            href="https://anam.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/30 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white/50"
          >
            Powered by <span className="font-semibold text-white/50">Anam</span>
          </a>
        </div>
      </div>
    </RoomContext.Provider>
  );
}
