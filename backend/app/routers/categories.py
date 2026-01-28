from fastapi import APIRouter

from app.database import get_db
from app.repositories import list_categories
from app.models import Category

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[Category])
async def list_categories_route():
    async with get_db() as conn:
        return await list_categories(conn)
