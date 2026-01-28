from typing import Optional

from fastapi import APIRouter, Query

from app.database import get_db
from app.repositories import get_transactions
from app.models import Transaction

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[Transaction])
async def list_transactions_route(
    limit: int = Query(100, ge=1, le=500),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
):
    async with get_db() as conn:
        return await get_transactions(conn, limit=limit, year=year, month=month)
