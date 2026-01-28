from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.repositories import (
    delete_product_price,
    insert_product_price,
    list_product_prices_grouped,
    update_product_price,
)

router = APIRouter(prefix="/product-prices", tags=["product-prices"])


class CreateProductPriceBody(BaseModel):
    product_name: str
    market_name: str
    price: float


class UpdateProductPriceBody(BaseModel):
    product_name: Optional[str] = None
    price: Optional[float] = None


@router.get("")
async def list_route():
    """Lista preços agrupados por estabelecimento. Um item por (produto, mercado) mais recente."""
    async with get_db() as conn:
        return await list_product_prices_grouped(conn)


@router.post("", status_code=201)
async def create_route(body: CreateProductPriceBody):
    async with get_db() as conn:
        try:
            await insert_product_price(
                conn,
                body.product_name or "",
                body.market_name or "",
                body.price,
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    return {"ok": True}


@router.patch("/{row_id:int}")
async def update_route(row_id: int, body: UpdateProductPriceBody):
    async with get_db() as conn:
        try:
            await update_product_price(
                conn,
                row_id,
                product_name=body.product_name,
                price=body.price,
            )
        except ValueError as e:
            raise HTTPException(400, str(e))
    return {"ok": True}


@router.delete("/{row_id:int}", status_code=204)
async def delete_route(row_id: int):
    async with get_db() as conn:
        try:
            await delete_product_price(conn, row_id)
        except ValueError as e:
            raise HTTPException(404, str(e))
