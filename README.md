# kAvI Web

Pure Python web version of kAvI using FastAPI.

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create `.env` from `.env.example` and set API keys:

- `GROQ_API_KEY`
- `HF_API_KEY`
- `WINDOWS_INSTALLER_URL` (public URL of your desktop installer `.exe`)

## Run

```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Open:

`http://127.0.0.1:8000`
