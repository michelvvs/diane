from datetime import date
from typing import Optional, Tuple

from fastapi import APIRouter

from app.config import settings
from app.database import get_db
from app.repositories import (
    add_shopping_items,
    append_chat_message,
    check_shopping_items_by_names,
    create_shopping_list,
    create_transaction,
    get_active_shopping_list,
    get_monthly_spending,
    get_or_create_account,
    get_or_create_category,
    get_other_market_prices_for_product,
    get_recent_chat,
    get_shopping_list,
    insert_product_price,
    insert_prompt_log,
    list_accounts_with_stats,
)
from app.llm import (
    build_context,
    chat_reply,
    extract_product_price,
    extract_shopping_intent,
    extract_transaction as llm_extract,
)
from app.models import ChatRequest, ChatResponse, Transaction

router = APIRouter(prefix="/chat", tags=["chat"])

QUOTA_KEYWORDS = ("429", "quota", "resource exhausted", "rate limit", "rate_limit", "resource_exhausted")


def _is_quota_error(e: BaseException) -> bool:
    s = str(e).lower()
    return any(k in s for k in QUOTA_KEYWORDS)


def _llm_error_reply(exc: BaseException) -> Tuple[str, str]:
    """Retorna (reply, error_type) para exibir ao usuário."""
    if _is_quota_error(exc):
        return (
            "⚠️ A cota da API do Gemini foi excedida (limite de uso ou taxa). "
            "Tente novamente em alguns minutos. Se o problema persistir, verifique seu plano e limites em Google AI Studio.",
            "quota",
        )
    return (
        f"Não consegui processar sua mensagem. Erro: {exc!s}. Tente novamente.",
        "llm",
    )


def _fmt_brl(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _format_list_state(name: str, items: list[tuple[str, bool]]) -> str:
    """Formata nome da lista e estado dos itens ([ ] ou [x] + nome)."""
    lines = [f"Lista \"{name}\". Estado atual:"]
    for nm, chk in items:
        lines.append(f"  - [{'x' if chk else ' '}] {nm}")
    return "\n".join(lines)


def _build_price_reply(
    product: str,
    market: str,
    price: float,
    others: list[tuple[str, float, str]],
) -> str:
    base = f"Registrei {product} no {market} por {_fmt_brl(price)} (data de hoje)."
    if not others:
        return base
    parts = [base]
    for mkt, p, _ in others:
        diff_pct = ((p - price) / price) * 100
        if abs(diff_pct) < 0.1:
            parts.append(f"No {mkt} está {_fmt_brl(p)}, praticamente o mesmo preço.")
        elif diff_pct > 0:
            parts.append(f"No {mkt} está {_fmt_brl(p)}, cerca de {abs(diff_pct):.1f}% mais caro.")
        else:
            parts.append(f"No {mkt} está {_fmt_brl(p)}, cerca de {abs(diff_pct):.1f}% mais barato.")
    return "\n".join(parts)


@router.post("", response_model=ChatResponse)
async def chat_route(body: ChatRequest):
    async with get_db() as conn:
        model_name = settings.gemini_model or "gemini"

        # 1. Extract transaction from message (if any)
        extracted = None
        prompt_tx, response_tx = "", ""
        try:
            extracted, prompt_tx, response_tx = await llm_extract(body.message)
        except Exception:
            pass  # segue sem extração; erros de LLM surfam no chat
        if prompt_tx and response_tx:
            await insert_prompt_log(
                conn, "extraction_tx", prompt_tx, response_tx, model_name
            )
        created_tx: Optional[Transaction] = None
        if extracted:
            cat_name = extracted.get("category") or "Outros"
            acc_name = extracted.get("account")
            tx_date = extracted.get("tx_date") or date.today().isoformat()
            cat_id = await get_or_create_category(conn, cat_name)
            acc_id = await get_or_create_account(conn, acc_name) if acc_name else None
            created_tx = await create_transaction(
                conn,
                amount=float(extracted["amount"]),
                description=str(extracted.get("description", " ") or " ").strip() or "Sem descrição",
                category_id=cat_id,
                account_id=acc_id,
                tx_date=tx_date,
            )

        # 1b. Shopping list intents
        intent = None
        prompt_sh, response_sh = "", ""
        try:
            intent, prompt_sh, response_sh = await extract_shopping_intent(body.message)
        except Exception:
            pass
        if prompt_sh and response_sh:
            await insert_prompt_log(
                conn, "extraction_shopping", prompt_sh, response_sh, model_name
            )
        shopping_reply: Optional[str] = None
        if intent and intent.get("action"):
            act = intent["action"]
            active = await get_active_shopping_list(conn)
            if act == "create_list":
                name = (intent.get("list_name") or "").strip() or "Nova lista"
                _ = await create_shopping_list(conn, name)
                active = await get_active_shopping_list(conn)
                initial = [x.strip() for x in (intent.get("items") or []) if x and x.strip()]
                if initial and active:
                    await add_shopping_items(conn, active.id, initial)
                    lst = await get_shopping_list(conn, active.id)
                    if lst:
                        shopping_reply = _format_list_state(
                            lst.name, [(it.name, it.checked) for it in lst.items]
                        )
            elif act == "add_items":
                items = [x.strip() for x in (intent.get("items") or []) if x and x.strip()]
                if items:
                    if not active:
                        await create_shopping_list(conn, "Nova lista")
                        active = await get_active_shopping_list(conn)
                    if active:
                        await add_shopping_items(conn, active.id, items)
                        lst = await get_shopping_list(conn, active.id)
                        if lst:
                            shopping_reply = _format_list_state(
                                lst.name, [(it.name, it.checked) for it in lst.items]
                            )
            elif act == "check_items":
                names = [x.strip() for x in (intent.get("items") or []) if x and x.strip()]
                if names and active:
                    await check_shopping_items_by_names(conn, active.id, names)

        # 1c. Product price (banco de preços por mercado)
        price_reply: Optional[str] = None
        price_data = None
        prompt_pp, response_pp = "", ""
        try:
            price_data, prompt_pp, response_pp = await extract_product_price(body.message)
        except Exception:
            pass
        if prompt_pp and response_pp:
            await insert_prompt_log(
                conn, "extraction_product_price", prompt_pp, response_pp, model_name
            )
        if price_data:
            try:
                product = (price_data.get("product") or "").strip()
                market = (price_data.get("market") or "").strip()
                price = float(price_data.get("price") or 0)
                if product and market and price > 0:
                    await insert_product_price(conn, product, market, price)
                    others = await get_other_market_prices_for_product(
                        conn, product, market
                    )
                    price_reply = _build_price_reply(product, market, price, others)
            except (ValueError, TypeError):
                pass

        # 2. Build context from DB
        today = date.today()
        accounts = await list_accounts_with_stats(conn)
        monthly_total, monthly_by_cat = await get_monthly_spending(
            conn, today.year, today.month
        )
        acc_dicts = [
            {"name": a.name, "balance": a.effective_balance, "spending": a.spending}
            for a in accounts
        ]
        cat_dicts = [
            {"category_name": c.category_name, "total": c.total}
            for c in monthly_by_cat
        ]
        active_list = await get_active_shopping_list(conn)
        shopping_summary = ""
        if active_list:
            lines = [f"{active_list.name}:"]
            for it in active_list.items:
                lines.append(f"  - [{'x' if it.checked else ' '}] {it.name}")
            shopping_summary = "\n".join(lines)
        context = build_context(
            acc_dicts,
            [],
            monthly_total,
            cat_dicts,
            today.year,
            today.month,
            shopping_summary=shopping_summary,
        )

        # 3. Recent chat
        recent = await get_recent_chat(conn, limit=20)

        # 4. Get reply from LLM
        reply: str
        error_type: Optional[str] = None
        try:
            reply, prompt_chat, response_chat = await chat_reply(
                body.message, context, recent
            )
            if prompt_chat and response_chat:
                await insert_prompt_log(
                    conn, "chat", prompt_chat, response_chat, model_name
                )
        except Exception as e:
            reply, error_type = _llm_error_reply(e)

        extra = [s for s in (shopping_reply, price_reply) if s]
        if extra:
            block = "\n\n".join(extra)
            reply = f"{block}\n\n{reply}" if reply.strip() else block

        # 5. Persist chat
        await append_chat_message(conn, "user", body.message)
        await append_chat_message(conn, "assistant", reply)

    return ChatResponse(
        reply=reply,
        extracted_transaction=created_tx,
        error_type=error_type,
    )
