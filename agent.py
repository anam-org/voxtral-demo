"""
Voxtral + Anam Avatar Demo

A Mistral-powered voice agent with an Anam avatar face via LiveKit.

Pipeline:
  User mic → Silero VAD → Deepgram STT → Mistral LLM → Voxtral TTS → Anam Avatar → User

  - STT:  Deepgram Nova (streaming, for low latency)
  - LLM:  mistral-small-latest (chat completion, streaming)
  - TTS:  voxtral-mini-tts-2603 (text-to-speech)

Anam renders a lip-synced avatar face from the TTS audio in real-time.
"""

import asyncio
import json
import logging
import os

from dotenv import load_dotenv
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, cli
from livekit.plugins import anam, deepgram, mistralai, silero

load_dotenv()

logger = logging.getLogger("voxtral-anam-demo")
logger.setLevel(logging.INFO)

SYSTEM_PROMPT = """\
# PERSONALITY
You are a human-like AI persona developed by Anam. You are \
approachable, professional, and focused on providing accurate information \
in a friendly manner. You are a good listener and a concise communicator.

# ENVIRONMENT
You operate in a voice-based conversational setting where users speak to \
you and hear your responses through text-to-speech. Interactions are \
real-time and conversational. You are powered by Mistral AI \
for language understanding and voice synthesis, \
with Anam rendering your face in real-time.

# TONE
Your responses will be converted to speech using a text-to-speech system. \
Your output must be plain, unformatted text.

1. Silently correct for likely transcription errors. Focus on intended \
meaning, not literal text.
2. Provide short, direct answers unless the user explicitly asks for more \
detail. Keep responses to one to three sentences.
3. Always prioritize clarity and accuracy. Respond in plain text, without \
any formatting, bullet points, or extra conversational filler.
4. Occasionally add a pause "..." or natural disfluency like "Um" or "Hmm."
5. Your output will be directly converted to speech, so your response \
should be natural-sounding and appropriate for a spoken conversation.

# GOAL
Your primary objective is to assist users by answering their questions \
accurately and efficiently, providing helpful information in a \
conversational manner. If they ask about you, mention that you are powered \
by Mistral AI for all your thinking and speaking, and Anam for your visual \
presence. If they ask about Anam, share that Anam creates photorealistic \
AI personas that can be deployed into any app or website.

# GUARDRAILS
1. Do not generate inappropriate, abusive, or sexual content.
2. Do not provide harmful instructions or engage with disallowed topics.
3. If you are uncertain about a request, politely redirect the user back \
to how you can help them.\
"""

DEFAULT_AVATAR_ID = "6cc28442-cccd-42a8-b6e4-24b7210a09c5"
DEFAULT_VOICE = "en_paul_confident"

ALLOWED_VOICES = {
    "en_paul_confident", "en_paul_cheerful",
    "gb_oliver_confident", "gb_oliver_cheerful", "gb_oliver_neutral",
    "gb_jane_confident", "gb_jane_curious", "gb_jane_neutral",
    "fr_marie_excited", "fr_marie_happy", "fr_marie_neutral",
}

server = AgentServer()


@server.rtc_session(agent_name="voxtral-demo")
async def entrypoint(ctx: JobContext):
    anam_api_key = os.environ["ANAM_API_KEY"]

    # Read config from agent dispatch metadata
    config = {}
    if ctx.job.metadata:
        try:
            config = json.loads(ctx.job.metadata)
        except json.JSONDecodeError:
            pass

    avatar_id = config.get("avatarId", os.environ.get("ANAM_AVATAR_ID", DEFAULT_AVATAR_ID))
    voice = config.get("voice", DEFAULT_VOICE)
    if voice not in ALLOWED_VOICES:
        voice = DEFAULT_VOICE
    wants_clone = config.get("hasRefAudio") == "true"

    logger.info(f"Config: avatar={avatar_id}, voice={voice}, wantsClone={wants_clone}")

    # --- Anam avatar ---
    anam_avatar = anam.AvatarSession(
        persona_config=anam.PersonaConfig(name="Avatar", avatarId=avatar_id),
        api_key=anam_api_key,
        api_url="https://api.anam.ai",
    )

    # --- TTS: start with preset voice, swap to clone when data arrives ---
    tts = mistralai.TTS(model="voxtral-mini-tts-2603", voice=voice)

    # --- Voice pipeline ---
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3", language="en"),
        llm=mistralai.LLM(model="mistral-small-latest"),
        tts=tts,
    )

    # Start avatar + session IMMEDIATELY (don't block on voice clone)
    await anam_avatar.start(session, room=ctx.room)
    await session.start(
        agent=Agent(instructions=SYSTEM_PROMPT),
        room=ctx.room,
    )

    # If voice cloning, listen for data and hot-swap TTS when it arrives
    if wants_clone:
        chunks: dict[int, str] = {}
        total_expected = [0]

        def on_voice_data(packet):
            if packet.topic != "voice-clone":
                return
            text = packet.data.decode("utf-8")
            header, payload = text.split(":", 1)
            idx, total = header.split("/")
            total_expected[0] = int(total)
            chunks[int(idx)] = payload
            logger.info(f"Voice clone chunk {int(idx)+1}/{total}")
            if len(chunks) >= total_expected[0]:
                ref_audio = "".join(chunks[i] for i in range(total_expected[0]))
                logger.info(f"Voice clone complete: {len(ref_audio)} chars, updating TTS")
                tts.update_options(ref_audio=ref_audio)
                ctx.room.off("data_received", on_voice_data)

        ctx.room.on("data_received", on_voice_data)
        # Don't greet until clone is ready — wait up to 10s
        try:
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            pass
        ctx.room.off("data_received", on_voice_data)

        if total_expected[0] > 0 and len(chunks) >= total_expected[0]:
            session.generate_reply(instructions="Greet the user warmly and briefly introduce yourself.")
        else:
            logger.warning("Voice clone data never arrived, using preset voice")
            session.generate_reply(instructions="Greet the user warmly and briefly introduce yourself.")
    else:
        session.generate_reply(instructions="Greet the user warmly and briefly introduce yourself.")


if __name__ == "__main__":
    cli.run_app(server)
