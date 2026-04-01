"""
Voxtral + Anam Avatar Demo

A full-Mistral voice agent with an Anam avatar face via LiveKit.

Pipeline:
  User mic → Silero VAD → Voxtral STT → Mistral LLM → Voxtral TTS → Anam Avatar → User

Every inference step uses Mistral models:
  - STT:  voxtral-mini-latest (speech-to-text)
  - LLM:  mistral-large-latest (chat completion)
  - TTS:  voxtral-mini-tts-2603 (text-to-speech)

Anam renders a lip-synced avatar face from the TTS audio in real-time.
"""

import logging
import os

from dotenv import load_dotenv
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, cli
from livekit.plugins import anam, mistralai, silero

load_dotenv()

logger = logging.getLogger("voxtral-anam-demo")
logger.setLevel(logging.INFO)

SYSTEM_PROMPT = """\
You are Leo, a friendly and knowledgeable AI assistant. You speak naturally, \
like a real person in a conversation. Keep your responses concise and \
conversational — one to three sentences unless the user asks you to elaborate. \
Avoid bullet points, markdown formatting, or anything that sounds robotic. \
Use natural transitions and speak as if you're chatting with a friend. \
If you don't know something, just say so honestly.\
"""

server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    # --- Anam avatar setup ---
    anam_api_key = os.environ["ANAM_API_KEY"]
    avatar_id = os.environ.get("ANAM_AVATAR_ID", "aa5d6abd-416f-4dd4-a123-b5b29bf1644a")

    anam_avatar = anam.AvatarSession(
        persona_config=anam.PersonaConfig(name="Leo", avatarId=avatar_id),
        api_key=anam_api_key,
    )

    # --- Full-Mistral voice pipeline ---
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=mistralai.STT(model="voxtral-mini-latest"),
        llm=mistralai.LLM(model="mistral-large-latest"),
        tts=mistralai.TTS(
            model="voxtral-mini-tts-2603",
            voice="gb_oliver_confident",
        ),
    )

    # Start the avatar — redirects TTS audio to Anam for lip-synced video
    await anam_avatar.start(session, room=ctx.room)

    # Start the agent
    await session.start(
        agent=Agent(instructions=SYSTEM_PROMPT),
        room=ctx.room,
    )

    # Greet the user
    session.generate_reply(instructions="Greet the user warmly and briefly introduce yourself.")


if __name__ == "__main__":
    cli.run_app(server)
