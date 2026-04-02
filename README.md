# Voxtral + Anam Avatar Demo

A real-time AI avatar powered by [Voxtral TTS](https://mistral.ai/news/voxtral-tts) and [Anam](https://anam.ai), orchestrated via [LiveKit Agents](https://github.com/livekit/agents).

Talk to a photorealistic avatar that speaks with Mistral's Voxtral voice — with optional zero-shot voice cloning from your microphone.

```
User microphone
    → Deepgram Nova STT    (streaming speech-to-text)
    → Mistral Small LLM    (chat completion)
    → Voxtral Mini TTS     (text-to-speech)
    → Anam Cara 3          (lip-synced avatar face)
    → User sees a talking avatar + hears Voxtral voice
```

## Features

- **Configurable avatars** — choose from multiple Anam personas with live video preview
- **Voice selection** — 6 Voxtral TTS voice presets with audio preview
- **Zero-shot voice cloning** — record a few seconds of your voice and the avatar speaks in your voice
- **Embeddable** — `/embed` page designed for iframe integration
- **Fully open source** — fork and customize for your own use case

## Architecture

| Component | Technology | Role |
|-----------|-----------|------|
| **STT** | [Deepgram Nova](https://deepgram.com) | Streaming speech-to-text |
| **LLM** | [Mistral Small](https://mistral.ai) | Conversational AI |
| **TTS** | [Voxtral Mini TTS](https://mistral.ai/news/voxtral-tts) | Voice synthesis + cloning |
| **Face** | [Anam Cara 3](https://anam.ai) | Real-time lip-synced avatar |
| **Transport** | [LiveKit](https://livekit.io) | WebRTC infrastructure |
| **Agent** | [LiveKit Agents](https://github.com/livekit/agents) | Pipeline orchestration |
| **Frontend** | [Next.js](https://nextjs.org) | Web UI (deployable to Vercel) |

## Prerequisites

You need API keys from four services:

| Service | Get a key | Used for |
|---------|-----------|----------|
| [Mistral AI](https://console.mistral.ai) | console.mistral.ai | LLM + TTS |
| [Deepgram](https://console.deepgram.com) | console.deepgram.com | Streaming STT |
| [Anam](https://lab.anam.ai) | lab.anam.ai | Avatar rendering |
| [LiveKit](https://cloud.livekit.io) | cloud.livekit.io | WebRTC (free tier works) |

## Quick Start

### 1. Agent (Python)

```bash
git clone https://github.com/anam-org/voxtral-demo.git
cd voxtral-demo

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in your API keys
```

### 2. Frontend (Next.js)

```bash
cd web
npm install

cp .env.local.example .env.local
# Fill in LiveKit + Mistral + Anam keys
```

### 3. Run

Terminal 1 — agent:
```bash
python agent.py dev
```

Terminal 2 — frontend:
```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

### Frontend → Vercel

1. Import the repo on [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `web`
3. Add environment variables: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `MISTRAL_API_KEY`, `ANAM_API_KEY`

### Agent → Any server with Python

The agent is a single Python file. Run it anywhere that can maintain a persistent WebSocket connection to LiveKit:

```bash
python agent.py start
```

A `Dockerfile` and Kubernetes deployment are included in `k8s/` for containerized deployments.

### Embed

The `/embed` page is designed for iframe integration:

```html
<iframe
  src="https://your-deployment.vercel.app/embed"
  allow="microphone"
  style="width: 400px; height: 500px; border: none; border-radius: 16px;"
></iframe>
```

## Configuration

### Environment Variables

**Agent** (`.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `MISTRAL_API_KEY` | Yes | Mistral AI key (LLM + TTS) |
| `DEEPGRAM_API_KEY` | Yes | Deepgram key (STT) |
| `ANAM_API_KEY` | Yes | Anam key (avatar) |
| `ANAM_AVATAR_ID` | No | Default avatar (defaults to Gabriel) |
| `LIVEKIT_URL` | Yes | LiveKit server URL |
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |

**Frontend** (`web/.env.local`):

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_URL` | Yes | LiveKit server URL |
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |
| `MISTRAL_API_KEY` | Yes | For voice preview generation |
| `ANAM_API_KEY` | Yes | For avatar thumbnails/video |

### Voices

Available Voxtral TTS voices:

| Voice | Style | Gender |
|-------|-------|--------|
| `en_paul_confident` | Confident | Male |
| `en_paul_cheerful` | Cheerful | Male |
| `gb_oliver_confident` | Confident | Male |
| `gb_oliver_cheerful` | Cheerful | Male |
| `gb_oliver_neutral` | Neutral | Male |
| `gb_jane_confident` | Confident | Female |
| `gb_jane_curious` | Curious | Female |
| `gb_jane_neutral` | Neutral | Female |
| `fr_marie_excited` | Excited | Female |
| `fr_marie_happy` | Happy | Female |
| `fr_marie_neutral` | Neutral | Female |

### Avatars

Browse and create avatars at [lab.anam.ai](https://lab.anam.ai). The demo includes 4 stock avatars. Set `ANAM_AVATAR_ID` to use a different default.

## License

MIT
