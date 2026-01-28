from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str
    balance: float = 0.0


class Account(BaseModel):
    id: int
    name: str
    balance: float
    created_at: str


class AccountWithStats(Account):
    """Saldo inicial (balance), gastos da conta, saldo efetivo = balance - spending."""
    spending: float = 0.0
    effective_balance: float = 0.0


class CategoryCreate(BaseModel):
    name: str


class Category(BaseModel):
    id: int
    name: str
    created_at: str


class TransactionCreate(BaseModel):
    amount: float
    description: str
    category_id: int
    account_id: Optional[int] = None
    tx_date: str  # YYYY-MM-DD


class Transaction(BaseModel):
    id: int
    amount: float
    description: str
    category_id: int
    category_name: Optional[str] = None
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    tx_date: str
    created_at: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    extracted_transaction: Optional[Transaction] = None
    error_type: Optional[str] = None  # "quota" | "llm" quando reply é mensagem de erro


class CategoryTotal(BaseModel):
    category_name: str
    total: float


class MonthlySpending(BaseModel):
    year: int
    month: int
    total: float
    by_category: list[CategoryTotal]


class StatsByCategory(BaseModel):
    category_name: str
    total: float
    count: int


class ShoppingListItem(BaseModel):
    id: int
    list_id: int
    name: str
    checked: bool
    created_at: str


class ShoppingList(BaseModel):
    id: int
    name: str
    active: bool
    created_at: str
    updated_at: str
    items: list[ShoppingListItem] = []


class PromptLog(BaseModel):
    id: int
    kind: str
    prompt_text: str
    response_text: str
    model: str
    created_at: str
