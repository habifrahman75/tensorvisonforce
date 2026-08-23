-- ============================================================================
-- CivicPulse  --  Demo Seed Data
-- ============================================================================
-- IMPORTANT: This seed file uses placeholder UUIDs for users.
-- Before running, either:
--   (a) Create real auth.users via Supabase Auth Dashboard / API, then
--       replace the placeholder UUIDs below with real ones, OR
--   (b) Insert directly into auth.users if you have superuser access (dev only).
--
-- Placeholder UUIDs used:
--   Citizens:  ...0001, ...0002
--   Workers:   ...0010, ...0011
--   Admin:     ...0020
-- ============================================================================

-- ============================================================================
-- PROFILES
-- ============================================================================
INSERT INTO profiles (id, full_name, email, role, phone) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Riya Sharma',    'riya.citizen@demo.civicpulse.in',  'CITIZEN',      '+91-9876543210'),
  ('00000000-0000-0000-0000-000000000002',
   'Arjun Mehta',   'arjun.citizen@demo.civicpulse.in', 'CITIZEN',      '+91-9871234567'),
  ('00000000-0000-0000-0000-000000000010',
   'Kavya Nair',    'kavya.worker@demo.civicpulse.in',  'FIELD_WORKER', '+91-9812345678'),
  ('00000000-0000-0000-0000-000000000011',
   'Rahul Das',     'rahul.worker@demo.civicpulse.in',  'FIELD_WORKER', '+91-9834567890'),
  ('00000000-0000-0000-0000-000000000020',
   'Admin Officer', 'admin@demo.civicpulse.in',          'ADMIN',        '+91-9800000000')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEPARTMENTS (idempotent — also seeded by migration)
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
-- COMPLAINTS  (10 realistic demo complaints)
-- ============================================================================

-- 1. HIGH priority pothole — IN_PROGRESS (assigned to worker)
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  department_id, assigned_worker_id,
  latitude, longitude, image_url,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'CMP-2026-000001',
  '00000000-0000-0000-0000-000000000001',
  'Large dangerous pothole on MG Road',
  'There is a very large and deep pothole near the MG Road bus stop that has already caused a motorcycle accident. Children from the nearby school walk past it daily. Urgent repair is needed before someone is seriously hurt.',
  'pothole', 'HIGH', 'IN_PROGRESS',
  (SELECT id FROM departments WHERE name = 'Roads Department'),
  '00000000-0000-0000-0000-000000000010',
  12.9716, 77.5946,
  'https://placehold.co/800x600/444/white?text=Pothole+MG+Road',
  now() + interval '12 hours',
  now() - interval '2 days',
  now() - interval '1 day'
);

-- 2. MEDIUM priority garbage — VERIFIED
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  department_id,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000002',
  'CMP-2026-000002',
  '00000000-0000-0000-0000-000000000001',
  'Garbage not collected in Jayanagar 4th Block',
  'Garbage has not been collected from Jayanagar 4th Block for over ten days. Bins are overflowing, attracting stray dogs and spreading disease. The stench is unbearable and residents are suffering.',
  'garbage', 'MEDIUM', 'VERIFIED',
  (SELECT id FROM departments WHERE name = 'Sanitation Department'),
  12.9250, 77.5938,
  now() + interval '36 hours',
  now() - interval '3 days',
  now() - interval '2 days'
);

-- 3. LOW priority streetlight — SUBMITTED
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000003',
  'CMP-2026-000003',
  '00000000-0000-0000-0000-000000000002',
  'Streetlight not working on Residency Road',
  'The streetlight outside house number 45 on Residency Road has been non-functional for two weeks. The area is completely dark at night making it unsafe for pedestrians and women returning home late.',
  'streetlight', 'LOW', 'SUBMITTED',
  12.9716, 77.6099,
  now() + interval '72 hours',
  now() - interval '1 day',
  now() - interval '1 day'
);

-- 4. HIGH priority drainage — RESOLVED (used for feedback and resolution testing)
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  department_id, assigned_worker_id,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000004',
  'CMP-2026-000004',
  '00000000-0000-0000-0000-000000000002',
  'Sewage overflow blocking main road near Shivajinagar market',
  'The main drainage channel near Shivajinagar market is completely blocked and overflowing with sewage water. The entire market road is flooded, businesses cannot open, and people are wading through sewage. This is a serious public health hazard.',
  'drainage', 'HIGH', 'RESOLVED',
  (SELECT id FROM departments WHERE name = 'Drainage Department'),
  '00000000-0000-0000-0000-000000000011',
  12.9850, 77.6010,
  now() - interval '1 day',
  now() - interval '5 days',
  now() - interval '6 hours'
);

-- 5. MEDIUM priority water leakage — ASSIGNED
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  department_id, assigned_worker_id,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000005',
  'CMP-2026-000005',
  '00000000-0000-0000-0000-000000000001',
  'Burst water pipe flooding 100 Feet Road Indiranagar',
  'A water supply pipe has burst on 100 Feet Road in Indiranagar. Water is continuously gushing out, flooding the road and wasting thousands of litres per hour. The water supply to six apartment buildings has been cut off.',
  'water_leakage', 'MEDIUM', 'ASSIGNED',
  (SELECT id FROM departments WHERE name = 'Water Department'),
  '00000000-0000-0000-0000-000000000010',
  12.9784, 77.6408,
  now() + interval '20 hours',
  now() - interval '18 hours',
  now() - interval '10 hours'
);

-- 6. LOW priority other — SUBMITTED
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000006',
  'CMP-2026-000006',
  '00000000-0000-0000-0000-000000000002',
  'Broken park bench in Cubbon Park',
  'Several park benches in Cubbon Park near the children play area are broken with protruding nails and splintered wood. Children and elderly visitors are at risk of injury. Immediate repair or replacement is requested.',
  'other', 'LOW', 'SUBMITTED',
  12.9763, 77.5929,
  now() + interval '70 hours',
  now() - interval '12 hours',
  now() - interval '12 hours'
);

-- 7. MEDIUM priority pothole — SUBMITTED (potential duplicate of complaint 1, nearby location)
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000007',
  'CMP-2026-000007',
  '00000000-0000-0000-0000-000000000002',
  'Pothole on MG Road still not fixed — danger to cyclists',
  'There is a large dangerous pothole near the MG Road bus stop. I almost fell off my bicycle this morning. This pothole has been there for weeks and still has not been repaired despite multiple complaints.',
  'pothole', 'MEDIUM', 'SUBMITTED',
  12.9716, 77.5947,
  now() + interval '48 hours',
  now() - interval '6 hours',
  now() - interval '6 hours'
);

-- 8. HIGH priority water — REWORK_REQUIRED (SLA already breached)
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  department_id, assigned_worker_id,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000008',
  'CMP-2026-000008',
  '00000000-0000-0000-0000-000000000001',
  'Fire hydrant leaking heavily on Richmond Road',
  'A fire hydrant on Richmond Road has been leaking heavily for three days, flooding the road and causing traffic diversions. The leak has worsened and water is entering nearby shop basements. Emergency repair needed immediately.',
  'water_leakage', 'HIGH', 'REWORK_REQUIRED',
  (SELECT id FROM departments WHERE name = 'Water Department'),
  '00000000-0000-0000-0000-000000000011',
  12.9590, 77.6010,
  now() - interval '2 days',
  now() - interval '4 days',
  now() - interval '3 hours'
);

-- 9. MEDIUM priority garbage — SUBMITTED (potential duplicate of complaint 2, same area)
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000009',
  'CMP-2026-000009',
  '00000000-0000-0000-0000-000000000002',
  'Garbage bins overflowing near Jayanagar vegetable market',
  'Garbage bins in Jayanagar 4th Block near the vegetable market have not been cleared for over a week. There is a massive pile of rotting organic waste attracting rats, flies, and stray cattle. The health risk to residents is severe.',
  'garbage', 'MEDIUM', 'SUBMITTED',
  12.9251, 77.5939,
  now() + interval '47 hours',
  now() - interval '4 hours',
  now() - interval '4 hours'
);

-- 10. HIGH priority streetlight — VERIFIED (hospital area, public safety risk)
INSERT INTO complaints (
  id, complaint_code, citizen_id,
  title, description, category, priority, status,
  department_id,
  latitude, longitude,
  deadline, created_at, updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000010',
  'CMP-2026-000010',
  '00000000-0000-0000-0000-000000000001',
  'All streetlights out on road leading to Manipal Hospital',
  'All five streetlights on the road leading to Manipal Hospital have been completely non-functional for three nights. Ambulances and patients visiting the hospital at night face serious danger. Exposed wiring is also visible on one pole. This is a public safety emergency requiring urgent attention.',
  'streetlight', 'HIGH', 'VERIFIED',
  (SELECT id FROM departments WHERE name = 'Electrical Department'),
  12.9352, 77.6245,
  now() + interval '8 hours',
  now() - interval '16 hours',
  now() - interval '14 hours'
);

-- ============================================================================
-- COMPLAINT VERIFICATION  (AI pipeline analysis for each complaint)
-- ============================================================================
INSERT INTO complaint_verification (
  complaint_id,
  image_quality, resolution_width, resolution_height,
  blur_score, brightness_score,
  gps_verified,
  ai_category, ai_confidence,
  duplicate_score, potential_duplicate,
  suspicion_level, verification_required, verification_status
) VALUES
  -- 1: good image, high confidence, verified
  ('c0000000-0000-0000-0000-000000000001',
   'good', 1920, 1080, 245.3, 142.0, TRUE,
   'pothole', 0.91, 0.12, FALSE, 'LOW', FALSE, 'VERIFIED'),

  -- 2: acceptable image, high confidence, verified
  ('c0000000-0000-0000-0000-000000000002',
   'acceptable', 1280, 720, 130.5, 118.0, TRUE,
   'garbage', 0.88, 0.08, FALSE, 'LOW', FALSE, 'VERIFIED'),

  -- 3: blurry low-res image, no GPS — requires review
  ('c0000000-0000-0000-0000-000000000003',
   'poor', 640, 480, 42.1, 95.0, FALSE,
   'streetlight', 0.72, 0.15, FALSE, 'MEDIUM', TRUE, 'REQUIRES_REVIEW'),

  -- 4: high quality, resolved
  ('c0000000-0000-0000-0000-000000000004',
   'good', 1920, 1080, 310.8, 155.0, TRUE,
   'drainage', 0.94, 0.06, FALSE, 'LOW', FALSE, 'VERIFIED'),

  -- 5: good image, verified
  ('c0000000-0000-0000-0000-000000000005',
   'good', 1280, 720, 198.2, 148.0, TRUE,
   'water_leakage', 0.89, 0.09, FALSE, 'LOW', FALSE, 'VERIFIED'),

  -- 7: potential duplicate of complaint 1 (nearby pothole)
  ('c0000000-0000-0000-0000-000000000007',
   'acceptable', 1080, 720, 112.0, 130.0, TRUE,
   'pothole', 0.85, 0.78, TRUE, 'MEDIUM', TRUE, 'REQUIRES_REVIEW'),

  -- 9: potential duplicate of complaint 2 (nearby garbage)
  ('c0000000-0000-0000-0000-000000000009',
   'poor', 640, 480, 55.3, 88.0, TRUE,
   'garbage', 0.77, 0.71, TRUE, 'MEDIUM', TRUE, 'REQUIRES_REVIEW'),

  -- 10: high quality, hospital area — verified high priority
  ('c0000000-0000-0000-0000-000000000010',
   'good', 1920, 1080, 280.0, 160.0, TRUE,
   'streetlight', 0.92, 0.04, FALSE, 'LOW', FALSE, 'VERIFIED')

ON CONFLICT (complaint_id) DO NOTHING;

-- ============================================================================
-- RESOLUTION  (for complaint 4, which is RESOLVED)
-- ============================================================================
INSERT INTO resolutions (
  id, complaint_id, worker_id,
  before_image_url, after_image_url, resolution_note,
  admin_status, verified_at, submitted_at
) VALUES (
  'r0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000011',
  'https://placehold.co/800x600/555/white?text=Before+Drain+Fix',
  'https://placehold.co/800x600/2a7/white?text=After+Drain+Fix',
  'Drainage channel cleared of all blockage. Removed accumulated debris, plastic waste, and silt from 50-metre stretch. Channel is now flowing freely. Area cleaned and disinfected with lime.',
  'APPROVED',
  now() - interval '8 hours',
  now() - interval '10 hours'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- FEEDBACK  (citizen feedback on resolved complaint 4)
-- ============================================================================
INSERT INTO feedback (
  id, complaint_id, citizen_id,
  resolved_confirmed, rating, comment
) VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  TRUE,
  4,
  'The drainage issue has been fixed and the channel is clear. The worker was professional and responsive. Would have given 5 stars if the area around the drain was also properly cleaned and disinfected after the work.'
) ON CONFLICT (id) DO NOTHING;
