import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"


def load_environment() -> None:
    candidate_files = [
        BASE_DIR / ".env",
        BASE_DIR.parent / ".env",
    ]
    for env_file in candidate_files:
        if env_file.exists():
            load_dotenv(dotenv_path=env_file, override=False)


load_environment()

DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
HF_BLIP_MODEL = "Salesforce/blip2-opt-2.7b"
WINDOWS_INSTALLER_URL = os.getenv("WINDOWS_INSTALLER_URL", "").strip()


def get_windows_installer_url() -> str:
    # Reload to pick up env changes during local development sessions.
    load_environment()
    return os.getenv("WINDOWS_INSTALLER_URL", "").strip() or WINDOWS_INSTALLER_URL
