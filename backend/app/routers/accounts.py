from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.repositories import (
    create_account,
    delete_account,
    list_accounts_with_stats,
    update_account,
)
from app.models import Account, AccountWithStats

router = APIRouter(prefix="/accounts", tags=["accounts"])


class AccountCreateBody(BaseModel):
    name: str
    balance: float = 0.0


class AccountUpdateBody(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None


@router.get("", response_model=list[AccountWithStats])
async def list_accounts_route():
    async with get_db() as conn:
        return await list_accounts_with_stats(conn)


@router.post("", response_model=Account, status_code=201)
async def create_account_route(body: AccountCreateBody):
    async with get_db() as conn:
        try:
            return await create_account(conn, body.name, body.balance)
        except ValueError as e:
            raise HTTPException(400, str(e))


@router.patch("/{account_id:int}", response_model=Account)
async def update_account_route(account_id: int, body: AccountUpdateBody):
    async with get_db() as conn:
        cur = await conn.execute("SELECT id FROM accounts WHERE id = ?", (account_id,))
        if not await cur.fetchone():
            raise HTTPException(404, "Conta não encontrada")
        try:
            return await update_account(
                conn, account_id, name=body.name, balance=body.balance
            )
        except ValueError as e:
            raise HTTPException(400, str(e))


@router.delete("/{account_id:int}", status_code=204)
async def delete_account_route(account_id: int):
    async with get_db() as conn:
        cur = await conn.execute("SELECT id FROM accounts WHERE id = ?", (account_id,))
        if not await cur.fetchone():
            raise HTTPException(404, "Conta não encontrada")
        try:
            await delete_account(conn, account_id)
        except ValueError as e:
            raise HTTPException(400, str(e))
