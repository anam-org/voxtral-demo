"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DemoConfig {
  avatarId: string;
  voice: string;
  refAudio?: string;
}

interface AvatarData {
  id: string;
  name: string;
  imageUrl: string;
  videoUrl: string;
}

const VOICES = [
  { id: "en_paul_confident", name: "Paul", desc: "Confident", gender: "M" },
  { id: "gb_oliver_cheerful", name: "Oliver", desc: "Cheerful", gender: "M" },
  { id: "gb_jane_confident", name: "Jane", desc: "Confident", gender: "F" },
  { id: "fr_marie_happy", name: "Marie", desc: "Happy", gender: "F" },
  { id: "gb_oliver_neutral", name: "Oliver", desc: "Neutral", gender: "M" },
  { id: "gb_jane_curious", name: "Jane", desc: "Curious", gender: "F" },
];

interface ConfigPanelProps {
  onStart: (config: DemoConfig) => void;
  disabled: boolean;
}

export function ConfigPanel({ onStart, disabled }: ConfigPanelProps) {
  const [avatars, setAvatars] = useState<AvatarData[]>([]);
  const [avatarId, setAvatarId] = useState("");
  const [voice, setVoice] = useState(VOICES[0].id);
  const [useClone, setUseClone] = useState(false);
  const [recording, setRecording] = useState(false);
  const [refAudio, setRefAudio] = useState<string | undefined>();
  const [recordingTime, setRecordingTime] = useState(0);
  const [hoveredAvatar, setHoveredAvatar] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch avatars with image/video URLs
  useEffect(() => {
    fetch("/api/avatars")
      .then((r) => r.json())
      .then((data: AvatarData[]) => {
        setAvatars(data);
        if (data.length > 0) setAvatarId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // Preload all voice previews on mount
  const preloadedAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  useEffect(() => {
    VOICES.forEach((v) => {
      const audio = new Audio(`/api/voice-preview?voice=${v.id}`);
      audio.preload = "auto";
      preloadedAudioRef.current[v.id] = audio;
    });
  }, []);

  // Voice preview — play from preloaded cache
  const playVoice = useCallback((voiceId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }
    const audio = preloadedAudioRef.current[voiceId] || new Audio(`/api/voice-preview?voice=${voiceId}`);
    audio.currentTime = 0;
    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);
    audio.play();
    audioRef.current = audio;
    setPlayingVoice(voiceId);
  }, [playingVoice]);

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const webmBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Convert webm → wav (Mistral API requires mp3 or wav for ref_audio)
        const audioCtx = new AudioContext({ sampleRate: 24000 });
        const arrayBuf = await webmBlob.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(arrayBuf);
        const pcm = decoded.getChannelData(0);

        // Encode as 16-bit WAV
        const wavBuf = new ArrayBuffer(44 + pcm.length * 2);
        const view = new DataView(wavBuf);
        const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
        writeStr(0, "RIFF");
        view.setUint32(4, 36 + pcm.length * 2, true);
        writeStr(8, "WAVE");
        writeStr(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // mono
        view.setUint32(24, 24000, true); // sample rate
        view.setUint32(28, 48000, true); // byte rate
        view.setUint16(32, 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        writeStr(36, "data");
        view.setUint32(40, pcm.length * 2, true);
        for (let i = 0; i < pcm.length; i++) {
          const s = Math.max(-1, Math.min(1, pcm[i]));
          view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        audioCtx.close();

        const base64 = btoa(
          new Uint8Array(wavBuf).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        setRefAudio(base64);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingTime(0);
      setRefAudio(undefined);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      alert("Could not access microphone");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const handleStart = () => {
    onStart({
      avatarId,
      voice: useClone ? "" : voice,
      refAudio: useClone ? refAudio : undefined,
    });
  };

  return (
    <div className="fade-in flex w-full max-w-lg flex-col items-center gap-8">
      {/* Avatars — 2x2 grid */}
      <div className="w-full">
        <h3 className="mb-3 text-center text-sm font-medium text-white/50">Choose a face</h3>
        <div className="grid grid-cols-2 gap-3">
          {avatars.map((a) => (
            <button
              key={a.id}
              onClick={() => setAvatarId(a.id)}
              onMouseEnter={() => setHoveredAvatar(a.id)}
              onMouseLeave={() => setHoveredAvatar(null)}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all ${
                avatarId === a.id
                  ? "border-[var(--color-brand)] ring-1 ring-[var(--color-brand)]/30"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="relative aspect-3/2">
                {/* Static image */}
                <img
                  src={a.imageUrl}
                  alt={a.name}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                    hoveredAvatar === a.id ? "opacity-0" : "opacity-100"
                  }`}
                />
                {/* Video on hover */}
                {hoveredAvatar === a.id && (
                  <video
                    src={a.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
              {/* Name label */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                <span className="text-sm font-medium text-white">{a.name}</span>
              </div>
              {/* Selected indicator */}
              {avatarId === a.id && (
                <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-[var(--color-brand)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Voice — 3x2 grid + clone toggle */}
      <div className="w-full">
        <h3 className="mb-3 text-center text-sm font-medium text-white/50">Choose a voice</h3>

        <div className="mb-3 flex justify-center gap-2">
          <button
            onClick={() => setUseClone(false)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              !useClone
                ? "bg-[var(--color-brand)] text-white"
                : "border border-white/10 bg-white/5 text-white/50 hover:text-white/70"
            }`}
          >
            Voice Presets
          </button>
          <button
            onClick={() => setUseClone(true)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              useClone
                ? "bg-[var(--color-brand)] text-white"
                : "border border-white/10 bg-white/5 text-white/50 hover:text-white/70"
            }`}
          >
            Clone My Voice
          </button>
        </div>

        {!useClone ? (
          <div className="grid grid-cols-3 gap-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={`group cursor-pointer rounded-xl border px-3 py-3 text-left transition-all ${
                  voice === v.id
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)]/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white/80">{v.name}</div>
                    <div className="text-xs text-white/30">{v.desc}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); playVoice(v.id); }}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/50 transition-all hover:bg-white/20 hover:text-white"
                  >
                    {playingVoice === v.id ? (
                      <span className="text-xs">■</span>
                    ) : (
                      <span className="ml-0.5 text-xs">▶</span>
                    )}
                  </button>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-white/40">
              Record 3-10 seconds of your voice for zero-shot cloning
            </p>
            {!recording && !refAudio && (
              <button
                onClick={startRecording}
                className="cursor-pointer rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-red-400"
              >
                Start Recording
              </button>
            )}
            {recording && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  <span className="font-mono text-sm text-red-400">{recordingTime}s</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-white/20"
                >
                  Stop Recording
                </button>
              </div>
            )}
            {refAudio && !recording && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-green-400">Voice captured ({recordingTime}s)</span>
                <button
                  onClick={() => { setRefAudio(undefined); setRecordingTime(0); }}
                  className="cursor-pointer text-xs text-white/30 hover:text-white/60"
                >
                  Re-record
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Start */}
      <button
        onClick={handleStart}
        disabled={disabled || !avatarId || (useClone && !refAudio)}
        className="cursor-pointer rounded-full bg-[var(--color-brand)] px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-[var(--color-brand-light)] hover:shadow-[0_0_40px_rgba(255,107,53,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start Conversation
      </button>

      <p className="text-xs text-white/25">Requires microphone access</p>
    </div>
  );
}
