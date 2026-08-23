-- ============================================================================
-- CivicPulse  --  Initial Schema Migration
-- Supabase PostgreSQL
-- Run in: Supabase Dashboard -> SQL Editor  (or `supabase db push`)
--
-- Verified by executing this file end-to-end against a real PostgreSQL 16
-- instance with a local stub of Supabase's `auth`/`storage` schemas, plus
-- role-scoped RLS scenario tests (citizen isolation, worker self-approval
-- attempt, status-transition guard, admin-approval / feedback-rejection
-- sync triggers). See migration notes at the bottom of this file.
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('CITIZEN', 'ADMIN', 'FIELD_WORKER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE complaint_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM (
    'SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS',
    'RESOLVED', 'REWORK_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'REQUIRES_REVIEW', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE admin_resolution_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- HELPER: complaint code generator  CMP-YYYY-XXXXXX
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_complaint_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  year_part TEXT;
  seq_part  TEXT;
  new_code  TEXT;
  attempts  INT := 0;
BEGIN
  year_part := to_char(now() AT TIME ZONE 'UTC', 'YYYY');
  LOOP
    seq_part := lpad(floor(random() * 999999 + 1)::TEXT, 6, '0');
    new_code := 'CMP-' || year_part || '-' || seq_part;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM complaints WHERE complaint_code = new_code
    );
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate unique complaint code after 20 attempts';
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

-- ============================================================================
-- TABLE: profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  role        user_role   NOT NULL DEFAULT 'CITIZEN',
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Application user profiles, one-to-one with auth.users.';

-- ============================================================================
-- TABLE: departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE departments IS 'Municipal departments that handle complaint categories.';

-- ============================================================================
-- TABLE: complaints
-- ============================================================================
CREATE TABLE IF NOT EXISTS complaints (
  id                   UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_code       TEXT               NOT NULL UNIQUE DEFAULT generate_complaint_code(),
  citizen_id           UUID               NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title                TEXT               NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  description          TEXT               NOT NULL CHECK (char_length(description) BETWEEN 10 AND 3000),
  category             TEXT               NOT NULL,
  priority             complaint_priority  NOT NULL DEFAULT 'LOW',
  status               complaint_status    NOT NULL DEFAULT 'SUBMITTED',
  department_id        UUID               REFERENCES departments(id) ON DELETE SET NULL,
  assigned_worker_id   UUID               REFERENCES auth.users(id) ON DELETE SET NULL,
  latitude             DOUBLE PRECISION   NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
  longitude            DOUBLE PRECISION   NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  image_url            TEXT,
  enhanced_image_url   TEXT,
  created_at           TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ        NOT NULL DEFAULT now(),
  deadline             TIMESTAMPTZ
);

COMMENT ON TABLE  complaints IS 'Core complaint records submitted by citizens.';
COMMENT ON COLUMN complaints.complaint_code IS 'Human-readable ID, e.g. CMP-2026-001024.';
COMMENT ON COLUMN complaints.deadline       IS 'SLA deadline computed from priority at submission.';

-- ============================================================================
-- TABLE: complaint_verification
-- ============================================================================
CREATE TABLE IF NOT EXISTS complaint_verification (
  id                    UUID                NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  complaint_id          UUID                NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
  image_quality         TEXT,
  resolution_width      INTEGER,
  resolution_height     INTEGER,
  blur_score            DOUBLE PRECISION,
  brightness_score      DOUBLE PRECISION,
  gps_verified          BOOLEAN             NOT NULL DEFAULT FALSE,
  ai_category           TEXT,
  ai_confidence         DOUBLE PRECISION,
  duplicate_score       DOUBLE PRECISION,
  potential_duplicate   BOOLEAN             NOT NULL DEFAULT FALSE,
  suspicion_level       TEXT                NOT NULL DEFAULT 'LOW'
                          CHECK (suspicion_level IN ('LOW', 'MEDIUM', 'HIGH')),
  verification_required BOOLEAN             NOT NULL DEFAULT FALSE,
  verification_status   verification_status NOT NULL DEFAULT 'PENDING',
  verification_notes    TEXT,
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT now()
);

COMMENT ON TABLE complaint_verification IS 'AI pipeline analysis results for each complaint.';

-- ============================================================================
-- TABLE: resolutions
-- ============================================================================
CREATE TABLE IF NOT EXISTS resolutions (
  id               UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id     UUID                    NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  worker_id        UUID                    NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  before_image_url TEXT,
  after_image_url  TEXT,
  resolution_note  TEXT,
  submitted_at     TIMESTAMPTZ             NOT NULL DEFAULT now(),
  admin_status     admin_resolution_status NOT NULL DEFAULT 'PENDING',
  admin_note       TEXT,
  verified_at      TIMESTAMPTZ
);

COMMENT ON TABLE resolutions IS 'Resolution evidence submitted by field workers.';

-- ============================================================================
-- TABLE: feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id       UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  citizen_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  resolved_confirmed BOOLEAN     NOT NULL DEFAULT TRUE,
  rating             INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment            TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE feedback IS 'Post-resolution citizen feedback and satisfaction rating.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- complaints
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id    ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_department_id ON complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_worker_id     ON complaints(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status        ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority      ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_category      ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at    ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_location      ON complaints(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_complaints_deadline      ON complaints(deadline)
  WHERE status NOT IN ('RESOLVED', 'REWORK_REQUIRED');

-- complaint_verification
CREATE INDEX IF NOT EXISTS idx_cv_complaint_id        ON complaint_verification(complaint_id);
CREATE INDEX IF NOT EXISTS idx_cv_potential_duplicate ON complaint_verification(potential_duplicate)
  WHERE potential_duplicate = TRUE;
CREATE INDEX IF NOT EXISTS idx_cv_verification_status ON complaint_verification(verification_status);

-- feedback
CREATE INDEX IF NOT EXISTS idx_feedback_complaint_id ON feedback(complaint_id);
CREATE INDEX IF NOT EXISTS idx_feedback_citizen_id   ON feedback(citizen_id);

-- resolutions
CREATE INDEX IF NOT EXISTS idx_resolutions_complaint_id ON resolutions(complaint_id);
CREATE INDEX IF NOT EXISTS idx_resolutions_worker_id    ON resolutions(worker_id);

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_updated_at ON complaints;
CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- TRIGGER: auto-create profile on auth.users insert
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CITIZEN')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- TRIGGER: complaint status transition guard
-- Enforces the workflow state machine at the DATABASE level so it cannot be
-- bypassed even by a direct authenticated Supabase client call (defense in
-- depth alongside RLS and the backend's own state-machine checks).
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_complaint_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  allowed TEXT[];
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  allowed := CASE OLD.status::TEXT
    WHEN 'SUBMITTED'       THEN ARRAY['VERIFIED']
    WHEN 'VERIFIED'        THEN ARRAY['ASSIGNED']
    WHEN 'ASSIGNED'        THEN ARRAY['IN_PROGRESS']
    WHEN 'IN_PROGRESS'     THEN ARRAY['RESOLVED']
    WHEN 'RESOLVED'        THEN ARRAY['REWORK_REQUIRED']
    WHEN 'REWORK_REQUIRED' THEN ARRAY['ASSIGNED', 'IN_PROGRESS']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (NEW.status::TEXT = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid complaint status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_status_transition ON complaints;
CREATE TRIGGER trg_validate_status_transition
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION validate_complaint_status_transition();

-- ============================================================================
-- TRIGGER: admin resolution approval -> complaint RESOLVED
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_status_on_resolution_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.admin_status = 'APPROVED' AND OLD.admin_status IS DISTINCT FROM 'APPROVED' THEN
    UPDATE complaints SET status = 'RESOLVED'
    WHERE id = NEW.complaint_id AND status = 'IN_PROGRESS';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolution_approval_sync ON resolutions;
CREATE TRIGGER trg_resolution_approval_sync
  AFTER UPDATE ON resolutions
  FOR EACH ROW EXECUTE FUNCTION sync_status_on_resolution_approval();

-- ============================================================================
-- TRIGGER: citizen rejects resolution (feedback.resolved_confirmed = false)
-- -> complaint REWORK_REQUIRED
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_status_on_feedback()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.resolved_confirmed = FALSE THEN
    UPDATE complaints SET status = 'REWORK_REQUIRED'
    WHERE id = NEW.complaint_id AND status = 'RESOLVED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_status_sync ON feedback;
CREATE TRIGGER trg_feedback_status_sync
  AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION sync_status_on_feedback();

-- ============================================================================
-- ADMIN DASHBOARD VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW complaint_statistics AS
SELECT
  COUNT(*)                                                    AS total,
  COUNT(*) FILTER (WHERE status = 'SUBMITTED')                AS submitted,
  COUNT(*) FILTER (WHERE status = 'VERIFIED')                 AS verified,
  COUNT(*) FILTER (WHERE status = 'ASSIGNED')                 AS assigned,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')              AS in_progress,
  COUNT(*) FILTER (WHERE status = 'RESOLVED')                 AS resolved,
  COUNT(*) FILTER (WHERE status = 'REWORK_REQUIRED')          AS rework_required,
  COUNT(*) FILTER (
    WHERE deadline < now()
      AND status NOT IN ('RESOLVED', 'REWORK_REQUIRED')
  )                                                           AS sla_breached
FROM complaints;

CREATE OR REPLACE VIEW complaints_by_category AS
SELECT
  category,
  COUNT(*)                                     AS total,
  COUNT(*) FILTER (WHERE status = 'RESOLVED')  AS resolved,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'RESOLVED') / NULLIF(COUNT(*), 0),
    1
  )                                            AS resolution_pct
FROM complaints
GROUP BY category
ORDER BY total DESC;

CREATE OR REPLACE VIEW complaints_by_status AS
SELECT
  status::TEXT AS status,
  COUNT(*)     AS total
FROM complaints
GROUP BY status
ORDER BY total DESC;

CREATE OR REPLACE VIEW complaints_by_priority AS
SELECT
  priority::TEXT AS priority,
  COUNT(*)       AS total,
  COUNT(*) FILTER (
    WHERE deadline < now()
      AND status NOT IN ('RESOLVED', 'REWORK_REQUIRED')
  )              AS overdue
FROM complaints
GROUP BY priority
ORDER BY
  CASE priority::TEXT WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints             ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback               ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments            ENABLE ROW LEVEL SECURITY;

-- helper: fetch caller's role without recursion
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- profiles
DROP POLICY IF EXISTS "profiles_select_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all"   ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() = 'ADMIN');
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (get_my_role() = 'ADMIN');

-- departments (read by all authenticated; write by admin)
DROP POLICY IF EXISTS "departments_read_all"  ON departments;
DROP POLICY IF EXISTS "departments_admin_all" ON departments;

CREATE POLICY "departments_read_all" ON departments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "departments_admin_all" ON departments
  FOR ALL USING (get_my_role() = 'ADMIN');

-- complaints
DROP POLICY IF EXISTS "complaints_citizen_select" ON complaints;
DROP POLICY IF EXISTS "complaints_citizen_insert" ON complaints;
DROP POLICY IF EXISTS "complaints_worker_select"  ON complaints;
DROP POLICY IF EXISTS "complaints_worker_update"  ON complaints;
DROP POLICY IF EXISTS "complaints_admin_all"      ON complaints;

CREATE POLICY "complaints_citizen_select" ON complaints
  FOR SELECT USING (citizen_id = auth.uid() AND get_my_role() = 'CITIZEN');
CREATE POLICY "complaints_citizen_insert" ON complaints
  FOR INSERT WITH CHECK (citizen_id = auth.uid() AND get_my_role() = 'CITIZEN');
CREATE POLICY "complaints_worker_select"  ON complaints
  FOR SELECT USING (assigned_worker_id = auth.uid() AND get_my_role() = 'FIELD_WORKER');
CREATE POLICY "complaints_worker_update"  ON complaints
  FOR UPDATE USING (assigned_worker_id = auth.uid() AND get_my_role() = 'FIELD_WORKER');
CREATE POLICY "complaints_admin_all" ON complaints
  FOR ALL USING (get_my_role() = 'ADMIN');

-- complaint_verification
DROP POLICY IF EXISTS "cv_citizen_select" ON complaint_verification;
DROP POLICY IF EXISTS "cv_worker_select"  ON complaint_verification;
DROP POLICY IF EXISTS "cv_admin_all"      ON complaint_verification;

CREATE POLICY "cv_citizen_select" ON complaint_verification
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM complaints c WHERE c.id = complaint_verification.complaint_id AND c.citizen_id = auth.uid())
  );
CREATE POLICY "cv_worker_select" ON complaint_verification
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM complaints c WHERE c.id = complaint_verification.complaint_id AND c.assigned_worker_id = auth.uid())
  );
CREATE POLICY "cv_admin_all" ON complaint_verification
  FOR ALL USING (get_my_role() = 'ADMIN');

-- resolutions
-- NOTE: a field worker gets INSERT + SELECT (own rows) ONLY. There is no
-- worker UPDATE policy, and the INSERT is constrained to admin_status =
-- 'PENDING' on their own assigned, IN_PROGRESS complaint. This closes a
-- self-approval hole where a worker could otherwise write admin_status =
-- 'APPROVED' directly and short-circuit admin review. Verified with a live
-- RLS scenario test (see migration notes below).
DROP POLICY IF EXISTS "resolutions_worker_own"    ON resolutions;
DROP POLICY IF EXISTS "resolutions_worker_insert" ON resolutions;
DROP POLICY IF EXISTS "resolutions_worker_select" ON resolutions;
DROP POLICY IF EXISTS "resolutions_citizen_read"  ON resolutions;
DROP POLICY IF EXISTS "resolutions_admin_all"     ON resolutions;

CREATE POLICY "resolutions_worker_insert" ON resolutions
  FOR INSERT WITH CHECK (
    worker_id = auth.uid()
    AND get_my_role() = 'FIELD_WORKER'
    AND admin_status = 'PENDING'
    AND EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = resolutions.complaint_id
        AND c.assigned_worker_id = auth.uid()
        AND c.status = 'IN_PROGRESS'
    )
  );
CREATE POLICY "resolutions_worker_select" ON resolutions
  FOR SELECT USING (worker_id = auth.uid() AND get_my_role() = 'FIELD_WORKER');
CREATE POLICY "resolutions_citizen_read" ON resolutions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM complaints c WHERE c.id = resolutions.complaint_id AND c.citizen_id = auth.uid())
  );
CREATE POLICY "resolutions_admin_all" ON resolutions
  FOR ALL USING (get_my_role() = 'ADMIN');

-- feedback
-- NOTE: restricted to the complaint's OWN citizen, and only while the
-- complaint is RESOLVED (matches spec: "submit feedback for own resolved
-- complaints"). Previously this allowed feedback on a complaint in any
-- status owned by the citizen.
DROP POLICY IF EXISTS "feedback_citizen_own"    ON feedback;
DROP POLICY IF EXISTS "feedback_citizen_insert" ON feedback;
DROP POLICY IF EXISTS "feedback_citizen_select" ON feedback;
DROP POLICY IF EXISTS "feedback_worker_read"    ON feedback;
DROP POLICY IF EXISTS "feedback_admin_all"      ON feedback;

CREATE POLICY "feedback_citizen_insert" ON feedback
  FOR INSERT WITH CHECK (
    citizen_id = auth.uid()
    AND get_my_role() = 'CITIZEN'
    AND EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = feedback.complaint_id
        AND c.citizen_id = auth.uid()
        AND c.status = 'RESOLVED'
    )
  );
CREATE POLICY "feedback_citizen_select" ON feedback
  FOR SELECT USING (citizen_id = auth.uid() AND get_my_role() = 'CITIZEN');
CREATE POLICY "feedback_worker_read" ON feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM complaints c WHERE c.id = feedback.complaint_id AND c.assigned_worker_id = auth.uid())
  );
CREATE POLICY "feedback_admin_all" ON feedback
  FOR ALL USING (get_my_role() = 'ADMIN');

-- ============================================================================
-- STORAGE BUCKETS + POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('complaint-images',  'complaint-images',  true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('resolution-images', 'resolution-images', false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('profile-images',    'profile-images',    true,  5242880,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Upload convention (enforced by these policies, must be followed by the app):
--   complaint-images/{citizen_id}/{filename}
--   resolution-images/{complaint_id}/{before|after}-{filename}
--   profile-images/{user_id}/{filename}

-- complaint-images: public read, owner-folder upload, owner-or-admin delete
DROP POLICY IF EXISTS "complaint_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "complaint_images_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "complaint_images_owner_delete" ON storage.objects;

CREATE POLICY "complaint_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'complaint-images');
CREATE POLICY "complaint_images_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'complaint-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "complaint_images_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'complaint-images'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR get_my_role() = 'ADMIN')
  );

-- resolution-images: private. Read = admin, the assigned worker, or the
-- complaint's own citizen. Write = admin or the assigned worker only.
DROP POLICY IF EXISTS "resolution_images_read"                ON storage.objects;
DROP POLICY IF EXISTS "resolution_images_worker_admin_insert" ON storage.objects;

CREATE POLICY "resolution_images_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resolution-images'
    AND (
      get_my_role() = 'ADMIN'
      OR EXISTS (
        SELECT 1 FROM complaints c
        WHERE c.id::text = (storage.foldername(name))[1]
          AND (c.citizen_id = auth.uid() OR c.assigned_worker_id = auth.uid())
      )
    )
  );
CREATE POLICY "resolution_images_worker_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resolution-images'
    AND (
      get_my_role() = 'ADMIN'
      OR (
        get_my_role() = 'FIELD_WORKER'
        AND EXISTS (
          SELECT 1 FROM complaints c
          WHERE c.id::text = (storage.foldername(name))[1]
            AND c.assigned_worker_id = auth.uid()
        )
      )
    )
  );

-- profile-images: public read, own-folder write
DROP POLICY IF EXISTS "profile_images_public_read"       ON storage.objects;
DROP POLICY IF EXISTS "profile_images_own_folder_write"  ON storage.objects;
DROP POLICY IF EXISTS "profile_images_own_folder_update" ON storage.objects;

CREATE POLICY "profile_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');
CREATE POLICY "profile_images_own_folder_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "profile_images_own_folder_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- DEPARTMENT SEED DATA
-- (kept here, not in seed.sql, so departments always exist even if seed.sql
-- is skipped in a production deploy)
-- ============================================================================
INSERT INTO departments (name, description) VALUES
  ('Roads Department',        'Handles road damage, potholes, and highway maintenance'),
  ('Sanitation Department',   'Manages garbage collection, waste disposal, and cleanliness'),
  ('Electrical Department',   'Responsible for streetlights and public electrical infrastructure'),
  ('Drainage Department',     'Oversees stormwater drains, sewage, and waterlogging issues'),
  ('Water Department',        'Manages water supply pipelines and distribution networks'),
  ('General Civic Department','Handles miscellaneous civic issues not covered by other departments')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- MIGRATION NOTES (fixes applied vs. a naive first draft, and why)
-- ============================================================================
-- 1. resolutions RLS was originally `FOR ALL` for the worker's own rows,
--    which let a field worker write admin_status = 'APPROVED' on their own
--    resolution -- i.e. self-approve and skip admin review entirely. Fixed
--    by splitting into INSERT (own row, admin_status forced to 'PENDING',
--    only while the complaint is IN_PROGRESS and assigned to them) + SELECT
--    (own rows). Only the admin policy can write admin_status now.
--    Verified live: an INSERT with admin_status='APPROVED' as the worker
--    now raises "new row violates row-level security policy".
-- 2. feedback RLS originally allowed a citizen to insert feedback for any
--    of their own complaints regardless of status. Spec requires this only
--    for RESOLVED complaints, so the INSERT policy now checks complaint
--    status = 'RESOLVED' via EXISTS.
-- 3. Added a BEFORE UPDATE trigger on complaints validating the status
--    state machine at the database layer (SUBMITTED -> VERIFIED -> ASSIGNED
--    -> IN_PROGRESS -> RESOLVED -> REWORK_REQUIRED -> ASSIGNED/IN_PROGRESS).
--    This closes the gap where "no invalid status transitions" was only
--    enforced by frontend/backend logic; a direct authenticated Supabase
--    call can no longer jump e.g. SUBMITTED straight to RESOLVED. Verified
--    live: such a jump raises "Invalid complaint status transition".
-- 4. Added two sync triggers so the complaint's status follows the actual
--    business events instead of requiring the backend to remember to set
--    it: admin approving a resolution -> complaint RESOLVED; citizen
--    feedback with resolved_confirmed = false -> complaint REWORK_REQUIRED.
--    Both are SECURITY DEFINER because the citizen/worker session doing the
--    triggering INSERT/UPDATE has no direct UPDATE grant on `complaints`.
-- 5. Storage bucket creation and per-bucket RLS policies were previously
--    just comments (not executable). They are now real
--    `INSERT INTO storage.buckets` and `CREATE POLICY ON storage.objects`
--    statements, gated on an upload path convention documented above.
-- 6. This entire file, plus the fixes above, was executed against a real
--    PostgreSQL 16 instance with stubbed `auth.users`, `auth.uid()`,
--    `auth.role()`, `storage.buckets`, `storage.objects`, and
--    `storage.foldername()` (all of which are provided natively by
--    Supabase) to confirm it runs cleanly end-to-end and that the RLS
--    policies behave as intended under actual role-scoped sessions, not
--    just by reading the SQL. It was NOT run against a live Supabase
--    project -- do a first run against a free/staging Supabase project
--    before production use.
-- ============================================================================
