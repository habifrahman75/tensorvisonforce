# CivicPulse — Supabase Setup Guide

> **Full database setup instructions for the CivicPulse prototype.**  
> This guide covers project creation, schema migration, storage buckets,  
> environment variables, and seed data.

---

## 1. Create a Supabase Project

1. Go to **[supabase.com](https://supabase.com)** → **New project**
2. Choose an organisation, project name (`civicpulse`), and a strong DB password
3. Select the region closest to your users
4. Wait for provisioning to complete (~1–2 min)

---

## 2. Collect your credentials

In the Supabase Dashboard go to **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | `anon` key (safe for client-side use) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (**server-side only, never expose to clients**) |

---

## 3. Run the schema migration

### Option A — Supabase Dashboard (recommended for first run)

1. Dashboard → **SQL Editor** → **+ New query**
2. Paste the entire contents of [`supabase/migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql)
3. Click **Run** (▶)
4. Verify: Dashboard → **Table Editor** — you should see all 6 tables

### Option B — Supabase CLI

```bash
# Install the CLI (if not already installed)
npm install -g supabase

# Login
supabase login

# Link to your project (get the project ref from Dashboard → General Settings)
supabase link --project-ref <your-project-ref>

# Push the migration
supabase db push
```

> **What the migration creates:**
> - **5 custom enums**: `user_role`, `complaint_priority`, `complaint_status`, `verification_status`, `admin_resolution_status`
> - **6 tables**: `profiles`, `departments`, `complaints`, `complaint_verification`, `resolutions`, `feedback`
> - **2 triggers**: auto-create profile on signup, auto-update `updated_at`
> - **4 admin views**: `complaint_statistics`, `complaints_by_category`, `complaints_by_status`, `complaints_by_priority`
> - **15+ indexes** for query performance
> - **Row Level Security (RLS)** policies for CITIZEN, FIELD_WORKER, ADMIN roles
> - **6 department rows** seeded (Roads, Sanitation, Electrical, Drainage, Water, General Civic)

---

## 4. Configure Storage Buckets

In Dashboard → **Storage** → **New bucket**, create these three buckets:

| Bucket name | Public | Purpose |
|---|---|---|
| `complaint-images` | ✅ Yes | Complaint photo uploads |
| `resolution-images` | ❌ No | Before/after resolution photos |
| `profile-images` | ✅ Yes | User profile avatars |

### Storage Policies

Set these policies in **Storage → [bucket] → Policies**:

**`complaint-images`** (public read):
```sql
-- INSERT: authenticated users
CREATE POLICY "complaint_images_upload" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- SELECT: anyone (public)
CREATE POLICY "complaint_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'complaint-images');
```

**`resolution-images`** (private):
```sql
-- INSERT: field workers and admins only
CREATE POLICY "resolution_images_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resolution-images'
    AND auth.role() = 'authenticated'
  );

-- SELECT: file owner or admin
CREATE POLICY "resolution_images_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resolution-images'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR get_my_role() = 'ADMIN')
  );
```

**`profile-images`** (public read, own-folder write):
```sql
CREATE POLICY "profile_images_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');
```

---

## 5. Configure environment variables

Copy the example env file and fill in your values:

```bash
cd tensorvisonforce/backend
cp .env.example .env
```

Edit `.env`:

```env
# ── Supabase ─────────────────────────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=complaint-images

# ── JWT ────────────────────────────────────────────────────────────────────────
JWT_SECRET_KEY=a-very-long-random-secret-at-least-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ── App ────────────────────────────────────────────────────────────────────────
ENV=development
DEBUG=true

# ── SLA hours (by priority) ───────────────────────────────────────────────────
SLA_HOURS_HIGH=24
SLA_HOURS_MEDIUM=48
SLA_HOURS_LOW=72

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

---

## 6. Load demo seed data (optional)

The seed file contains 10 realistic complaints, AI verification results, one resolved case, and feedback.

> ⚠️ **IMPORTANT**: The seed uses placeholder UUIDs for users. Before running, you must either:
> - Create real users via Supabase Auth (Dashboard → Authentication → Users → Add user), then replace the placeholder UUIDs in `seed.sql`
> - **OR** — for dev only — insert directly into `auth.users` if you have superuser/direct DB access

Once UUIDs are replaced:

```bash
# Via Dashboard: SQL Editor → paste seed.sql contents → Run

# Via CLI (if linked):
psql "postgresql://postgres:<your-db-password>@db.<your-project-ref>.supabase.co:5432/postgres" \
  < supabase/seed.sql
```

**Placeholder UUIDs to replace:**

| Placeholder | Role | Demo name |
|---|---|---|
| `00000000-0000-0000-0000-000000000001` | CITIZEN | Riya Sharma |
| `00000000-0000-0000-0000-000000000002` | CITIZEN | Arjun Mehta |
| `00000000-0000-0000-0000-000000000010` | FIELD_WORKER | Kavya Nair |
| `00000000-0000-0000-0000-000000000011` | FIELD_WORKER | Rahul Das |
| `00000000-0000-0000-0000-000000000020` | ADMIN | Admin Officer |

---

## 7. Start the backend

```bash
cd tensorvisonforce/backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

| Endpoint | URL |
|---|---|
| Interactive API docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health check | http://localhost:8000/health |
| OpenAPI JSON | http://localhost:8000/openapi.json |

---

## 8. Run the test suite

Tests do **not** require a live Supabase project — they use in-memory fakes.

```bash
cd tensorvisonforce/backend
pytest -v
```

---

## 9. Database schema overview

```
auth.users (Supabase Auth, managed)
     │
     ├── profiles          (role, phone — auto-created by trigger)
     │
     ├── complaints        (core record — complaint_code, status, priority, etc.)
     │      ├── complaint_verification  (AI pipeline results)
     │      ├── resolutions             (field worker before/after evidence)
     │      └── feedback               (citizen post-resolution rating)
     │
     └── departments       (routing target for each complaint category)
```

### Status lifecycle

```
SUBMITTED → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED
                ↑                        ↑↓              ↓
             (re-unassign)          (hand-off)    REWORK_REQUIRED
                                                        ↓
                                                  IN_PROGRESS (rework begins)
```

### Role access matrix

| Resource | CITIZEN | FIELD_WORKER | ADMIN |
|---|---|---|---|
| Own profile | R/W | R/W | R/W/D |
| All profiles | ✗ | ✗ | ✅ |
| Own complaints | R/W/D | ✗ | ✅ |
| Assigned complaints | ✗ | R/W | ✅ |
| All complaints | ✗ | ✗ | ✅ |
| Departments | R | R | R/W |
| Verification | R (own) | R (assigned) | ✅ |
| Resolutions | R (own) | R/W (own) | ✅ |
| Feedback | R/W (own) | R (assigned) | ✅ |

---

## 10. Troubleshooting

| Problem | Solution |
|---|---|
| `extension "uuid-ossp" already exists` | Ignore — the migration is idempotent |
| `relation "auth.users" does not exist` | Run migration in Supabase SQL Editor, not a plain Postgres instance |
| RLS blocks all rows | Make sure you are passing the JWT in the `Authorization: Bearer <token>` header |
| `generate_complaint_code` not found | The function must be created before the `complaints` table — run the full migration file, not partial sections |
| Storage upload fails | Ensure the bucket exists and the storage policy allows authenticated uploads |
| Seed fails with FK violation | Create auth.users rows first, then update seed.sql UUIDs before running |
