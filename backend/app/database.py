import aiosqlite
from contextlib import asynccontextmanager
from pathlib import Path

from app.config import get_db_path


DB_PATH = str(get_db_path())


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                balance REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                description TEXT NOT NULL,
                category_id INTEGER NOT NULL REFERENCES categories(id),
                account_id INTEGER REFERENCES accounts(id),
                tx_date TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(tx_date)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id)")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS shopping_lists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS shopping_list_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                checked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON shopping_list_items(list_id)")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS prompt_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                prompt_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                model TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_prompt_logs_created ON prompt_logs(created_at)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_prompt_logs_kind ON prompt_logs(kind)")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS product_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                market_name TEXT NOT NULL,
                price REAL NOT NULL,
                recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_name)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_product_prices_recorded ON product_prices(recorded_at)")
        default_cats = [
            "Alimentação", "Transporte", "Moradia", "Saúde", "Educação",
            "Lazer", "Compras", "Serviços", "Salário", "Investimentos", "Outros",
        ]
        for name in default_cats:
            await db.execute(
                "INSERT OR IGNORE INTO categories (name) VALUES (?)", (name,)
            )
        await db.commit()


@asynccontextmanager
async def get_db():
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        yield conn
