from typing import Optional

from fastapi import APIRouter, Query

from app.database import get_db
from app.repositories import list_prompt_logs
from app.models import PromptLog

router = APIRouter(prefix="/prompt-logs", tags=["prompt-logs"])


@router.get("", response_model=list[PromptLog])
async def list_route(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    kind: Optional[str] = Query(None),
):
    async with get_db() as conn:
        return await list_prompt_logs(conn, limit=limit, offset=offset, kind=kind)
