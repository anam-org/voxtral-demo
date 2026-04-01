# Voxtral + Anam Avatar Demo

A voice AI agent powered entirely by Mistral's inference stack, with a real-time lip-synced avatar face by [Anam](https://anam.ai).

```
User microphone
    → Voxtral STT    (speech-to-text)
    → Mistral LLM    (chat completion)
    → Voxtral TTS    (text-to-speech)
    → Anam Avatar    (audio → lip-synced face video)
    → User sees a talking avatar + hears Voxtral voice
```

## What each model does

| Stage | Model | What it does |
|-------|-------|-------------|
| **STT** | `voxtral-mini-latest` | Transcribes user speech to text |
| **LLM** | `mistral-large-latest` | Generates conversational responses |
| **TTS** | `voxtral-mini-tts-2603` | Synthesizes natural speech from text |
| **VAD** | Silero VAD | Detects when the user starts/stops speaking |
| **Avatar** | Anam (via LiveKit) | Renders lip-synced avatar video from TTS audio |

## Prerequisites

You'll need API keys from three services:

1. **Mistral AI** — [console.mistral.ai](https://console.mistral.ai) — powers STT, LLM, and TTS
2. **Anam** — [lab.anam.ai](https://lab.anam.ai) — renders the avatar face
3. **LiveKit** — [cloud.livekit.io](https://cloud.livekit.io) — WebRTC infrastructure (free tier works)

## Quick Start

### 1. Set up the agent (Python)

```bash
git clone https://github.com/anam-org/voxtral-demo.git
cd voxtral-demo

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your API keys
```

### 2. Set up the web frontend (Next.js)

```bash
cd web
npm install
cp .env.local.example .env.local
# Edit .env.local with your LiveKit credentials
```

### 3. Run both

In one terminal — start the agent:
```bash
python agent.py dev
```

In another terminal — start the frontend:
```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Start Conversation**.

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `MISTRAL_API_KEY` | Yes | Mistral API key for STT, LLM, and TTS |
| `ANAM_API_KEY` | Yes | Anam API key for avatar rendering |
| `ANAM_AVATAR_ID` | No | Avatar ID (defaults to Leo) |
| `LIVEKIT_URL` | Yes | LiveKit server URL |
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |

### Changing the voice

The agent uses `gb_oliver_confident` by default. Available Voxtral TTS voices:

**Jane** (British female): `gb_jane_confident`, `gb_jane_curious`, `gb_jane_neutral`, `gb_jane_sad`, `gb_jane_confused`, `gb_jane_frustrated`, `gb_jane_jealousy`, `gb_jane_sarcasm`, `gb_jane_shameful`

**Marie** (French female): `fr_marie_angry`, `fr_marie_curious`, `fr_marie_excited`, `fr_marie_happy`, `fr_marie_neutral`, `fr_marie_sad`

**Oliver** (British male): `gb_oliver_angry`, `gb_oliver_cheerful`, `gb_oliver_confident`, `gb_oliver_curious`, `gb_oliver_excited`, `gb_oliver_neutral`, `gb_oliver_sad`

**Paul** (English male): `en_paul_angry`, `en_paul_cheerful`, `en_paul_confident`, `en_paul_excited`, `en_paul_frustrated`, `en_paul_happy`, `en_paul_neutral`, `en_paul_sad`

### Changing the avatar

Browse available avatars at [lab.anam.ai](https://lab.anam.ai) and set the `ANAM_AVATAR_ID` environment variable.

## How it works

This demo uses the [LiveKit Agents](https://github.com/livekit/agents) framework to orchestrate a voice AI pipeline:

1. **User speaks** into their microphone. LiveKit captures the audio via WebRTC.
2. **Silero VAD** detects speech boundaries (when the user starts and stops talking).
3. **Voxtral STT** transcribes each speech segment into text.
4. **Mistral LLM** generates a conversational response.
5. **Voxtral TTS** synthesizes the response into audio (24kHz PCM).
6. **Anam Avatar** receives the TTS audio via LiveKit data streams and generates a lip-synced video of the avatar speaking. The video is published back to the LiveKit room.
7. **User sees** the avatar's face moving in sync with the speech and hears the Voxtral voice.

The Anam avatar joins the LiveKit room as a separate participant. The agent redirects its audio output to the avatar via `DataStreamAudioOutput`, so the avatar receives the raw TTS audio and handles face generation server-side.
