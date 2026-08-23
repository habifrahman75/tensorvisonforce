# CivicPulse — Supabase Database

This folder contains the complete database layer for the CivicPulse (Hackspora 2.0) prototype: schema, RLS policies, storage bucket policies, helper functions/triggers, admin dashboard views, and demo seed data.

- `migrations/001_initial_schema.sql` — schema, RLS, storage policies, triggers, views, department seed data.
- `seed.sql` — 5 demo accounts + 12 demo complaints (run once, after the migration).

Both files were executed end-to-end against a real PostgreSQL 16 instance (with `auth`/`storage` schemas stubbed to mirror Supabase) to confirm they run without errors and that the RLS policies behave correctly under role-scoped sessions — not just reviewed by eye. See the "Migration notes" comment block at the bottom of `001_initial_schema.sql` for the specific bugs that testing caught and fixed. That said, it has **not** been run against a live Supabase project yet — do a first run on a free/staging Supabase project before trusting it for a demo.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick an organization, name it `civicpulse` (or similar), set a strong database password (save it — you'll need it for direct `psql` access if you ever want it), pick the region closest to you.
3. Wait ~2 minutes for provisioning.
4. Once ready, go to **Project Settings → API** and note down:
   - **Project URL** → this is `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public key** → this is `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → this is `SUPABASE_SERVICE_ROLE_KEY` (⚠️ backend-only, never ships to the frontend)

## 2. Run the SQL

**Recommended: Supabase Dashboard SQL Editor**
1. Open your project → **SQL Editor** → **New query**.
2. Paste the full contents of `migrations/001_initial_schema.sql` → **Run**.
3. Open a new query, paste the full contents of `seed.sql` → **Run**.

**Alternative: Supabase CLI**
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push          # applies migrations/001_initial_schema.sql
psql "<connection-string-from-project-settings>" -f supabase/seed.sql
```

Both files are plain SQL — no CLI-specific syntax — so either path works.

**Re-running:** `001_initial_schema.sql` is idempotent (safe to run again — it uses `IF NOT EXISTS` / `DROP ... IF EXISTS` / `ON CONFLICT DO NOTHING` throughout). `seed.sql` is a **one-shot** script — the demo accounts are idempotent (`ON CONFLICT DO NOTHING`), but the 12 demo complaints use fixed IDs without an `ON CONFLICT` clause, so re-running it against a database that already has the seed data will fail on a duplicate-key error. Run it once against a fresh database.

## 3. Storage buckets

`001_initial_schema.sql` already creates all three buckets and their policies **automatically** via SQL (`INSERT INTO storage.buckets ...` + `CREATE POLICY ... ON storage.objects`), so no manual dashboard step is required. After running the migration, check **Storage** in the dashboard — you should see:

| Bucket | Public | Purpose |
|---|---|---|
| `complaint-images` | Yes | Citizen-uploaded complaint photos |
| `resolution-images` | No | Worker-uploaded before/after proof |
| `profile-images` | Yes | User avatars |

If you ever need to recreate a bucket by hand instead: **Storage → New bucket**, set the name and public/private flag exactly as above, then re-run just the `CREATE POLICY` statements for that bucket from the migration.

**Upload path convention** (the storage policies rely on this — the frontend/backend must follow it):
- `complaint-images/{citizen_id}/{filename}`
- `resolution-images/{complaint_id}/{before|after}-{filename}`
- `profile-images/{user_id}/{filename}`

## 4. Environment variables

**Frontend** (`.env`, never committed):
```
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

**Backend** (`.env`, never committed):
```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ALLOWED_ORIGINS=http://localhost:5173
```

Add `.env` to `.gitignore` in both `frontend/` and `backend/` (already present in this project). The service-role key must only ever be read by the FastAPI backend — it bypasses RLS entirely, so it should never reach the browser.

## 5. How RLS works here

Row Level Security is enabled on every table. Two helper functions make the policies readable:

- `auth.uid()` — the calling user's ID, supplied automatically by Supabase from the request's JWT.
- `get_my_role()` — a `SECURITY DEFINER` function that looks up the caller's role from `profiles`, so policies can say `get_my_role() = 'ADMIN'` without recursively querying `profiles` under its own RLS.

Role summary (see the policy comments in the migration for exact SQL):

| Table | Citizen | Field worker | Admin |
|---|---|---|---|
| `complaints` | SELECT/INSERT own | SELECT/UPDATE where assigned | full access |
| `complaint_verification` | SELECT for own complaints | SELECT for assigned complaints | full access |
| `resolutions` | SELECT for own complaints | INSERT own (only while `IN_PROGRESS`, forced `admin_status='PENDING'`) + SELECT own | full access, incl. `admin_status` |
| `feedback` | INSERT/SELECT own, only while complaint is `RESOLVED` | SELECT for assigned complaints | full access |
| `departments` | SELECT (any authenticated user) | SELECT | full access |
| `profiles` | SELECT/UPDATE own | SELECT/UPDATE own | full access |

Two things worth calling out because they weren't obvious from the spec and testing surfaced them:

1. **Worker self-approval is blocked at the database level.** A field worker can `INSERT` a resolution but the `WITH CHECK` clause forces `admin_status = 'PENDING'` on that insert and grants no `UPDATE` policy at all — so a worker cannot write `admin_status = 'APPROVED'` themselves, even with a direct authenticated Supabase call. Only the admin's `FOR ALL` policy can change `admin_status`.
2. **A database-level trigger (`trg_validate_status_transition`) enforces the complaint status state machine**, independent of RLS and independent of whatever the FastAPI backend does. This means "no invalid status transitions" holds even if something calls Supabase directly and skips the backend entirely. Two more triggers keep `complaints.status` in sync with real events automatically: admin-approving a resolution moves the complaint to `RESOLVED`, and citizen feedback with `resolved_confirmed = false` moves it to `REWORK_REQUIRED`.

RLS is the last line of defense, not the only one — the FastAPI backend (using the service-role key, which bypasses RLS) should still check roles and valid transitions itself before writing. RLS exists so that a compromised or buggy frontend calling Supabase directly still can't do anything it shouldn't.

## 6. Demo accounts (from `seed.sql`)

All use password `Demo@1234`.

| Email | Role |
|---|---|
| `citizen.asha@civicpulse.demo` | CITIZEN |
| `citizen.rahul@civicpulse.demo` | CITIZEN |
| `admin@civicpulse.demo` | ADMIN |
| `worker.suresh@civicpulse.demo` | FIELD_WORKER |
| `worker.kavya@civicpulse.demo` | FIELD_WORKER |

The seed data includes 12 complaints spanning all 6 statuses, all 3 priorities, 7 categories, 2 duplicate pairs (4 complaints flagged `potential_duplicate = true`), 1 resolved complaint with positive feedback, and 1 complaint that was resolved and then rejected by the citizen (now `REWORK_REQUIRED`) — useful for demoing every screen state without manually walking the whole flow first.
