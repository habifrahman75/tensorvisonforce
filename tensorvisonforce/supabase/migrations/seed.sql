-- ============================================================================
-- CivicPulse -- Demo Seed Data
-- Run AFTER 001_initial_schema.sql, in: Supabase Dashboard -> SQL Editor
--
-- Creates 5 demo accounts directly in auth.users (email/password) and 12
-- complaints covering every status, priority, and two duplicate pairs.
-- No real people's personal information is used -- all names, emails, and
-- locations below are fictional placeholders for demo purposes only.
--
-- WARNING: inserting into auth.users directly (bypassing Supabase Auth's
-- signup API) is a common demo/seed technique but is not officially
-- supported by Supabase and can break across GoTrue versions. It is fine
-- for a hackathon prototype; for production, create users through
-- supabase.auth.signUp() / the Admin API instead.
-- ============================================================================

-- ============================================================================
-- DEMO ACCOUNTS  (password for all demo accounts: Demo@1234)
-- Inserting into auth.users fires the trg_on_auth_user_created trigger from
-- the migration, which auto-creates the matching `profiles` row from
-- raw_user_meta_data (full_name, role) -- no separate INSERT INTO profiles
-- is needed here.
-- ============================================================================
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'citizen.asha@civicpulse.demo', crypt('Demo@1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Asha Iyer","role":"CITIZEN"}', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'citizen.rahul@civicpulse.demo', crypt('Demo@1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Rahul Menon","role":"CITIZEN"}', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'admin@civicpulse.demo', crypt('Demo@1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Divya Krishnan","role":"ADMIN"}', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
   'authenticated', 'authenticated', 'worker.suresh@civicpulse.demo', crypt('Demo@1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Suresh Pillai","role":"FIELD_WORKER"}', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555',
   'authenticated', 'authenticated', 'worker.kavya@civicpulse.demo', crypt('Demo@1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}',
   '{"full_name":"Kavya Nair","role":"FIELD_WORKER"}', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMPLAINTS  (12 total; base coordinates loosely spread around a fictional
-- city center at 13.0827, 80.2707)
-- ============================================================================
INSERT INTO complaints (id, citizen_id, title, description, category, priority, status, department_id, assigned_worker_id, latitude, longitude, image_url, enhanced_image_url, deadline) VALUES

-- C1: RESOLVED, HIGH priority, Roads
('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
 'Large pothole on MG Road near flyover',
 'A deep pothole has formed on MG Road right before the flyover entrance, causing two-wheelers to swerve dangerously during peak traffic hours.',
 'Road Damage', 'HIGH', 'RESOLVED',
 (SELECT id FROM departments WHERE name = 'Roads Department'), '44444444-4444-4444-4444-444444444444',
 13.0827, 80.2707, 'https://picsum.photos/seed/cmp-pothole-1/800/600', 'https://picsum.photos/seed/cmp-pothole-1-enh/800/600',
 now() - interval '2 days'),

-- C2: IN_PROGRESS, MEDIUM, Sanitation
('a1111111-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
 'Overflowing garbage bin near bus stand',
 'The community garbage bin near the central bus stand has been overflowing for three days, attracting stray animals and causing a foul smell.',
 'Garbage Overflow', 'MEDIUM', 'IN_PROGRESS',
 (SELECT id FROM departments WHERE name = 'Sanitation Department'), '55555555-5555-5555-5555-555555555555',
 13.0850, 80.2750, 'https://picsum.photos/seed/cmp-garbage-1/800/600', NULL,
 now() + interval '2 days'),

-- C3: SUBMITTED, LOW, Electrical
('a1111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
 'Streetlight not working on Park Street',
 'The streetlight outside house number 24 on Park Street has been out for over a week, making the lane unsafe at night.',
 'Streetlight Issue', 'LOW', 'SUBMITTED',
 (SELECT id FROM departments WHERE name = 'Electrical Department'), NULL,
 13.0700, 80.2600, 'https://picsum.photos/seed/cmp-light-1/800/600', NULL,
 now() + interval '5 days'),

-- C4: VERIFIED, HIGH, Drainage
('a1111111-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222',
 'Severe waterlogging near central market',
 'Heavy rain has caused ankle-deep waterlogging outside the central market entrance, blocking pedestrian and vehicle access.',
 'Waterlogging', 'HIGH', 'VERIFIED',
 (SELECT id FROM departments WHERE name = 'Drainage Department'), NULL,
 13.0900, 80.2650, 'https://picsum.photos/seed/cmp-water-1/800/600', NULL,
 now() + interval '1 day'),

-- C5: ASSIGNED, MEDIUM, Water
('a1111111-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
 'Pipeline leakage near residential block C',
 'A water pipeline joint near residential block C has been leaking continuously for two days, wasting a large amount of water.',
 'Water Leakage', 'MEDIUM', 'ASSIGNED',
 (SELECT id FROM departments WHERE name = 'Water Department'), '44444444-4444-4444-4444-444444444444',
 13.0780, 80.2820, 'https://picsum.photos/seed/cmp-pipe-1/800/600', NULL,
 now() + interval '3 days'),

-- C6: SUBMITTED, MEDIUM, Sanitation -- duplicate pair 1a
('a1111111-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222',
 'Garbage dumped illegally behind government school',
 'A large pile of construction and household waste has been dumped illegally on the empty plot behind the government school.',
 'Illegal Dumping', 'MEDIUM', 'SUBMITTED',
 (SELECT id FROM departments WHERE name = 'Sanitation Department'), NULL,
 13.0650, 80.2500, 'https://picsum.photos/seed/cmp-dump-1/800/600', NULL,
 now() + interval '4 days'),

-- C7: SUBMITTED, MEDIUM, Sanitation -- duplicate pair 1b (flags C6 as duplicate)
('a1111111-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
 'Illegal garbage dumping spotted behind school gate',
 'Noticed a big heap of garbage and debris dumped near the back gate of the government school on the same empty plot.',
 'Illegal Dumping', 'MEDIUM', 'SUBMITTED',
 (SELECT id FROM departments WHERE name = 'Sanitation Department'), NULL,
 13.0652, 80.2503, 'https://picsum.photos/seed/cmp-dump-2/800/600', NULL,
 now() + interval '4 days'),

-- C8: SUBMITTED, LOW, Electrical -- duplicate pair 2a
('a1111111-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222',
 'Streetlight flickering on 2nd Avenue junction',
 'The streetlight at the 2nd Avenue junction flickers on and off continuously and sometimes stays off for hours.',
 'Streetlight Issue', 'LOW', 'SUBMITTED',
 (SELECT id FROM departments WHERE name = 'Electrical Department'), NULL,
 13.0600, 80.2400, 'https://picsum.photos/seed/cmp-light-2/800/600', NULL,
 now() + interval '5 days'),

-- C9: SUBMITTED, LOW, Electrical -- duplicate pair 2b (flags C8 as duplicate)
('a1111111-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111',
 'Street light not working at 2nd Avenue junction',
 'Same junction on 2nd Avenue -- the street light here has stopped working entirely for the last two nights.',
 'Streetlight Issue', 'LOW', 'SUBMITTED',
 (SELECT id FROM departments WHERE name = 'Electrical Department'), NULL,
 13.0601, 80.2401, 'https://picsum.photos/seed/cmp-light-3/800/600', NULL,
 now() + interval '5 days'),

-- C10: SUBMITTED, LOW, Roads -- poor image-quality demo example
('a1111111-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222',
 'Damaged footpath tiles near park entrance',
 'Several footpath tiles near the park entrance are cracked and uneven, creating a tripping hazard for pedestrians.',
 'Road Damage', 'LOW', 'SUBMITTED',
 (SELECT id FROM departments WHERE name = 'Roads Department'), NULL,
 13.0500, 80.2300, 'https://picsum.photos/seed/cmp-tile-1/400/300', NULL,
 now() + interval '6 days'),

-- C11: REWORK_REQUIRED, HIGH, Drainage -- resolved then rejected by citizen
('a1111111-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111',
 'Sewage overflow near residential colony gate',
 'Sewage has been overflowing from a manhole near the residential colony main gate for several days, creating a health hazard.',
 'Waterlogging', 'HIGH', 'REWORK_REQUIRED',
 (SELECT id FROM departments WHERE name = 'Drainage Department'), '55555555-5555-5555-5555-555555555555',
 13.0950, 80.2900, 'https://picsum.photos/seed/cmp-sewage-1/800/600', NULL,
 now() - interval '1 day'),

-- C12: SUBMITTED, LOW, General
('a1111111-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222',
 'Construction debris left on roadside',
 'Leftover construction debris has been left unattended on the roadside for over a week, partially blocking one lane.',
 'General Issue', 'LOW', 'SUBMITTED',
 (SELECT id FROM departments WHERE name = 'General Civic Department'), NULL,
 13.0400, 80.2200, 'https://picsum.photos/seed/cmp-debris-1/800/600', NULL,
 now() + interval '7 days');

-- ============================================================================
-- COMPLAINT VERIFICATION  (AI pipeline analysis results per complaint)
-- ============================================================================
INSERT INTO complaint_verification (complaint_id, image_quality, resolution_width, resolution_height, blur_score, brightness_score, gps_verified, ai_category, ai_confidence, duplicate_score, potential_duplicate, suspicion_level, verification_required, verification_status, verification_notes) VALUES

('a1111111-0000-0000-0000-000000000001', 'GOOD', 1920, 1080, 0.12, 0.61, true, 'Road Damage', 0.94, 0.05, false, 'LOW', false, 'VERIFIED', 'Clear image, GPS matches reported location.'),
('a1111111-0000-0000-0000-000000000002', 'GOOD', 1600, 1200, 0.18, 0.55, true, 'Garbage Overflow', 0.89, 0.10, false, 'LOW', false, 'VERIFIED', 'Image and location consistent with report.'),
('a1111111-0000-0000-0000-000000000003', 'GOOD', 1280, 960,  0.20, 0.30, true, 'Streetlight Issue', 0.81, 0.15, false, 'LOW', false, 'PENDING', 'Awaiting admin review.'),
('a1111111-0000-0000-0000-000000000004', 'GOOD', 1920, 1440, 0.15, 0.58, true, 'Waterlogging', 0.92, 0.08, false, 'MEDIUM', true, 'VERIFIED', 'High priority flagged due to standing water depth.'),
('a1111111-0000-0000-0000-000000000005', 'GOOD', 1600, 1200, 0.22, 0.50, true, 'Water Leakage', 0.85, 0.12, false, 'LOW', false, 'VERIFIED', 'Consistent with reported leak.'),
('a1111111-0000-0000-0000-000000000006', 'GOOD', 1600, 1200, 0.19, 0.52, true, 'Illegal Dumping', 0.83, 0.88, true,  'MEDIUM', true, 'REQUIRES_REVIEW', 'High visual and location similarity to complaint CMP behind-school-gate report.'),
('a1111111-0000-0000-0000-000000000007', 'GOOD', 1600, 1200, 0.21, 0.49, true, 'Illegal Dumping', 0.80, 0.88, true,  'MEDIUM', true, 'REQUIRES_REVIEW', 'Flagged as likely duplicate of an existing open complaint at the same plot.'),
('a1111111-0000-0000-0000-000000000008', 'GOOD', 1280, 960,  0.25, 0.28, true, 'Streetlight Issue', 0.78, 0.91, true,  'MEDIUM', true, 'REQUIRES_REVIEW', 'Near-identical location and description to another open streetlight report.'),
('a1111111-0000-0000-0000-000000000009', 'GOOD', 1280, 960,  0.23, 0.27, true, 'Streetlight Issue', 0.79, 0.91, true,  'MEDIUM', true, 'REQUIRES_REVIEW', 'Flagged as likely duplicate at the 2nd Avenue junction.'),
('a1111111-0000-0000-0000-00000000000a', 'POOR', 480, 360, 0.68, 0.21, true, 'Road Damage', 0.55, 0.05, false, 'LOW', true, 'REQUIRES_REVIEW', 'Low resolution and high blur score; enhancement recommended before verification.'),
('a1111111-0000-0000-0000-00000000000b', 'GOOD', 1920, 1080, 0.14, 0.60, true, 'Waterlogging', 0.90, 0.06, false, 'HIGH', true, 'VERIFIED', 'Health-hazard category, escalated to high priority.'),
('a1111111-0000-0000-0000-00000000000c', 'GOOD', 1600, 1200, 0.17, 0.54, true, 'General Issue', 0.70, 0.09, false, 'LOW', false, 'PENDING', 'Awaiting admin review.');

-- ============================================================================
-- RESOLUTIONS
-- ============================================================================

-- C1: worker submitted, admin approved -> complaint is RESOLVED
INSERT INTO resolutions (id, complaint_id, worker_id, before_image_url, after_image_url, resolution_note, submitted_at, admin_status, admin_note, verified_at) VALUES
('b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
 'https://picsum.photos/seed/cmp-pothole-1-before/800/600', 'https://picsum.photos/seed/cmp-pothole-1-after/800/600',
 'Pothole filled with asphalt patch and compacted; road surface resurfaced and marked.', now() - interval '1 day',
 'APPROVED', 'Verified on-site photos, repair meets quality standard.', now() - interval '20 hours');

-- C11: worker submitted, admin approved (RESOLVED), then citizen rejected via feedback -> REWORK_REQUIRED
INSERT INTO resolutions (id, complaint_id, worker_id, before_image_url, after_image_url, resolution_note, submitted_at, admin_status, admin_note, verified_at) VALUES
('b1111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-00000000000b', '55555555-5555-5555-5555-555555555555',
 'https://picsum.photos/seed/cmp-sewage-1-before/800/600', 'https://picsum.photos/seed/cmp-sewage-1-after/800/600',
 'Manhole cleared and sealed; sewage flow diverted and cleaned up.', now() - interval '3 days',
 'APPROVED', 'Initial repair approved.', now() - interval '2 days');

-- ============================================================================
-- FEEDBACK
-- ============================================================================

-- C1: citizen confirms the resolution (stays RESOLVED)
INSERT INTO feedback (complaint_id, citizen_id, resolved_confirmed, rating, comment) VALUES
('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', true, 5, 'Great job, the road is smooth again. Thank you!');

-- C11: citizen rejects the resolution -- trg_feedback_status_sync moves this
-- complaint from RESOLVED to REWORK_REQUIRED (already reflected in the
-- complaints INSERT above; this row is what caused that transition in the
-- live workflow and is included here for a consistent, queryable demo state)
INSERT INTO feedback (complaint_id, citizen_id, resolved_confirmed, rating, comment) VALUES
('a1111111-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', false, 2, 'Sewage smell is back after two days, the leak was not fully fixed.');
