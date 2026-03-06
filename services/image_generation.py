import os
import time

import requests


class ImageGenerationError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def _hf_token() -> str:
    # Support the new token name with fallback for existing setups.
    return (os.getenv("HF_API_TOKEN") or os.getenv("HF_API_KEY") or "").strip()


def _hf_model() -> str:
    return os.getenv("HF_IMAGE_MODEL", "black-forest-labs/FLUX.1-schnell").strip()


ASPECT_RATIO_DIMENSIONS = {
    "1:1": (1024, 1024),
    "4:5": (896, 1120),
    "3:2": (1152, 768),
    "16:9": (1344, 768),
    "9:16": (768, 1344),
}


def resolve_dimensions(aspect_ratio: str) -> tuple[int, int]:
    ratio = (aspect_ratio or "1:1").strip()
    return ASPECT_RATIO_DIMENSIONS.get(ratio, ASPECT_RATIO_DIMENSIONS["1:1"])


def compose_image_prompt(base_prompt: str, art_style: str = "None", custom_prompt: str = "") -> str:
    sections = [(base_prompt or "").strip()]
    style = (art_style or "None").strip()
    custom = (custom_prompt or "").strip()
    if style and style.lower() != "none":
        sections.append(f"Visual style: {style}.")
    if custom:
        sections.append(f"Additional direction: {custom}")
    combined = " ".join([part for part in sections if part])
    return combined.strip()


def generate_image(prompt: str, aspect_ratio: str = "1:1") -> bytes:
    token = _hf_token()
    if not token:
        raise ImageGenerationError("HF_API_TOKEN is not set.", 500)

    clean_prompt = (prompt or "").strip()
    if not clean_prompt:
        raise ImageGenerationError("Prompt is required for image generation.", 400)

    api_url = f"https://router.huggingface.co/hf-inference/models/{_hf_model()}"
    headers = {"Authorization": f"Bearer {token}"}
    width, height = resolve_dimensions(aspect_ratio)

    max_attempts = 2
    for attempt in range(1, max_attempts + 1):
        try:
            response = requests.post(
                api_url,
                headers=headers,
                json={
                    "inputs": clean_prompt,
                    "parameters": {
                        "width": width,
                        "height": height,
                    },
                },
                timeout=120,
            )
        except requests.Timeout as exc:
            raise ImageGenerationError("Image generation timed out.", 504) from exc
        except requests.RequestException as exc:
            raise ImageGenerationError(f"Image generation failed: {exc}", 502) from exc

        if response.status_code == 429:
            raise ImageGenerationError("Image generation rate-limited. Retry shortly.", 429)

        if response.status_code == 503:
            # HF model cold start: wait once and retry.
            eta = None
            try:
                payload = response.json()
                eta = payload.get("estimated_time")
            except ValueError:
                payload = {}

            if attempt < max_attempts:
                wait_seconds = 2.0
                if isinstance(eta, (int, float)):
                    wait_seconds = max(1.0, min(float(eta), 20.0))
                time.sleep(wait_seconds)
                continue

            detail = "Image model is loading (cold start). Please retry shortly."
            if isinstance(eta, (int, float)):
                detail = f"{detail} Estimated wait: {eta} seconds."
            raise ImageGenerationError(detail, 503)

        if response.status_code >= 400:
            detail = response.text[:500] if response.text else "Unknown image generation error."
            raise ImageGenerationError(
                f"Image generation request failed ({response.status_code}): {detail}",
                502,
            )

        content_type = (response.headers.get("content-type") or "").lower()
        if "application/json" in content_type:
            try:
                payload = response.json()
            except ValueError:
                payload = None
            if isinstance(payload, dict):
                error_message = (
                    payload.get("error")
                    or payload.get("message")
                    or "Image generation returned JSON instead of image bytes."
                )
                raise ImageGenerationError(str(error_message), 502)

        if not response.content:
            raise ImageGenerationError("Image generation returned empty data.", 502)

        return response.content

    raise ImageGenerationError("Image generation failed unexpectedly.", 502)
