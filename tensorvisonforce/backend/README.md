# Civic Complaint Backend

FastAPI backend for a municipal complaint-reporting system: citizens submit
complaints (with photos), an AI pipeline classifies and prioritizes them,
duplicate reports get merged, and workers/admins track them through to
resolution against SLA targets.

## Stack

- **FastAPI** + **Pydantic v2** — API layer and validation
- **Supabase** (Postgres + Storage) — data and image storage
- **JWT** (python-jose) + **bcrypt** (passlib) — auth
- **scikit-learn** (TF-IDF + Multinomial Naive Bayes) — complaint text classification
- **Pillow + numpy** — image quality (blur/resolution) checks and perceptual hashing
- **pytest** — test suite

## Project layout

```
backend/
├── app/
│   ├── main.py              FastAPI factory, lifespan, all routers
│   ├── config.py             Pydantic Settings (all from .env)
│   ├── dependencies.py       JWT auth, role guards, Supabase client
│   ├── routers/               auth, complaints, ai, location, admin, worker, feedback
│   ├── services/               image_quality, image_enhancement, classification,
│   │                            duplicate_detection, priority, location,
│   │                            verification, department, sla
│   ├── schemas/                auth, complaints, ai, location, feedback, admin, worker
│   └── utils/                   security, id_generator, file_utils, status_machine, image_hash
├── ai/
│   └── data/complaint_training.csv   90 labeled examples across 6 categories
├── tests/
│   ├── conftest.py            fixtures, TestClient, auth headers
│   ├── test_auth.py
│   ├── test_classification.py
│   ├── test_priority.py
│   ├── test_duplicate_detection.py
│   ├── test_image_quality.py
│   ├── test_status_machine.py
│   └── test_complaint_api.py
├── requirements.txt
├── .env.example
├── pytest.ini
└── README.md
```

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET_KEY, etc.
```

## Running

```bash
uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`
Health check: `GET /health`

## Running tests

```bash
pytest
```

Tests do **not** require a live Supabase project. Auth/token tests exercise
the real JWT logic; complaint API tests run against a small in-memory fake
of the Supabase client (see `tests/test_complaint_api.py`) that supports
`select` / `insert` / `update` / `eq` / `neq` / `in_` chaining, so router
logic is exercised end-to-end without a network call.

## Data model (Supabase tables expected)

This backend assumes the following tables exist in Supabase (create via
migration/SQL editor — no ORM migrations are included, since schema
ownership is expected to live in Supabase directly):

- `users` (id, email, hashed_password, full_name, phone, role, department_id, disabled, created_at)
- `departments` (id, name, categories[], contact_email, created_at)
- `department_zones` (department_id, department_name, zone_name, center_lat, center_lng, radius_meters)
- `complaints` (id, complaint_number, title, description, category, status, priority,
  latitude, longitude, address, citizen_id, department_id, assigned_worker_id,
  duplicate_of, sla_due_at, resolution_notes, created_at, updated_at)
- `complaint_images` (id, url, storage_path, uploaded_by, complaint_id, is_blurry,
  quality_score, phash)
- `feedback` (id, complaint_id, citizen_id, rating, comment, reopened, created_at)

A Supabase Storage bucket (`SUPABASE_STORAGE_BUCKET`, default
`complaint-images`) is used for uploaded photos.

## Request pipeline: creating a complaint

`POST /api/v1/complaints` runs, in order:

1. **Classify** the free-text description into a category (`services/classification.py`)
2. **Duplicate check** against open complaints within a configurable radius,
   blending text similarity + image perceptual-hash distance (`services/duplicate_detection.py`)
3. **Priority scoring** — transparent, rule-based (category severity + urgency
   keywords + duplicate-report count + image quality), not a black box (`services/priority.py`)
4. **SLA due date** computed from priority (`services/sla.py`)
5. Row persisted; any pre-uploaded images (`POST /api/v1/ai/images`) are linked

## Status lifecycle

Enforced centrally in `app/utils/status_machine.py`:

```
SUBMITTED → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
    ↓            ↓                      ↑ ↓
REJECTED     DUPLICATE              (reopened via citizen feedback)
```

`CLOSED`, `REJECTED`, and `DUPLICATE` are terminal — no further transitions.

## Auth & roles

Three roles: `citizen`, `worker`, `admin`. JWT access tokens carry
`role` and `department_id` claims so route guards
(`require_citizen` / `require_worker` / `require_admin` in
`app/dependencies.py`) don't need an extra DB lookup per request.

## Notes / things to decide before production

- `reverse_geocode` in `services/location.py` is a working stub — wire up
  a real provider (Google Maps, Mapbox, Nominatim) via `provider_url`/`api_key`.
- Worker temp-password flow (`POST /admin/workers`) currently returns the
  temp password in the response for convenience in dev; in production this
  should be emailed instead.
- No DB migrations are included; table DDL should be added to your Supabase
  project (see "Data model" above) before running against a real database.
