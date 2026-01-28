from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    database_path: str = "data/diane.db"
    # aceita OPENAI_API_KEY no .env mas não usa (evita "Extra inputs" se só tiver essa chave)
    openai_api_key: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()


def get_db_path() -> Path:
    p = Path(settings.database_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p
