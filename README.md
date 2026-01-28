# DIANE

Assistente de IA para finanças pessoais e listas de compras: guarda gastos e receitas, categoriza o que você envia no chat e persiste em SQLite local. Também cria listas de compras, adiciona itens e marca "peguei" pelo chat. Mantém um **banco de preços por mercado**: você reporta preço de produto em mercado (ex. *"leite piracanjuba no guanabara 5,90"*) e a DIANE registra com a data; se o item já existir em outro mercado, ela compara e responde com a diferença percentual. Responde sobre valor gasto no mês, saldo das contas, valor por categoria, etc.

- **Backend**: FastAPI, SQLite, Gemini (extração + chat)
- **Frontend**: Vite, React, React Router, Tailwind — chat com prompt aberto e páginas de dados

## Pré-requisitos

- Python 3.11+
- Node 18+
- Chave da API Gemini (Google AI Studio)

## Configuração

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Crie `backend/.env`:

```
GEMINI_API_KEY=sua-chave-do-google-ai-studio
GEMINI_MODEL=gemini-1.0-pro
DATABASE_PATH=data/diane.db
```

- `GEMINI_API_KEY`: obrigatório para o chat. Chave em [Google AI Studio](https://aistudio.google.com/apikey).
- `GEMINI_MODEL`: opcional. Default `gemini-2.5-flash`. Alternativas: `gemini-2.0-flash`, `gemini-2.5-pro`.
- `DATABASE_PATH`: opcional; default `data/diane.db`.
- `OPENAI_API_KEY` no `.env` é ignorada (o backend usa só Gemini).

### Frontend

```bash
cd frontend
npm install
```

## Como rodar

1. **Backend** (terminal 1):

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

2. **Frontend** (terminal 2):

```bash
cd frontend
npm run dev
```

Acesse **http://localhost:5173**. O Vite faz proxy de `/api` para o backend em `:8000`.

## Uso

- **Chat**: gastos (*"Gastei 50 no mercado"*), perguntas (*"Quanto gastei este mês?"*), **listas de compras** (*"Cria uma lista"*, *"Adiciona leite e pão"*, *"Peguei o leite"*) e **preços por mercado** (*"Preço do leite piracanjuba no guanabara tá 5,90"*). A DIANE registra o preço com a data do envio; se o produto já existir em outro mercado, devolve a comparação (ex. *"No Assaí está R$ 6,50, cerca de 10% mais caro"*). *(Requer `GEMINI_API_KEY`.)*
- **Visão geral**: saldo total e gastos do mês.
- **Contas**: listar e criar contas com saldo.
- **Transações**: histórico com filtro por ano/mês.
- **Por categoria**: gastos do mês por categoria.
- **Listas de compras**: consultar listas, criar nova, marcar/desmarcar itens (check). Uma lista fica **ativa**; comandos de adicionar/peguei usam a ativa.

## Estrutura

```
backend/
  app/
    config.py      # settings (Gemini, DB path)
    database.py    # SQLite init, get_db
    llm.py         # extração de transação + chat (Gemini)
    models.py      # Pydantic models
    repositories.py
    routers/       # accounts, categories, transactions, stats, chat, shopping
    main.py
  requirements.txt
frontend/
  src/
    api.ts         # client HTTP para /api
    pages/         # Chat, Dashboard, Accounts, Transactions, Stats, ShoppingLists
    components/
  ...
```

## API (exemplos)

- `GET /api/accounts` — listar contas  
- `POST /api/accounts` — criar conta `{ "name": "...", "balance": 0 }`  
- `GET /api/categories` — listar categorias  
- `GET /api/transactions?limit=100&year=2025&month=1`  
- `GET /api/stats/monthly?year=2025&month=1`  
- `POST /api/chat` — `{ "message": "..." }` → `{ "reply": "...", "extracted_transaction": ... }`  
- `GET /api/shopping-lists` — listar listas de compras (com itens)  
- `POST /api/shopping-lists` — criar lista `{ "name": "..." }`  
- `POST /api/shopping-lists/:id/items` — adicionar itens `{ "items": ["leite", "pão"] }`  
- `PATCH /api/shopping-lists/:id/items/check` — marcar "peguei" `{ "item_names": ["leite"] }`  
- `PATCH /api/shopping-lists/:id/items/:itemId/toggle` — check/uncheck um item  
- `POST /api/shopping-lists/:id/activate` — definir lista ativa
