"use client";

import { useCallback, useMemo, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import {
  type AgentState,
  RoomAudioRenderer,
  RoomContext,
  StartAudio,
  VideoTrack,
  useVoiceAssistant,
} from "@livekit/components-react";
import type { ConnectionDetails } from "../api/connection-details/route";

const CONFIG = {
  avatarId: "6cc28442-cccd-42a8-b6e4-24b7210a09c5", // Gabriel
  voice: "en_paul_confident",
};

export default function EmbedPage() {
  const room = useMemo(() => new Room(), []);
  const [state, setState] = useState<"idle" | "connecting" | "connected">("idle");
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setState("connecting");
    setError(null);
    try {
      const res = await fetch("/api/connection-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: CONFIG }),
      });
      if (!res.ok) throw new Error(await res.text());
      const details: ConnectionDetails = await res.json();
      room.on(RoomEvent.Disconnected, () => setState("idle"));
      await room.connect(details.serverUrl, details.participantToken);
      setState("connected");
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
      <div className="flex h-dvh w-full flex-col bg-black">
        {state === "idle" && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <button
              onClick={connect}
              className="cursor-pointer rounded-full bg-[#ff6b35] px-6 py-3 text-base font-semibold text-white transition-all hover:bg-[#ff8c5a] hover:shadow-[0_0_30px_rgba(255,107,53,0.3)]"
            >
              Talk to Gabriel
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <p className="text-[10px] text-white/20">Requires microphone</p>
          </div>
        )}

        {state === "connecting" && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-white/40">Connecting...</p>
          </div>
        )}

        {state === "connected" && <EmbedSession onDisconnect={disconnect} />}
      </div>
    </RoomContext.Provider>
  );
}

function EmbedSession({ onDisconnect }: { onDisconnect: () => void }) {
  const { state: agentState, videoTrack } = useVoiceAssistant();

  const stateColor =
    agentState === "listening"
      ? "bg-green-500"
      : agentState === "thinking"
        ? "bg-yellow-500"
        : agentState === "speaking"
          ? "bg-[#ff6b35]"
          : "bg-white/30";

  const stateLabel =
    agentState === "listening"
      ? "Listening"
      : agentState === "thinking"
        ? "Thinking..."
        : agentState === "speaking"
          ? "Speaking"
          : agentState === "connecting"
            ? "Joining..."
            : agentState === "initializing"
              ? "Loading avatar..."
              : "";

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Avatar video — fills entire embed */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {videoTrack ? (
          <VideoTrack
            trackRef={videoTrack}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-sm text-white/30">Waiting for avatar...</p>
          </div>
        )}

        {/* State pill — top left */}
        {stateLabel && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
            <div className={`h-1.5 w-1.5 rounded-full ${stateColor}`} />
            <span className="text-[10px] font-medium text-white/70">{stateLabel}</span>
          </div>
        )}

        {/* End button — top right */}
        <button
          onClick={onDisconnect}
          className="absolute top-3 right-3 cursor-pointer rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/50 backdrop-blur-sm transition-all hover:bg-red-500/30 hover:text-red-300"
        >
          End
        </button>

        {/* Anam watermark — bottom right */}
        <a
          href="https://anam.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-0.5 text-[9px] text-white/25 backdrop-blur-sm transition-all hover:text-white/40"
        >
          Powered by Anam
        </a>
      </div>
    </div>
  );
}
