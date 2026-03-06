import base64
import os
from typing import Any

import uvicorn
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from services.config import STATIC_DIR
from services.config import get_windows_installer_url
from services.image_generation import compose_image_prompt
from services.image_generation import ImageGenerationError
from services.image_generation import generate_image
from services.schemas import GenerateImageRequest
from services.schemas import GenerateRequest
from services.text_generation import build_prompt
from services.text_generation import call_groq
from services.text_generation import clean_poetic_text
from services.text_generation import detect_image_mime
from services.text_generation import limit_paragraphs
from services.text_generation import limit_words


app = FastAPI(title="kAvI Web")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

STYLE_THUMBNAIL_STYLES = ["Illustration", "Photo", "Abstract", "3D", "Line-art", "Custom"]
STYLE_THUMBNAILS_CACHE: dict[str, str] | None = None


def _build_image_base_prompt(topic_text: str, custom_prompt: str, style_reference_names: list[str] | None = None) -> str:
    topic = (topic_text or "").strip()
    custom = (custom_prompt or "").strip()
    style_reference_names = style_reference_names or []
    style_reference_instruction = ""
    if style_reference_names:
        joined_names = ", ".join(name.strip() for name in style_reference_names if name.strip())
        if joined_names:
            style_reference_instruction = (
                f" Match the artistic language of the attached style reference images: {joined_names}."
            )
        else:
            style_reference_instruction = " Match the artistic language of the attached style reference images."

    if custom:
        if topic:
            return (
                f"{custom}. "
                f"Use this topic only as subtle secondary context: {topic}."
            ) + style_reference_instruction
        return f"{custom}{style_reference_instruction}"
    if topic:
        return f"{topic}{style_reference_instruction}"
    return f"A visually rich scene.{style_reference_instruction}"


def _generate_style_thumbnails() -> dict[str, str]:
    thumbnails: dict[str, str] = {}
    for style in STYLE_THUMBNAIL_STYLES:
        style_prompt = compose_image_prompt(
            base_prompt="A portrait scene with clear subject and cinematic lighting.",
            art_style=style,
            custom_prompt="thumbnail quality, clean composition",
        )
        image_bytes = generate_image(style_prompt, aspect_ratio="1:1")
        mime_type = detect_image_mime(image_bytes)
        thumbnails[style] = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
    return thumbnails


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/download/windows")
def download_windows_installer() -> RedirectResponse:
    installer_url = get_windows_installer_url()
    if not installer_url:
        raise HTTPException(
            status_code=404,
            detail="Windows installer is not configured yet.",
        )
    return RedirectResponse(url=installer_url, status_code=307)


@app.get("/image-style-thumbnails")
def image_style_thumbnails() -> dict[str, Any]:
    global STYLE_THUMBNAILS_CACHE
    if STYLE_THUMBNAILS_CACHE is not None:
        return {"thumbnails": STYLE_THUMBNAILS_CACHE}
    try:
        STYLE_THUMBNAILS_CACHE = _generate_style_thumbnails()
        return {"thumbnails": STYLE_THUMBNAILS_CACHE}
    except ImageGenerationError as exc:
        return {"thumbnails": {}, "error": str(exc)}


@app.post("/generate")
def generate_post(payload: GenerateRequest) -> dict[str, Any]:
    prompt = build_prompt(payload)
    text = call_groq(prompt)
    cleaned = clean_poetic_text(text)
    limited_paragraphs = limit_paragraphs(cleaned, 2)
    limited_words = limit_words(limited_paragraphs, 100)
    final_text = limit_paragraphs(limited_words, 2)

    response_payload: dict[str, Any] = {"poetic_response": final_text}
    if payload.include_generated_image:
        settings = payload.image_settings
        style_reference_names = [item.name for item in settings.custom_style_images if item.name]
        image_base_prompt = _build_image_base_prompt(
            payload.topic,
            settings.custom_prompt,
            style_reference_names,
        )
        generated_images: list[dict[str, str]] = []
        errors: list[str] = []
        for index in range(settings.image_count):
            variant_suffix = "" if settings.image_count <= 1 else f" Variation {index + 1}."
            image_prompt = compose_image_prompt(
                base_prompt=f"{image_base_prompt}{variant_suffix}",
                art_style=settings.art_style,
                custom_prompt="",
            )
            try:
                image_bytes = generate_image(image_prompt, aspect_ratio=settings.aspect_ratio)
                mime_type = detect_image_mime(image_bytes)
                generated_images.append(
                    {
                        "base64": base64.b64encode(image_bytes).decode("utf-8"),
                        "mime_type": mime_type,
                    }
                )
            except ImageGenerationError as exc:
                errors.append(str(exc))

        if generated_images:
            response_payload["generated_images"] = generated_images
            # Keep backward compatibility with existing frontend consumers.
            response_payload["generated_image_base64"] = generated_images[0]["base64"]
            response_payload["generated_image_mime_type"] = generated_images[0]["mime_type"]
        if errors:
            # Optional image generation must not break the primary text pipeline.
            response_payload["image_generation_error"] = errors[0]
            if len(errors) > 1:
                response_payload["image_generation_warning"] = f"{len(errors)} image generation attempts failed."

    return response_payload


@app.post("/generate-image")
def generate_image_endpoint(payload: GenerateImageRequest) -> Response:
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    settings = payload.image_settings
    style_reference_names = [item.name for item in settings.custom_style_images if item.name]
    image_base_prompt = _build_image_base_prompt(prompt, settings.custom_prompt, style_reference_names)
    image_prompt = compose_image_prompt(
        base_prompt=image_base_prompt,
        art_style=settings.art_style,
        custom_prompt="",
    )
    try:
        image_bytes = generate_image(image_prompt, aspect_ratio=settings.aspect_ratio)
    except ImageGenerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return Response(content=image_bytes, media_type=detect_image_mime(image_bytes))


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    reload_enabled = os.getenv("UVICORN_RELOAD", "0").lower() in {"1", "true", "yes"}
    uvicorn.run("app:app", host=host, port=port, reload=reload_enabled)
