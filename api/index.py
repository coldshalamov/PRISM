"""Vercel ASGI entry point; all secrets remain in server environment variables."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.serverless_demo import app
