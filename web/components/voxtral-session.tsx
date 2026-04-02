"use client";

import { useEffect, useState } from "react";
import { Track } from "livekit-client";
import {
  type AgentState,
  VideoTrack,
  useVoiceAssistant,
  useTracks,
} from "@livekit/components-react";

interface VoxtralSessionProps {
  onDisconnect: () => void;
}

function agentStateLabel(state: AgentState): string {
  switch (state) {
    case "connecting":
      return "Agent joining...";
    case "initializing":
      return "Initializing avatar...";
    case "listening":
      return "Listening";
    case "thinking":
      return "Thinking...";
    case "speaking":
      return "Speaking";
    default:
      return "";
  }
}

function agentStateColor(state: AgentState): string {
  switch (state) {
    case "listening":
      return "bg-green-500";
    case "thinking":
      return "bg-yellow-500";
    case "speaking":
      return "bg-[var(--color-brand)]";
    default:
      return "bg-white/30";
  }
}

const PIPELINE_BADGES = [
  { label: "Deepgram Nova", href: "https://deepgram.com" },
  { label: "Mistral Small", href: "https://mistral.ai" },
  { label: "Voxtral Mini TTS", href: "https://mistral.ai/news/voxtral-tts" },
  { label: "Anam Cara 3", href: "https://anam.ai" },
];

export function VoxtralSession({ onDisconnect }: VoxtralSessionProps) {
  const { state: agentState, videoTrack } = useVoiceAssistant();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (agentState === "connecting" || agentState === "initializing") {
      const timer = setTimeout(() => setShowTimeout(true), 25_000);
      return () => clearTimeout(timer);
    }
    setShowTimeout(false);
  }, [agentState]);

  const isReady = agentState === "listening" || agentState === "thinking" || agentState === "speaking";

  function isBadgeActive(label: string): boolean {
    switch (label) {
      case "Deepgram Nova":
        return isReady;
      case "Mistral Small":
        return agentState === "thinking" || agentState === "speaking";
      case "Voxtral Mini TTS":
        return agentState === "speaking";
      case "Anam Cara 3":
        return !!videoTrack;
      default:
        return false;
    }
  }

  return (
    <div className="fade-in flex w-full max-w-2xl flex-col items-center gap-6">
      {/* Avatar video */}
      <div className="relative aspect-3/2 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/50">
        {videoTrack ? (
          <VideoTrack
            trackRef={videoTrack}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="pulse-ring absolute inset-0 rounded-full bg-[var(--color-brand)]" />
                <div className="relative h-12 w-12 rounded-full bg-[var(--color-brand)]/20" />
              </div>
              <p className="text-sm text-white/40">
                {showTimeout
                  ? "Taking longer than expected. Is the agent running?"
                  : "Waiting for avatar..."}
              </p>
            </div>
          </div>
        )}

        {/* State indicator */}
        {isReady && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <div className={`h-2 w-2 rounded-full ${agentStateColor(agentState)}`} />
            <span className="text-xs font-medium text-white/80">
              {agentStateLabel(agentState)}
            </span>
          </div>
        )}
      </div>

      {/* Pipeline badges */}
      <div className="flex flex-wrap justify-center gap-2">
        {PIPELINE_BADGES.map(({ label, href }) => {
          const active = isBadgeActive(label);
          return (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-300 hover:opacity-80 ${
                active
                  ? "border-[var(--color-brand)]/40 bg-[var(--color-brand)]/10 text-[var(--color-brand)]"
                  : "border-white/10 bg-white/5 text-white/30"
              }`}
            >
              {label}
            </a>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <MicIndicator />

        <button
          onClick={onDisconnect}
          className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
        >
          End Session
        </button>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-6 text-xs">
        <a href="https://docs.anam.ai" target="_blank" rel="noopener noreferrer" className="text-white/25 hover:text-[var(--color-brand)] transition-colors">
          Anam Docs
        </a>
        <a href="https://lab.anam.ai" target="_blank" rel="noopener noreferrer" className="text-white/25 hover:text-[var(--color-brand)] transition-colors">
          Build Your Own
        </a>
        <a href="https://github.com/anam-org/voxtral-demo" target="_blank" rel="noopener noreferrer" className="text-white/25 hover:text-[var(--color-brand)] transition-colors">
          Source Code
        </a>
      </div>
    </div>
  );
}

function MicIndicator() {
  const tracks = useTracks([Track.Source.Microphone]);
  const micTrack = tracks.find(
    (t) => t.source === Track.Source.Microphone && t.participant.isLocal
  );
  const isActive = micTrack && !micTrack.publication.isMuted;

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5">
      <div
        className={`h-2.5 w-2.5 rounded-full transition-colors ${
          isActive ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-sm text-white/50">
        {isActive ? "Mic on" : "Mic off"}
      </span>
    </div>
  );
}
