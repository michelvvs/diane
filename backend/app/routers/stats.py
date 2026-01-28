from datetime import date

from fastapi import APIRouter, Query

from app.database import get_db
from app.repositories import get_monthly_spending
from app.models import MonthlySpending, CategoryTotal

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/monthly", response_model=MonthlySpending)
async def monthly_spending_route(
    year: int = Query(None),
    month: int = Query(None),
):
    today = date.today()
    y = year if year is not None else today.year
    m = month if month is not None else today.month
    async with get_db() as conn:
        total, by_cat = await get_monthly_spending(conn, y, m)
    return MonthlySpending(year=y, month=m, total=total, by_category=by_cat)
