from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import (
    accounts,
    categories,
    transactions,
    stats,
    chat,
    shopping,
    prompt_logs,
    product_prices,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="DIANE", description="Assistente de finanças pessoais", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(shopping.router, prefix="/api")
app.include_router(prompt_logs.router, prefix="/api")
app.include_router(product_prices.router, prefix="/api")


@app.get("/")
async def root():
    return {"name": "DIANE", "message": "Assistente de finanças pessoais"}
