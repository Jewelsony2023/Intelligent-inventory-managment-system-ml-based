# Inventory IQ — Phase 1: Foundation

Full-stack inventory management platform. FastAPI + PostgreSQL + React + TypeScript.

---

## Quick start (Docker — recommended)

```bash
docker-compose up -d
# Wait ~20s for services to be healthy, then seed:
docker-compose exec backend python seed.py
```

App runs at: http://localhost:5173  
API docs at: http://localhost:8000/api/v1/docs

Default credentials: `admin@inventory-iq.com` / `Admin1234!`  
**Change this password immediately.**

---

## Local dev (without Docker)

### Prerequisites
- Python 3.12+
- Node 20+
- PostgreSQL 16
- Redis 7

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Copy and edit env
cp .env.example .env

# Run migrations
alembic upgrade head

# Seed admin user
python seed.py

# Start server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## RBAC — Roles & Permissions

| Permission | Admin | Manager | Staff | Viewer |
|---|:---:|:---:|:---:|:---:|
| inventory:read | ✅ | ✅ | ✅ | ✅ |
| inventory:write | ✅ | ✅ | ✅ | ❌ |
| inventory:delete | ✅ | ❌ | ❌ | ❌ |
| order:approve | ✅ | ✅ | ❌ | ❌ |
| forecast:configure | ✅ | ✅ | ❌ | ❌ |
| user:write | ✅ | ❌ | ❌ | ❌ |
| settings:write | ✅ | ❌ | ❌ | ❌ |

Full permission matrix in `backend/app/core/rbac.py`.

---

## Project structure

```
inventory-system/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── deps.py          # Auth + RBAC dependencies
│   │   │   └── endpoints/
│   │   │       ├── auth.py      # Login, refresh, logout, /me
│   │   │       └── users.py     # User CRUD
│   │   ├── core/
│   │   │   ├── config.py        # Settings (pydantic-settings)
│   │   │   ├── rbac.py          # Roles, permissions, mapping
│   │   │   └── security.py      # JWT, password hashing
│   │   ├── db/session.py        # Async SQLAlchemy
│   │   ├── models/user.py       # User ORM model
│   │   └── schemas/user.py      # Pydantic request/response schemas
│   ├── alembic/                 # DB migrations
│   ├── seed.py                  # Admin user seeder
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── components/auth/
        │   └── ProtectedRoute.tsx   # Route guard + PermissionGate
        ├── lib/api.ts               # Axios + auto token refresh
        ├── pages/LoginPage.tsx
        ├── stores/authStore.ts      # Zustand auth state
        ├── types/index.ts           # Shared TypeScript types
        └── App.tsx                  # Router with protected routes
```

---

## Phase 2 — next up

- Inventory & product models + CRUD
- ML forecasting pipeline (ARIMA, Prophet, LightGBM ensemble)
- MLflow model registry
- ClickHouse analytics layer
- Celery job queue for model training
