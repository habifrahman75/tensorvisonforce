-- ============================================================================
-- CivicPulse  --  Initial Schema Migration  v001
-- Supabase PostgreSQL
-- Run in: Supabase Dashboard -> SQL Editor  (or via supabase db push)
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
    'SUBMITTED',
    'VERIFIED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'REWORK_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'PENDING', 'VERIFIED', 'REQUIRES_REVIEW', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE admin_resolution_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- HELPER FUNCTION: generate human-readable complaint code CMP-YYYY-XXXXXX
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_complaint_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  seq_part  TEXT;
  new_code  TEXT;
  attempts  INT := 0;
BEGIN
  year_part := to_char(now() AT TIME ZONE 'UTC', 'YYYY');
  LOOP
    seq_part := lpad(floor(random() * 999999 + 1)::BIGINT::TEXT, 6, '0');
    new_code := 'CMP-' || year_part || '-' || seq_part;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM complaints WHERE complaint_code = new_code
    );
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate unique complaint_code after 20 attempts';
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

-- ============================================================================
-- TABLE: profiles
--   One-to-one with auth.users; extended via trigger on user creation.
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

COMMENT ON TABLE profiles IS
  'Application user profiles, extended one-to-one from auth.users.';

-- ============================================================================
-- TABLE: departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE departments IS
  'Municipal departments responsible for handling complaint categories.';

-- ============================================================================
-- TABLE: complaints
-- ============================================================================
CREATE TABLE IF NOT EXISTS complaints (
  id                  UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_code      TEXT               NOT NULL UNIQUE DEFAULT generate_complaint_code(),
  citizen_id          UUID               NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title               TEXT               NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
  description         TEXT               NOT NULL CHECK (char_length(description) BETWEEN 10 AND 3000),
  category            TEXT               NOT NULL,
  priority            complaint_priority NOT NULL DEFAULT 'LOW',
  status              complaint_status   NOT NULL DEFAULT 'SUBMITTED',
  department_id       UUID               REFERENCES departments(id) ON DELETE SET NULL,
  assigned_worker_id  UUID               REFERENCES auth.users(id) ON DELETE SET NULL,
  latitude            DOUBLE PRECISION   NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
  longitude           DOUBLE PRECISION   NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  image_url           TEXT,
  enhanced_image_url  TEXT,
  created_at          TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ        NOT NULL DEFAULT now(),
  deadline            TIMESTAMPTZ
);

COMMENT ON TABLE  complaints             IS 'Core complaint records submitted by citizens.';
COMMENT ON COLUMN complaints.complaint_code IS 'Human-readable ID, e.g. CMP-2026-001024.';
COMMENT ON COLUMN complaints.deadline       IS 'SLA deadline derived from priority at submission time.';

-- ============================================================================
-- TABLE: complaint_verification
--   Stores AI pipeline analysis: image quality, GPS check, classification,
--   duplicate detection, and suspicion scoring.
-- ============================================================================
CREATE TABLE IF NOT EXISTS complaint_verification (
  id                    UUID                NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  complaint_id          UUID                NOT NULL UNIQUE
                          REFERENCES complaints(id) ON DELETE CASCADE,
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

COMMENT ON TABLE complaint_verification IS
  'AI pipeline analysis results — image quality, duplicates, suspicion — for each complaint.';

-- ============================================================================
-- TABLE: resolutions
--   Evidence submitted by a field worker after completing work.
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

COMMENT ON TABLE resolutions IS
  'Resolution evidence (before/after images, notes) submitted by field workers.';

-- ============================================================================
-- TABLE: feedback
--   Post-resolution citizen feedback and satisfaction rating.
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

COMMENT ON TABLE feedback IS
  'Post-resolution citizen satisfaction ratings. If resolved_confirmed=FALSE, triggers rework.';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- complaints — the most-queried table
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
-- TRIGGER: auto-maintain updated_at
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
-- TRIGGER: auto-create profile row when an auth.users row is inserted
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'CITIZEN'
    )
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
-- ADMIN DASHBOARD VIEWS
-- ============================================================================

-- complaint_statistics: single-row overview
CREATE OR REPLACE VIEW complaint_statistics AS
SELECT
  COUNT(*)                                                   AS total,
  COUNT(*) FILTER (WHERE status = 'SUBMITTED')               AS submitted,
  COUNT(*) FILTER (WHERE status = 'VERIFIED')                AS verified,
  COUNT(*) FILTER (WHERE status = 'ASSIGNED')                AS assigned,
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')             AS in_progress,
  COUNT(*) FILTER (WHERE status = 'RESOLVED')                AS resolved,
  COUNT(*) FILTER (WHERE status = 'REWORK_REQUIRED')         AS rework_required,
  COUNT(*) FILTER (
    WHERE deadline < now()
      AND status NOT IN ('RESOLVED', 'REWORK_REQUIRED')
  )                                                          AS sla_breached
FROM complaints;

COMMENT ON VIEW complaint_statistics IS
  'Single-row high-level complaint KPIs for the admin dashboard.';

-- complaints_by_category
CREATE OR REPLACE VIEW complaints_by_category AS
SELECT
  category,
  COUNT(*)                                    AS total,
  COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'RESOLVED') / NULLIF(COUNT(*), 0),
    1
  )                                           AS resolution_pct
FROM complaints
GROUP BY category
ORDER BY total DESC;

COMMENT ON VIEW complaints_by_category IS
  'Complaint breakdown by AI-assigned category with resolution percentage.';

-- complaints_by_status
CREATE OR REPLACE VIEW complaints_by_status AS
SELECT
  status::TEXT AS status,
  COUNT(*)     AS total
FROM complaints
GROUP BY status
ORDER BY total DESC;

COMMENT ON VIEW complaints_by_status IS
  'Complaint counts grouped by current workflow status.';

-- complaints_by_priority
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

COMMENT ON VIEW complaints_by_priority IS
  'Complaint counts and SLA-overdue counts grouped by priority tier.';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints            ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback              ENABLE ROW LEVEL SECURITY;

-- Helper: get the calling user's role without recursion inside RLS
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- -------------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all"   ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_my_role() = 'ADMIN');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (get_my_role() = 'ADMIN');

-- -------------------------------------------------------------------
-- departments  (read: all authenticated; write: admin only)
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "departments_read_all"  ON departments;
DROP POLICY IF EXISTS "departments_admin_all" ON departments;

CREATE POLICY "departments_read_all" ON departments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "departments_admin_all" ON departments
  FOR ALL USING (get_my_role() = 'ADMIN');

-- -------------------------------------------------------------------
-- complaints
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "complaints_citizen_select" ON complaints;
DROP POLICY IF EXISTS "complaints_citizen_insert" ON complaints;
DROP POLICY IF EXISTS "complaints_worker_select"  ON complaints;
DROP POLICY IF EXISTS "complaints_worker_update"  ON complaints;
DROP POLICY IF EXISTS "complaints_admin_all"      ON complaints;

-- Citizens: own complaints only
CREATE POLICY "complaints_citizen_select" ON complaints
  FOR SELECT USING (citizen_id = auth.uid() AND get_my_role() = 'CITIZEN');

CREATE POLICY "complaints_citizen_insert" ON complaints
  FOR INSERT WITH CHECK (citizen_id = auth.uid() AND get_my_role() = 'CITIZEN');

-- Field workers: complaints assigned to them
CREATE POLICY "complaints_worker_select" ON complaints
  FOR SELECT
  USING (assigned_worker_id = auth.uid() AND get_my_role() = 'FIELD_WORKER');

CREATE POLICY "complaints_worker_update" ON complaints
  FOR UPDATE
  USING (assigned_worker_id = auth.uid() AND get_my_role() = 'FIELD_WORKER');

-- Admins: full access
CREATE POLICY "complaints_admin_all" ON complaints
  FOR ALL USING (get_my_role() = 'ADMIN');

-- -------------------------------------------------------------------
-- complaint_verification
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "cv_citizen_select" ON complaint_verification;
DROP POLICY IF EXISTS "cv_worker_select"  ON complaint_verification;
DROP POLICY IF EXISTS "cv_admin_all"      ON complaint_verification;

CREATE POLICY "cv_citizen_select" ON complaint_verification
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_verification.complaint_id
        AND c.citizen_id = auth.uid()
    )
  );

CREATE POLICY "cv_worker_select" ON complaint_verification
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_verification.complaint_id
        AND c.assigned_worker_id = auth.uid()
    )
  );

CREATE POLICY "cv_admin_all" ON complaint_verification
  FOR ALL USING (get_my_role() = 'ADMIN');

-- -------------------------------------------------------------------
-- resolutions
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "resolutions_worker_own"   ON resolutions;
DROP POLICY IF EXISTS "resolutions_citizen_read" ON resolutions;
DROP POLICY IF EXISTS "resolutions_admin_all"    ON resolutions;

-- Workers: full access to their own resolution rows
CREATE POLICY "resolutions_worker_own" ON resolutions
  FOR ALL USING (worker_id = auth.uid() AND get_my_role() = 'FIELD_WORKER');

-- Citizens: read resolutions on their own complaints
CREATE POLICY "resolutions_citizen_read" ON resolutions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = resolutions.complaint_id
        AND c.citizen_id = auth.uid()
    )
  );

CREATE POLICY "resolutions_admin_all" ON resolutions
  FOR ALL USING (get_my_role() = 'ADMIN');

-- -------------------------------------------------------------------
-- feedback
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "feedback_citizen_own"  ON feedback;
DROP POLICY IF EXISTS "feedback_worker_read"  ON feedback;
DROP POLICY IF EXISTS "feedback_admin_all"    ON feedback;

-- Citizens: own feedback rows
CREATE POLICY "feedback_citizen_own" ON feedback
  FOR ALL USING (citizen_id = auth.uid() AND get_my_role() = 'CITIZEN');

-- Workers: read feedback on their assigned complaints
CREATE POLICY "feedback_worker_read" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = feedback.complaint_id
        AND c.assigned_worker_id = auth.uid()
    )
  );

CREATE POLICY "feedback_admin_all" ON feedback
  FOR ALL USING (get_my_role() = 'ADMIN');

-- ============================================================================
-- STORAGE BUCKET NOTES
-- ============================================================================
-- Create these three buckets in Supabase Dashboard > Storage > New Bucket:
--
--   complaint-images    public  = true
--   resolution-images   public  = false
--   profile-images      public  = true
--
-- Storage policies (set per-bucket in Dashboard > Storage > [bucket] > Policies):
--
--   complaint-images:
--     INSERT: authenticated users only
--     SELECT: public (anyone)
--
--   resolution-images:
--     INSERT: FIELD_WORKER and ADMIN
--     SELECT: worker (own folder), ADMIN, CITIZEN (own complaint folder)
--
--   profile-images:
--     INSERT: authenticated (own uid/ prefix)
--     SELECT: public
-- ============================================================================

-- ============================================================================
-- DEPARTMENT SEED DATA
-- ============================================================================
INSERT INTO departments (name, description) VALUES
  ('Roads Department',
   'Handles road damage, potholes, and highway maintenance'),
  ('Sanitation Department',
   'Manages garbage collection, waste disposal, and cleanliness'),
  ('Electrical Department',
   'Responsible for streetlights and public electrical infrastructure'),
  ('Drainage Department',
   'Oversees stormwater drains, sewage channels, and waterlogging issues'),
  ('Water Department',
   'Manages municipal water supply pipelines and distribution networks'),
  ('General Civic Department',
   'Handles miscellaneous civic issues not covered by specialised departments')
ON CONFLICT (name) DO NOTHING;
