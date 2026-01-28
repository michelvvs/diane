import asyncio
import json
import re
from datetime import date
from typing import Any, Optional, Tuple

import google.generativeai as genai

from app.config import settings
from app.models import Transaction

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

EXTRACTION_PROMPT = """Analisa a mensagem do usuário e, se ela descrever um gasto, receita ou transação financeira, extrai os dados em JSON.

Regras:
- amount: valor numérico (sempre positivo; para receita use positive, para gasto use positive e indique que é gasto no description se fizer sentido).
- description: breve descrição da transação (ex: "Mercado", "Almoço", "Depósito").
- category: UMA das categorias: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Compras, Serviços, Salário, Investimentos, Outros.
- account: nome da conta/cartão se mencionado (ex: Nubank, Itaú, Dinheiro), ou null.
- tx_date: data da transação em YYYY-MM-DD. Se não informada, use hoje.

Se a mensagem NÃO for sobre uma transação (pergunta, cumprimento, etc), responda apenas: {"extract": null}

Exemplo de resposta para "Gastei 50 no mercado ontem": {"extract": {"amount": 50, "description": "Mercado", "category": "Alimentação", "account": null, "tx_date": "2025-01-27"}}
"""


def _extract_braces(s: str) -> Optional[str]:
    start = s.find("{")
    if start < 0:
        return None
    depth = 0
    for i, c in enumerate(s[start:], start):
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return None


def _parse_extract(raw: str) -> Optional[dict[str, Any]]:
    raw = raw.strip()
    for pattern in (r"```json\s*([\s\S]*?)\s*```", r"```\s*([\s\S]*?)\s*```"):
        m = re.search(pattern, raw)
        if m:
            raw = m.group(1).strip()
            break
    if not raw.strip().startswith("{"):
        extracted = _extract_braces(raw)
        if extracted:
            raw = extracted
    try:
        data = json.loads(raw)
        return data.get("extract")
    except json.JSONDecodeError:
        return None


def _extract_sync(message: str) -> Tuple[Optional[dict[str, Any]], str, str]:
    model = genai.GenerativeModel(settings.gemini_model)
    today = date.today().isoformat()
    prompt = f"{EXTRACTION_PROMPT}\n\nData de hoje: {today}\n\nMensagem: {message}"
    r = model.generate_content(
        prompt,
        generation_config={"temperature": 0.1},
    )
    text = (r.text or "").strip()
    return _parse_extract(text), prompt, text


async def extract_transaction(message: str) -> Tuple[Optional[dict[str, Any]], str, str]:
    if not settings.gemini_api_key:
        return None, "", ""
    return await asyncio.to_thread(_extract_sync, message)


SHOPPING_INTENT_PROMPT = """Analisa a mensagem do usuário sobre LISTA DE COMPRAS.

Ações possíveis:
- create_list: usuário quer CRIAR ou INICIAR uma nova lista (ex: "cria uma lista", "nova lista", "inicia lista").
  Pode incluir itens iniciais na mesma frase (ex: "cria lista e adiciona leite, pão", "nova lista do mercado com café e açúcar").
- add_items: usuário quer ADICIONAR itens (ex: "adiciona leite", "adiciona leite e pão", "põe café na lista").
- check_items: usuário diz que PEGOU/comprou itens (ex: "peguei o leite", "peguei leite e pão", "marquei o café").

Responde APENAS em JSON, sem outro texto:
{"action": "create_list"|"add_items"|"check_items"|null, "list_name": "nome ou null", "items": ["item1","item2"] ou []}

Regras:
- action null se não for sobre lista de compras.
- create_list: list_name pode ser um nome dado ("lista do mercado") ou null para "Nova lista".
  Se o usuário disser itens ao criar (ex: "cria lista com leite e pão"), inclua em items.
- add_items / check_items: items = lista dos itens mencionados.
- "peguei o leite" -> check_items, items ["leite"].
- "adiciona leite, pão e café" -> add_items, items ["leite","pão","café"].
- "cria uma lista e põe leite, pão" -> create_list, list_name null, items ["leite","pão"].
"""


def _parse_shopping_intent(raw: str) -> Optional[dict[str, Any]]:
    raw = raw.strip()
    for pattern in (r"```json\s*([\s\S]*?)\s*```", r"```\s*([\s\S]*?)\s*```"):
        m = re.search(pattern, raw)
        if m:
            raw = m.group(1).strip()
            break
    if not raw.strip().startswith("{"):
        extracted = _extract_braces(raw)
        if extracted:
            raw = extracted
    try:
        data = json.loads(raw)
        action = data.get("action")
        if action not in ("create_list", "add_items", "check_items", None):
            return None
        return {
            "action": action,
            "list_name": data.get("list_name") or None,
            "items": data.get("items") if isinstance(data.get("items"), list) else [],
        }
    except json.JSONDecodeError:
        return None


def _shopping_intent_sync(message: str) -> Tuple[Optional[dict[str, Any]], str, str]:
    model = genai.GenerativeModel(settings.gemini_model)
    prompt = f"{SHOPPING_INTENT_PROMPT}\n\nMensagem: {message}"
    r = model.generate_content(
        prompt,
        generation_config={"temperature": 0.1},
    )
    text = (r.text or "").strip()
    return _parse_shopping_intent(text), prompt, text


async def extract_shopping_intent(message: str) -> Tuple[Optional[dict[str, Any]], str, str]:
    if not settings.gemini_api_key:
        return None, "", ""
    return await asyncio.to_thread(_shopping_intent_sync, message)


PRODUCT_PRICE_PROMPT = """Analisa a mensagem do usuário. Se ela REPORTAR o preço de um produto em um mercado/supermercado, extrai os dados.

Exemplos:
- "preço do leite piracanjuba no guanabara tá 5,90" -> produto, mercado, preço
- "no assaí o leite custa 6 reais"
- "leite piracanjuba guanabara 5,90"
- "registra preço do café no atacadão: 12,50"

Responde APENAS em JSON, sem outro texto:
{"product": "nome do produto", "market": "nome do mercado", "price": número}

Regras:
- product: nome do produto (ex: "leite piracanjuba", "café").
- market: nome do mercado/supermercado (ex: "guanabara", "assai", "atacadão").
- price: valor numérico (use . como decimal). Ex: 5.90, 12.50.
- Se a mensagem NÃO for reporte de preço em mercado, responda: {"product": null, "market": null, "price": null}
"""


def _parse_product_price(raw: str) -> Optional[dict[str, Any]]:
    raw = raw.strip()
    for pattern in (r"```json\s*([\s\S]*?)\s*```", r"```\s*([\s\S]*?)\s*```"):
        m = re.search(pattern, raw)
        if m:
            raw = m.group(1).strip()
            break
    if not raw.strip().startswith("{"):
        extracted = _extract_braces(raw)
        if extracted:
            raw = extracted
    try:
        data = json.loads(raw)
        p = data.get("product")
        m = data.get("market")
        pr = data.get("price")
        if p is None and m is None and pr is None:
            return None
        if not isinstance(p, str) or not p or not isinstance(m, str) or not m:
            return None
        try:
            price = float(pr)
        except (TypeError, ValueError):
            return None
        if price <= 0:
            return None
        return {"product": p.strip(), "market": m.strip(), "price": price}
    except json.JSONDecodeError:
        return None


def _product_price_sync(message: str) -> Tuple[Optional[dict[str, Any]], str, str]:
    model = genai.GenerativeModel(settings.gemini_model)
    prompt = f"{PRODUCT_PRICE_PROMPT}\n\nMensagem: {message}"
    r = model.generate_content(
        prompt,
        generation_config={"temperature": 0.1},
    )
    text = (r.text or "").strip()
    return _parse_product_price(text), prompt, text


async def extract_product_price(message: str) -> Tuple[Optional[dict[str, Any]], str, str]:
    if not settings.gemini_api_key:
        return None, "", ""
    return await asyncio.to_thread(_product_price_sync, message)


def build_context(
    accounts: list[dict],
    categories: list[dict],
    monthly_total: float,
    monthly_by_category: list[dict],
    year: int,
    month: int,
    shopping_summary: str = "",
) -> str:
    acc_lines = "\n".join(
        f"- {a['name']}: R$ {a['balance']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        for a in accounts
    )
    cat_lines = "\n".join(
        f"- {c['category_name']}: R$ {c['total']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        for c in monthly_by_category
    )
    total_fmt = f"R$ {monthly_total:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    block = f"""Resumo financeiro atual (mês {month:02d}/{year}):

**Gastos no mês:** {total_fmt}

**Por categoria:**
{cat_lines if cat_lines else "(nenhum gasto registrado no mês)"}

**Contas e saldos:**
{acc_lines if acc_lines else "(nenhuma conta cadastrada)"}
"""
    if shopping_summary:
        block += f"\n**Lista de compras ativa:**\n{shopping_summary}\n"
    block += "\nSuporta também banco de preços por mercado: usuário pode reportar preço de produto em mercado (ex: 'leite piracanjuba no guanabara 5,90')."
    block += "\nSeja objetiva e amigável. Use os dados acima para responder. Suporta finanças e listas de compras (criar lista, adicionar itens, 'peguei' para marcar)."
    return block


def _chat_sync(
    user_message: str, context: str, recent: list[tuple[str, str]]
) -> Tuple[str, str, str]:
    model = genai.GenerativeModel(settings.gemini_model)
    system = f"""Você é a DIANE, assistente de finanças pessoais. Você guarda gastos, receitas e contas em SQLite local.

{context}

Responda sempre em português."""
    parts = [system, "\n\n---\n\n"]
    for role, content in recent[-10:]:
        parts.append(f"{'Usuário' if role == 'user' else 'DIANE'}: {content}\n\n")
    parts.append(f"Usuário: {user_message}")
    prompt = "".join(parts)
    r = model.generate_content(
        prompt,
        generation_config={"temperature": 0.5},
    )
    response = (r.text or "").strip()
    return response, prompt, response


async def chat_reply(
    user_message: str,
    context: str,
    recent_messages: list[tuple[str, str]],
) -> Tuple[str, str, str]:
    if not settings.gemini_api_key:
        err = "Configure GEMINI_API_KEY para usar o chat da DIANE."
        return err, "", ""
    return await asyncio.to_thread(_chat_sync, user_message, context, recent_messages)
