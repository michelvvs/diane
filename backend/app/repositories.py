from typing import Optional

import aiosqlite

from app.models import (
    Account,
    AccountWithStats,
    Category,
    CategoryTotal,
    PromptLog,
    ShoppingList,
    ShoppingListItem,
    Transaction,
)


async def get_or_create_category(conn: aiosqlite.Connection, name: str) -> int:
    name = name.strip()
    cur = await conn.execute(
        "SELECT id FROM categories WHERE name = ?", (name,)
    )
    row = await cur.fetchone()
    if row:
        return row[0]
    await conn.execute(
        "INSERT INTO categories (name) VALUES (?)", (name,)
    )
    await conn.commit()
    cur = await conn.execute("SELECT last_insert_rowid()")
    row = await cur.fetchone()
    return row[0]


async def get_or_create_account(conn: aiosqlite.Connection, name: str) -> Optional[int]:
    if not name or not name.strip():
        return None
    name = name.strip()
    cur = await conn.execute(
        "SELECT id FROM accounts WHERE name = ?", (name,)
    )
    row = await cur.fetchone()
    if row:
        return row[0]
    await conn.execute(
        "INSERT INTO accounts (name, balance) VALUES (?, 0)", (name,)
    )
    await conn.commit()
    cur = await conn.execute("SELECT last_insert_rowid()")
    row = await cur.fetchone()
    return row[0]


async def create_account(conn: aiosqlite.Connection, name: str, balance: float = 0) -> Account:
    name = name.strip()
    cur = await conn.execute("SELECT id FROM accounts WHERE name = ?", (name,))
    if await cur.fetchone():
        raise ValueError("Conta já existe")
    await conn.execute(
        "INSERT INTO accounts (name, balance) VALUES (?, ?)", (name, balance)
    )
    await conn.commit()
    cur = await conn.execute("SELECT last_insert_rowid()")
    row = await cur.fetchone()
    aid = row[0]
    cur = await conn.execute(
        "SELECT id, name, balance, created_at FROM accounts WHERE id = ?", (aid,)
    )
    r = (await cur.fetchone())
    return Account(id=r[0], name=r[1], balance=r[2], created_at=r[3])


async def list_accounts(conn: aiosqlite.Connection) -> list[Account]:
    cur = await conn.execute(
        "SELECT id, name, balance, created_at FROM accounts ORDER BY name"
    )
    rows = await cur.fetchall()
    return [
        Account(id=r[0], name=r[1], balance=r[2], created_at=r[3])
        for r in rows
    ]


async def get_spending_by_account(conn: aiosqlite.Connection) -> dict[int, float]:
    """Gastos totais por account_id (soma dos amount das transações)."""
    cur = await conn.execute(
        """SELECT account_id, COALESCE(SUM(amount), 0) FROM transactions
           WHERE account_id IS NOT NULL GROUP BY account_id"""
    )
    rows = await cur.fetchall()
    return {r[0]: r[1] for r in rows}


async def list_accounts_with_stats(conn: aiosqlite.Connection) -> list[AccountWithStats]:
    accounts = await list_accounts(conn)
    spending = await get_spending_by_account(conn)
    out: list[AccountWithStats] = []
    for a in accounts:
        s = spending.get(a.id, 0.0)
        ef = a.balance - s
        out.append(
            AccountWithStats(
                id=a.id,
                name=a.name,
                balance=a.balance,
                created_at=a.created_at,
                spending=s,
                effective_balance=ef,
            )
        )
    return out


async def update_account(
    conn: aiosqlite.Connection,
    account_id: int,
    *,
    name: Optional[str] = None,
    balance: Optional[float] = None,
) -> Account:
    if name is not None:
        n = name.strip()
        cur = await conn.execute(
            "SELECT id FROM accounts WHERE name = ? AND id != ?", (n, account_id)
        )
        if await cur.fetchone():
            raise ValueError("Já existe outra conta com esse nome.")
    updates: list[str] = []
    params: list = []
    if name is not None:
        updates.append("name = ?")
        params.append(name.strip())
    if balance is not None:
        updates.append("balance = ?")
        params.append(balance)
    if not updates:
        cur = await conn.execute(
            "SELECT id, name, balance, created_at FROM accounts WHERE id = ?", (account_id,)
        )
        r = (await cur.fetchone())
        return Account(id=r[0], name=r[1], balance=r[2], created_at=r[3])
    params.append(account_id)
    await conn.execute(
        f"UPDATE accounts SET {', '.join(updates)} WHERE id = ?", params
    )
    await conn.commit()
    cur = await conn.execute(
        "SELECT id, name, balance, created_at FROM accounts WHERE id = ?", (account_id,)
    )
    r = (await cur.fetchone())
    return Account(id=r[0], name=r[1], balance=r[2], created_at=r[3])


async def delete_account(conn: aiosqlite.Connection, account_id: int) -> None:
    cur = await conn.execute(
        "SELECT 1 FROM transactions WHERE account_id = ? LIMIT 1", (account_id,)
    )
    if await cur.fetchone():
        raise ValueError("Não é possível excluir conta com transações vinculadas.")
    await conn.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    await conn.commit()


async def list_categories(conn: aiosqlite.Connection) -> list[Category]:
    cur = await conn.execute(
        "SELECT id, name, created_at FROM categories ORDER BY name"
    )
    rows = await cur.fetchall()
    return [
        Category(id=r[0], name=r[1], created_at=r[2])
        for r in rows
    ]


async def create_transaction(
    conn: aiosqlite.Connection,
    amount: float,
    description: str,
    category_id: int,
    account_id: Optional[int],
    tx_date: str,
) -> Transaction:
    await conn.execute(
        """INSERT INTO transactions (amount, description, category_id, account_id, tx_date)
           VALUES (?, ?, ?, ?, ?)""",
        (amount, description, category_id, account_id, tx_date),
    )
    await conn.commit()
    cur = await conn.execute("SELECT last_insert_rowid()")
    row = await cur.fetchone()
    tid = row[0]
    cur = await conn.execute(
        """SELECT t.id, t.amount, t.description, t.category_id, c.name,
                  t.account_id, a.name, t.tx_date, t.created_at
           FROM transactions t
           JOIN categories c ON c.id = t.category_id
           LEFT JOIN accounts a ON a.id = t.account_id
           WHERE t.id = ?""",
        (tid,),
    )
    r = (await cur.fetchone())
    return Transaction(
        id=r[0],
        amount=r[1],
        description=r[2],
        category_id=r[3],
        category_name=r[4],
        account_id=r[5],
        account_name=r[6],
        tx_date=r[7],
        created_at=r[8],
    )


async def get_monthly_spending(
    conn: aiosqlite.Connection, year: int, month: int
) -> tuple[float, list[CategoryTotal]]:
    start = f"{year:04d}-{month:02d}-01"
    if month == 12:
        end = f"{year + 1:04d}-01-01"
    else:
        end = f"{year:04d}-{month + 1:02d}-01"
    cur = await conn.execute(
        """SELECT c.name, SUM(t.amount) as total
           FROM transactions t
           JOIN categories c ON c.id = t.category_id
           WHERE t.tx_date >= ? AND t.tx_date < ?
           GROUP BY c.id, c.name""",
        (start, end),
    )
    rows = await cur.fetchall()
    by_cat = [CategoryTotal(category_name=r[0], total=r[1]) for r in rows]
    total = sum(c.total for c in by_cat)
    return total, by_cat


async def get_transactions(
    conn: aiosqlite.Connection,
    limit: int = 100,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> list[Transaction]:
    q = """SELECT t.id, t.amount, t.description, t.category_id, c.name,
                   t.account_id, a.name, t.tx_date, t.created_at
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            LEFT JOIN accounts a ON a.id = t.account_id
            WHERE 1=1"""
    params: list = []
    if year is not None and month is not None:
        start = f"{year:04d}-{month:02d}-01"
        if month == 12:
            end = f"{year + 1:04d}-01-01"
        else:
            end = f"{year:04d}-{month + 1:02d}-01"
        q += " AND t.tx_date >= ? AND t.tx_date < ?"
        params.extend([start, end])
    q += " ORDER BY t.tx_date DESC, t.id DESC LIMIT ?"
    params.append(limit)
    cur = await conn.execute(q, params)
    rows = await cur.fetchall()
    return [
        Transaction(
            id=r[0],
            amount=r[1],
            description=r[2],
            category_id=r[3],
            category_name=r[4],
            account_id=r[5],
            account_name=r[6],
            tx_date=r[7],
            created_at=r[8],
        )
        for r in rows
    ]


async def append_chat_message(conn: aiosqlite.Connection, role: str, content: str) -> None:
    await conn.execute(
        "INSERT INTO chat_messages (role, content) VALUES (?, ?)",
        (role, content),
    )
    await conn.commit()


async def get_recent_chat(conn: aiosqlite.Connection, limit: int = 20) -> list[tuple[str, str]]:
    cur = await conn.execute(
        "SELECT role, content FROM chat_messages ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    rows = await cur.fetchall()
    return [(r[0], r[1]) for r in reversed(rows)]


async def insert_prompt_log(
    conn: aiosqlite.Connection,
    kind: str,
    prompt_text: str,
    response_text: str,
    model: str,
) -> None:
    await conn.execute(
        "INSERT INTO prompt_logs (kind, prompt_text, response_text, model) VALUES (?, ?, ?, ?)",
        (kind, prompt_text, response_text, model),
    )
    await conn.commit()


async def list_prompt_logs(
    conn: aiosqlite.Connection,
    limit: int = 100,
    offset: int = 0,
    kind: Optional[str] = None,
) -> list[PromptLog]:
    q = "SELECT id, kind, prompt_text, response_text, model, created_at FROM prompt_logs WHERE 1=1"
    params: list = []
    if kind:
        q += " AND kind = ?"
        params.append(kind)
    q += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    cur = await conn.execute(q, params)
    rows = await cur.fetchall()
    return [
        PromptLog(
            id=r[0],
            kind=r[1],
            prompt_text=r[2],
            response_text=r[3],
            model=r[4],
            created_at=r[5],
        )
        for r in rows
    ]


def _row_to_item(r) -> ShoppingListItem:
    return ShoppingListItem(
        id=r[0],
        list_id=r[1],
        name=r[2],
        checked=bool(r[3]),
        created_at=r[4],
    )


async def _touch_list(conn: aiosqlite.Connection, list_id: int) -> None:
    await conn.execute(
        "UPDATE shopping_lists SET updated_at = datetime('now') WHERE id = ?",
        (list_id,),
    )
    await conn.commit()


async def create_shopping_list(conn: aiosqlite.Connection, name: str) -> ShoppingList:
    name = (name or "Nova lista").strip() or "Nova lista"
    await conn.execute("UPDATE shopping_lists SET active = 0")
    await conn.execute(
        "INSERT INTO shopping_lists (name, active) VALUES (?, 1)", (name,)
    )
    await conn.commit()
    cur = await conn.execute("SELECT last_insert_rowid()")
    row = await cur.fetchone()
    lid = row[0]
    cur = await conn.execute(
        "SELECT id, name, active, created_at, updated_at FROM shopping_lists WHERE id = ?",
        (lid,),
    )
    r = (await cur.fetchone())
    return ShoppingList(
        id=r[0],
        name=r[1],
        active=bool(r[2]),
        created_at=r[3],
        updated_at=r[4],
        items=[],
    )


async def get_active_shopping_list(conn: aiosqlite.Connection) -> Optional[ShoppingList]:
    cur = await conn.execute(
        "SELECT id, name, active, created_at, updated_at FROM shopping_lists WHERE active = 1 LIMIT 1"
    )
    row = await cur.fetchone()
    if not row:
        return None
    cur = await conn.execute(
        "SELECT id, list_id, name, checked, created_at FROM shopping_list_items WHERE list_id = ? ORDER BY id",
        (row[0],),
    )
    items = [_row_to_item(r) for r in (await cur.fetchall())]
    return ShoppingList(
        id=row[0],
        name=row[1],
        active=bool(row[2]),
        created_at=row[3],
        updated_at=row[4],
        items=items,
    )


async def set_active_shopping_list(conn: aiosqlite.Connection, list_id: int) -> None:
    await conn.execute("UPDATE shopping_lists SET active = 0")
    await conn.execute("UPDATE shopping_lists SET active = 1 WHERE id = ?", (list_id,))
    await conn.commit()


async def add_shopping_items(
    conn: aiosqlite.Connection, list_id: int, item_names: list[str]
) -> None:
    for n in item_names:
        n = (n or "").strip()
        if not n:
            continue
        await conn.execute(
            "INSERT INTO shopping_list_items (list_id, name) VALUES (?, ?)",
            (list_id, n),
        )
    await conn.commit()
    await _touch_list(conn, list_id)


async def check_shopping_items_by_names(
    conn: aiosqlite.Connection, list_id: int, names: list[str]
) -> int:
    normalized = [(n.strip().lower(), n.strip()) for n in names if (n or "").strip()]
    if not normalized:
        return 0
    cur = await conn.execute(
        "SELECT id, LOWER(name) FROM shopping_list_items WHERE list_id = ? AND checked = 0",
        (list_id,),
    )
    rows = await cur.fetchall()
    by_lower: dict[str, int] = {r[1]: r[0] for r in rows}
    updated: set[int] = set()
    for low, _ in normalized:
        if low in by_lower:
            iid = by_lower[low]
            if iid not in updated:
                updated.add(iid)
                await conn.execute(
                    "UPDATE shopping_list_items SET checked = 1 WHERE id = ?",
                    (iid,),
                )
    await conn.commit()
    await _touch_list(conn, list_id)
    return len(updated)


async def list_shopping_lists(conn: aiosqlite.Connection) -> list[ShoppingList]:
    cur = await conn.execute(
        "SELECT id, name, active, created_at, updated_at FROM shopping_lists ORDER BY updated_at DESC, id DESC"
    )
    rows = await cur.fetchall()
    out = []
    for r in rows:
        cur2 = await conn.execute(
            "SELECT id, list_id, name, checked, created_at FROM shopping_list_items WHERE list_id = ? ORDER BY id",
            (r[0],),
        )
        items = [_row_to_item(i) for i in (await cur2.fetchall())]
        out.append(
            ShoppingList(
                id=r[0],
                name=r[1],
                active=bool(r[2]),
                created_at=r[3],
                updated_at=r[4],
                items=items,
            )
        )
    return out


async def get_shopping_list(conn: aiosqlite.Connection, list_id: int) -> Optional[ShoppingList]:
    cur = await conn.execute(
        "SELECT id, name, active, created_at, updated_at FROM shopping_lists WHERE id = ?",
        (list_id,),
    )
    row = await cur.fetchone()
    if not row:
        return None
    cur = await conn.execute(
        "SELECT id, list_id, name, checked, created_at FROM shopping_list_items WHERE list_id = ? ORDER BY id",
        (list_id,),
    )
    items = [_row_to_item(i) for i in (await cur.fetchall())]
    return ShoppingList(
        id=row[0],
        name=row[1],
        active=bool(row[2]),
        created_at=row[3],
        updated_at=row[4],
        items=items,
    )


async def toggle_shopping_item_checked(
    conn: aiosqlite.Connection, list_id: int, item_id: int
) -> bool:
    cur = await conn.execute(
        "SELECT checked FROM shopping_list_items WHERE id = ? AND list_id = ?",
        (item_id, list_id),
    )
    row = await cur.fetchone()
    if not row:
        raise ValueError("Item não encontrado")
    new_val = 0 if row[0] else 1
    await conn.execute(
        "UPDATE shopping_list_items SET checked = ? WHERE id = ?", (new_val, item_id)
    )
    await conn.commit()
    await _touch_list(conn, list_id)
    return bool(new_val)


async def update_shopping_list(
    conn: aiosqlite.Connection, list_id: int, name: str
) -> None:
    name = (name or "").strip() or "Nova lista"
    cur = await conn.execute(
        "SELECT id FROM shopping_lists WHERE id = ?", (list_id,)
    )
    if not await cur.fetchone():
        raise ValueError("Lista não encontrada")
    await conn.execute("UPDATE shopping_lists SET name = ?, updated_at = datetime('now') WHERE id = ?", (name, list_id))
    await conn.commit()


async def delete_shopping_list(conn: aiosqlite.Connection, list_id: int) -> None:
    cur = await conn.execute("SELECT id FROM shopping_lists WHERE id = ?", (list_id,))
    if not await cur.fetchone():
        raise ValueError("Lista não encontrada")
    await conn.execute("DELETE FROM shopping_list_items WHERE list_id = ?", (list_id,))
    await conn.execute("DELETE FROM shopping_lists WHERE id = ?", (list_id,))
    await conn.commit()


async def update_shopping_item(
    conn: aiosqlite.Connection, list_id: int, item_id: int, name: str
) -> None:
    name = (name or "").strip()
    if not name:
        raise ValueError("Nome do item não pode ser vazio")
    cur = await conn.execute(
        "SELECT id FROM shopping_list_items WHERE id = ? AND list_id = ?",
        (item_id, list_id),
    )
    if not await cur.fetchone():
        raise ValueError("Item não encontrado")
    await conn.execute(
        "UPDATE shopping_list_items SET name = ? WHERE id = ? AND list_id = ?",
        (name, item_id, list_id),
    )
    await conn.commit()
    await _touch_list(conn, list_id)


async def delete_shopping_item(
    conn: aiosqlite.Connection, list_id: int, item_id: int
) -> None:
    cur = await conn.execute(
        "SELECT id FROM shopping_list_items WHERE id = ? AND list_id = ?",
        (item_id, list_id),
    )
    if not await cur.fetchone():
        raise ValueError("Item não encontrado")
    await conn.execute("DELETE FROM shopping_list_items WHERE id = ? AND list_id = ?", (item_id, list_id))
    await conn.commit()
    await _touch_list(conn, list_id)


# --- Product prices (banco de preços por mercado) ---

async def insert_product_price(
    conn: aiosqlite.Connection,
    product_name: str,
    market_name: str,
    price: float,
) -> None:
    p = (product_name or "").strip()
    m = (market_name or "").strip()
    if not p or not m:
        raise ValueError("Produto e mercado são obrigatórios")
    await conn.execute(
        "INSERT INTO product_prices (product_name, market_name, price) VALUES (?, ?, ?)",
        (p, m, float(price)),
    )
    await conn.commit()


async def get_other_market_prices_for_product(
    conn: aiosqlite.Connection,
    product_name: str,
    exclude_market: str,
) -> list[tuple[str, float, str]]:
    """Retorna (market_name, price, recorded_at) para o mesmo produto em outros mercados.
    Um registro por mercado (o mais recente). Ordenado por recorded_at DESC."""
    p = (product_name or "").strip()
    ex = (exclude_market or "").strip().lower()
    if not p:
        return []
    cur = await conn.execute(
        """SELECT market_name, price, recorded_at FROM product_prices
           WHERE LOWER(TRIM(product_name)) = LOWER(TRIM(?))
             AND LOWER(TRIM(market_name)) != ?
           ORDER BY recorded_at DESC""",
        (p, ex if ex else "__none__"),
    )
    rows = await cur.fetchall()
    seen: set[str] = set()
    out: list[tuple[str, float, str]] = []
    for r in rows:
        m = (r[0] or "").strip()
        mk = m.lower()
        if mk and mk not in seen:
            seen.add(mk)
            out.append((m, float(r[1]), r[2] or ""))
    return out


def _norm(s: str) -> str:
    return (s or "").strip().lower()


async def list_product_prices_grouped(
    conn: aiosqlite.Connection,
) -> list[dict]:
    """Lista preços agrupados por mercado. Um item por (produto, mercado) — o mais recente.
    Cada item tem is_best_price=True se for o menor preço desse produto em todos os mercados."""
    cur = await conn.execute(
        """SELECT id, product_name, market_name, price, recorded_at
           FROM product_prices ORDER BY market_name, recorded_at DESC"""
    )
    rows = await cur.fetchall()
    # (norm_product, norm_market) -> (id, product_name, market_name, price, recorded_at)
    latest: dict[tuple[str, str], tuple[int, str, str, float, str]] = {}
    for r in rows:
        np = _norm(r[1])
        nm = _norm(r[2])
        if not np or not nm:
            continue
        key = (np, nm)
        if key not in latest:
            latest[key] = (r[0], (r[1] or "").strip(), (r[2] or "").strip(), float(r[3]), r[4] or "")
    items_list = list(latest.values())
    # min price per product (norm_product)
    by_product: dict[str, float] = {}
    for _id, pname, mname, price, _at in items_list:
        np = _norm(pname)
        by_product[np] = min(by_product.get(np, price), price)
    # build grouped: market -> [items]
    by_market: dict[str, list[dict]] = {}
    for _id, pname, mname, price, rec_at in items_list:
        np = _norm(pname)
        is_best = np in by_product and price <= by_product[np]
        item = {
            "id": _id,
            "product_name": pname,
            "market_name": mname,
            "price": price,
            "recorded_at": rec_at,
            "is_best_price": is_best,
        }
        mk = mname
        if mk not in by_market:
            by_market[mk] = []
        by_market[mk].append(item)
    for lst in by_market.values():
        lst.sort(key=lambda x: x["product_name"].lower())
    markets_sorted = sorted(by_market.keys(), key=str.lower)
    return [{"market_name": m, "items": by_market[m]} for m in markets_sorted]


async def get_product_price(
    conn: aiosqlite.Connection, row_id: int
) -> Optional[tuple[int, str, str, float, str]]:
    """Retorna (id, product_name, market_name, price, recorded_at) ou None."""
    cur = await conn.execute(
        "SELECT id, product_name, market_name, price, recorded_at FROM product_prices WHERE id = ?",
        (row_id,),
    )
    row = await cur.fetchone()
    if not row:
        return None
    return (row[0], row[1], row[2], row[3], row[4])


async def update_product_price(
    conn: aiosqlite.Connection,
    row_id: int,
    product_name: Optional[str] = None,
    price: Optional[float] = None,
) -> None:
    cur = await conn.execute("SELECT id FROM product_prices WHERE id = ?", (row_id,))
    if not await cur.fetchone():
        raise ValueError("Preço não encontrado")
    updates = []
    params = []
    if product_name is not None:
        p = (product_name or "").strip()
        if not p:
            raise ValueError("Nome do produto não pode ser vazio")
        updates.append("product_name = ?")
        params.append(p)
    if price is not None:
        if price <= 0:
            raise ValueError("Preço deve ser positivo")
        updates.append("price = ?")
        params.append(float(price))
    if not updates:
        return
    params.append(row_id)
    await conn.execute(
        f"UPDATE product_prices SET {', '.join(updates)} WHERE id = ?",
        tuple(params),
    )
    await conn.commit()


async def delete_product_price(conn: aiosqlite.Connection, row_id: int) -> None:
    cur = await conn.execute("SELECT id FROM product_prices WHERE id = ?", (row_id,))
    if not await cur.fetchone():
        raise ValueError("Preço não encontrado")
    await conn.execute("DELETE FROM product_prices WHERE id = ?", (row_id,))
    await conn.commit()
