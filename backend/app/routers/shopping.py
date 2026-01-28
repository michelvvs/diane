from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.repositories import (
    add_shopping_items,
    check_shopping_items_by_names,
    create_shopping_list,
    delete_shopping_item,
    delete_shopping_list,
    get_shopping_list,
    list_shopping_lists,
    set_active_shopping_list,
    toggle_shopping_item_checked,
    update_shopping_item,
    update_shopping_list,
)
from app.models import ShoppingList

router = APIRouter(prefix="/shopping-lists", tags=["shopping"])


class CreateListBody(BaseModel):
    name: str = "Nova lista"


class AddItemsBody(BaseModel):
    items: list[str]


class CheckItemsBody(BaseModel):
    item_names: list[str]


class UpdateListBody(BaseModel):
    name: str


class UpdateItemBody(BaseModel):
    name: str


@router.get("", response_model=list[ShoppingList])
async def list_route():
    async with get_db() as conn:
        return await list_shopping_lists(conn)


@router.post("", response_model=ShoppingList, status_code=201)
async def create_route(body: CreateListBody):
    async with get_db() as conn:
        return await create_shopping_list(conn, body.name or "Nova lista")


@router.get("/{list_id:int}", response_model=ShoppingList)
async def get_route(list_id: int):
    async with get_db() as conn:
        lst = await get_shopping_list(conn, list_id)
        if not lst:
            raise HTTPException(404, "Lista não encontrada")
        return lst


@router.post("/{list_id:int}/items")
async def add_items_route(list_id: int, body: AddItemsBody):
    async with get_db() as conn:
        lst = await get_shopping_list(conn, list_id)
        if not lst:
            raise HTTPException(404, "Lista não encontrada")
        names = [n.strip() for n in (body.items or []) if n and n.strip()]
        if not names:
            raise HTTPException(400, "Envie pelo menos um item")
        await add_shopping_items(conn, list_id, names)
        lst = await get_shopping_list(conn, list_id)
    return {"ok": True, "added": len(names), "list": lst}


@router.patch("/{list_id:int}/items/check")
async def check_items_route(list_id: int, body: CheckItemsBody):
    async with get_db() as conn:
        lst = await get_shopping_list(conn, list_id)
        if not lst:
            raise HTTPException(404, "Lista não encontrada")
        names = [n.strip() for n in (body.item_names or []) if n and n.strip()]
        count = await check_shopping_items_by_names(conn, list_id, names)
    return {"ok": True, "checked": count}


@router.patch("/{list_id:int}/items/{item_id:int}/toggle")
async def toggle_item_route(list_id: int, item_id: int):
    async with get_db() as conn:
        try:
            checked = await toggle_shopping_item_checked(conn, list_id, item_id)
            return {"ok": True, "checked": checked}
        except ValueError as e:
            raise HTTPException(404, str(e))


@router.post("/{list_id:int}/activate")
async def activate_route(list_id: int):
    async with get_db() as conn:
        lst = await get_shopping_list(conn, list_id)
        if not lst:
            raise HTTPException(404, "Lista não encontrada")
        await set_active_shopping_list(conn, list_id)
    return {"ok": True}


@router.patch("/{list_id:int}")
async def update_list_route(list_id: int, body: UpdateListBody):
    async with get_db() as conn:
        try:
            await update_shopping_list(conn, list_id, body.name or "")
        except ValueError as e:
            raise HTTPException(404, str(e))
    return {"ok": True}


@router.delete("/{list_id:int}", status_code=204)
async def delete_list_route(list_id: int):
    async with get_db() as conn:
        try:
            await delete_shopping_list(conn, list_id)
        except ValueError as e:
            raise HTTPException(404, str(e))


@router.patch("/{list_id:int}/items/{item_id:int}")
async def update_item_route(list_id: int, item_id: int, body: UpdateItemBody):
    async with get_db() as conn:
        try:
            await update_shopping_item(conn, list_id, item_id, body.name or "")
        except ValueError as e:
            raise HTTPException(400, str(e))
    return {"ok": True}


@router.delete("/{list_id:int}/items/{item_id:int}", status_code=204)
async def delete_item_route(list_id: int, item_id: int):
    async with get_db() as conn:
        try:
            await delete_shopping_item(conn, list_id, item_id)
        except ValueError as e:
            raise HTTPException(404, str(e))
