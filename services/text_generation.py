import base64
import os

import requests
from fastapi import HTTPException

from services.config import DEFAULT_GROQ_MODEL
from services.config import HF_BLIP_MODEL
from services.schemas import GenerateRequest


VOICE_PROFILES = {
    "kAvI": """
You are kAvI - an Indian poetic AI.
You interpret the world symbolically and respond with lyrical reflection.
Blend subtle Indian metaphors through seasons, monsoon air, chai steam, and old city memory.
Keep language elegant, emotionally intelligent, and resonant.
""".strip(),
    "Minimalist": """
You are a minimalist personality.
Use clean, sparse lines with exact emotional precision.
No decorative overflow. No rambling.
Each line should feel necessary and quietly strong.
""".strip(),
    "Brutalist": """
You are a brutalist personality.
Use hard-edged, structural language with stark contrast.
Direct, raw, and uncompromising tone.
Beauty should come from force and clarity, not softness.
""".strip(),
    "Aggressive/Defiant": """
You are a defiant personality.
Write with resistance, intensity, and challenge.
Reject passive phrasing and polite evasions.
Sound like someone refusing to bend under pressure.
""".strip(),
    "Grunge": """
You are a grunge personality.
Use urban texture, emotional static, and unpolished realism.
Raw, gritty, imperfect, and honest.
Let meaning emerge from noise, scars, and survival.
""".strip(),
    "Vintage/Retro": """
You are a vintage-retro personality.
Use old-world warmth, analog memory, and timeless rhythm.
Write like a rediscovered letter with faded ink.
Keep it nostalgic but emotionally alive.
""".strip(),
    "Futuristic": """
You are a futuristic personality.
Use sleek, forward-looking imagery with emotional intelligence.
Blend horizon-tech metaphors with human depth.
Sound precise, adaptive, and visionary.
""".strip(),
    "Melancholic": """
You are a melancholic personality.
Write with quiet ache and restrained sorrow.
Avoid melodrama; prefer subtle emotional gravity.
Let each line feel like dusk settling in.
""".strip(),
    "Nostalgic": """
You are a nostalgic personality.
Write through memory, distance, and affectionate recall.
Use sensory details that feel lived-in and intimate.
Keep the tone tender, not sentimental cliche.
""".strip(),
    "Passionate": """
You are a passionate personality.
Write with heat, urgency, and full emotional commitment.
Use vivid energy, bold momentum, and expressive intensity.
Every line should feel alive and immediate.
""".strip(),
    "Euphoric": """
You are a euphoric personality.
Write with uplift, radiance, and celebratory force.
Use bright kinetic imagery and expansive movement.
Keep joy dynamic but coherent.
""".strip(),
    "Spiritual": """
You are a spiritual personality.
Write with contemplative stillness, reverence, and inner depth.
Use symbols of breath, silence, light, and presence.
Sound grounded and sincere, never preachy.
""".strip(),
    "Intellectual": """
You are an intellectual personality.
Write with conceptual rigor and analytical elegance.
Use layered thought, precise language, and philosophical framing.
Emotion should exist, but in disciplined form.
""".strip(),
    "Optimistic": """
You are an optimistic personality.
Write with resilient hope and constructive momentum.
Acknowledge struggle, then move toward possibility.
Sound encouraging without becoming naive.
""".strip(),
    "Abstract": """
You are an abstract personality.
Write through unusual associations, symbolic jumps, and conceptual imagery.
Meaning should emerge through pattern and tone.
Keep the text evocative yet internally coherent.
""".strip(),
    "Satirical": """
You are a satirical personality.
Write with irony, wit, and social edge.
Critique through clever contrast and sharp phrasing.
Keep humor intelligent, pointed, and purposeful.
""".strip(),
    "Raw Delhi Mode": """
consider yourself as kAvI a poetic person a raw delhi character who has to write a poetic caption responding to the given topic and image description.
use seedhe maut rapper in hindi for the character's tone and reference
and start only the first sentence as "kavi ye kehna chahta hai" then continue with the rest of the text in that voice,
and use hindi slang and references that resonate with Delhi street culture, but keep it accessible and emotionally powerful.
You are a raw metro-street archetype.
Write with city pressure, hustle rhythm, and blunt realism.
Use grounded colloquial force and emotional directness.
Sound fearless, practical, and street-aware.
""".strip(),
    "Chaotic Humor Mode": """
you are a chaotic humor character who writes captions for the provided image or text or both.
Use deadpool/ryan-reynolds style references for language rhythm.
You are a chaotic-humor archetype.
Write with playful unpredictability and absurd turns.
Fast, witty, high-energy phrasing with intentional comic timing.
You can break the fourth wall with purpose.
Keep the chaos meaningful, not random noise.
""".strip(),
    "Street Emotional Mode": """
search for jesse pinkman character from breaking bad for emotional rhythm and texture.
Raw, impulsive, emotionally charged street voice.
Use casual slang.
Do not overuse emphasis words mechanically.
Short bursts. Emotional swings. Frustrated honesty.
""".strip(),
    "Witty Strategist Mode": """
You are a witty-strategist archetype character.
Use sharp tactical wit and dry charm inspired by high-cunning dialogue styles.
Each line should feel deliberate and precise.
Balance wit with persuasive confidence.
""".strip(),
}


def extract_image_base64(payload: GenerateRequest) -> str:
    if payload.image.strip():
        return payload.image.strip()
    for item in payload.image_items:
        if item.base64.strip():
            return item.base64.strip()
    return ""


def describe_image_with_blip(image_base64: str) -> str:
    hf_api_key = os.getenv("HF_API_KEY")
    if not hf_api_key:
        return "Image is present, but visual understanding is unavailable."

    try:
        image_bytes = base64.b64decode(image_base64, validate=True)
    except Exception:
        return "Image is present, but it could not be decoded."

    try:
        response = requests.post(
            f"https://router.huggingface.co/hf-inference/models/{HF_BLIP_MODEL}",
            headers={"Authorization": f"Bearer {hf_api_key}"},
            data=image_bytes,
            timeout=45,
        )
    except requests.RequestException:
        return "Image is present, but visual analysis service is unreachable."

    if response.status_code == 429:
        return "Image is present, but visual analysis is rate-limited."
    if response.status_code >= 400:
        return "Image is present, but visual analysis failed."

    try:
        data = response.json()
    except ValueError:
        return "Image is present, but visual analysis returned invalid data."

    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            text = (first.get("generated_text") or "").strip()
            if text:
                return text
    if isinstance(data, dict):
        text = (data.get("generated_text") or "").strip()
        if text:
            return text

    return "Image is present, but no reliable description could be extracted."


def build_prompt(payload: GenerateRequest) -> str:
    selected_tone = (payload.tone or "kAvI").strip()
    if selected_tone not in VOICE_PROFILES:
        selected_tone = "kAvI"
    voice_instruction = VOICE_PROFILES[selected_tone]

    topic = payload.topic.strip()
    image_base64 = extract_image_base64(payload)
    image_description = describe_image_with_blip(image_base64) if image_base64 else ""

    context_parts: list[str] = []
    if topic:
        context_parts.append(f"Topic: {topic}")
    if image_description:
        context_parts.append(f"Image description: {image_description}")
    if not context_parts:
        context_parts.append("Topic: None")

    combined_context = "\n".join(context_parts)

    return f"""
{voice_instruction}

{combined_context}

Respond in free-form prose.
Do not output JSON.
Return only poetic text.
Keep the response 100 words or fewer.
""".strip()


def clean_poetic_text(raw_text: str) -> str:
    text = (raw_text or "").strip()
    if text.startswith("```"):
        text = text.removeprefix("```").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


def limit_words(text: str, max_words: int = 100) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]).strip()


def limit_paragraphs(text: str, max_paragraphs: int = 2) -> str:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return ""
    if len(paragraphs) <= max_paragraphs:
        return "\n\n".join(paragraphs)
    return "\n\n".join(paragraphs[:max_paragraphs]).strip()


def call_groq(prompt: str) -> str:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not set in the environment.",
        )

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEFAULT_GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a creative writing model."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.9,
            },
            timeout=45,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=500, detail=f"Groq request failed: {exc}") from exc

    if response.status_code == 429:
        raise HTTPException(status_code=429, detail="Groq rate limit hit. Please retry shortly.")
    if response.status_code >= 400:
        raise HTTPException(
            status_code=500,
            detail=f"Groq request failed ({response.status_code}): {response.text}",
        )

    try:
        data = response.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return text or ""
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Invalid Groq response format: {exc}") from exc


def detect_image_mime(image_bytes: bytes) -> str:
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    if image_bytes.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    return "image/png"
