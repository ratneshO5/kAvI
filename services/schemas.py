from pydantic import BaseModel
from pydantic import Field


class ImageItem(BaseModel):
    base64: str
    mime_type: str = "image/png"
    name: str = "image"


class ImageGenerationSettings(BaseModel):
    aspect_ratio: str = "1:1"
    image_count: int = Field(default=1, ge=1, le=4)
    art_style: str = "None"
    custom_prompt: str = ""
    custom_style_images: list[ImageItem] = []


class GenerateRequest(BaseModel):
    topic: str = ""
    tone: str = "kAvI"
    image: str = ""
    image_items: list[ImageItem] = []
    include_generated_image: bool = True
    image_settings: ImageGenerationSettings = Field(default_factory=ImageGenerationSettings)


class GenerateImageRequest(BaseModel):
    prompt: str
    image_settings: ImageGenerationSettings = Field(default_factory=ImageGenerationSettings)
