-- ============================================================
-- CAROL MARTIN SALON — DUMMY DATA
-- Run in Supabase SQL Editor (requires service-role / SQL Editor access)
-- ============================================================

-- ── 1. Fake client accounts ──────────────────────────────────
-- Insert into auth.users so the FK on profiles is satisfied.
-- Password hash = 'Demo1234!' (bcrypt). Not meant for real login.
INSERT INTO auth.users
  (id, instance_id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at,
   raw_app_meta_data, raw_user_meta_data)
VALUES
  ('11111111-1111-1111-1111-000000000001','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','emma.johnson@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   now(),now(),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Emma Johnson"}'),

  ('11111111-1111-1111-1111-000000000002','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','michael.chen@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   now(),now(),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Michael Chen"}'),

  ('11111111-1111-1111-1111-000000000003','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','sophia.rodriguez@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   now(),now(),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Sophia Rodriguez"}'),

  ('11111111-1111-1111-1111-000000000004','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','james.williams@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   now(),now(),now(),'{"provider":"email","providers":["email"]}','{"full_name":"James Williams"}'),

  ('11111111-1111-1111-1111-000000000005','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','ava.martinez@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   now(),now(),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Ava Martinez"}'),

  ('11111111-1111-1111-1111-000000000006','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','noah.thompson@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   now(),now(),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Noah Thompson"}'),

  ('11111111-1111-1111-1111-000000000007','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','isabella.davis@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   now(),now(),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Isabella Davis"}'),

  ('11111111-1111-1111-1111-000000000008','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','liam.wilson@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   now(),now(),now(),'{"provider":"email","providers":["email"]}','{"full_name":"Liam Wilson"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, full_name, phone, role) VALUES
  ('11111111-1111-1111-1111-000000000001', 'Emma Johnson',    '(512) 555-0101', 'customer'),
  ('11111111-1111-1111-1111-000000000002', 'Michael Chen',    '(512) 555-0102', 'customer'),
  ('11111111-1111-1111-1111-000000000003', 'Sophia Rodriguez','(512) 555-0103', 'customer'),
  ('11111111-1111-1111-1111-000000000004', 'James Williams',  '(512) 555-0104', 'customer'),
  ('11111111-1111-1111-1111-000000000005', 'Ava Martinez',    '(512) 555-0105', 'customer'),
  ('11111111-1111-1111-1111-000000000006', 'Noah Thompson',   '(512) 555-0106', 'customer'),
  ('11111111-1111-1111-1111-000000000007', 'Isabella Davis',  '(512) 555-0107', 'customer'),
  ('11111111-1111-1111-1111-000000000008', 'Liam Wilson',     '(512) 555-0108', 'customer')
ON CONFLICT (id) DO NOTHING;


-- ── 2. Everything else ───────────────────────────────────────
DO $$
DECLARE
  salon      INT;

  -- category ids
  cat_hair   INT; cat_nails INT; cat_skin INT; cat_waxing INT;

  -- service ids
  svc_wcut   INT;  -- Women's Haircut & Style
  svc_mcut   INT;  -- Men's Haircut
  svc_blowout INT;
  svc_color  INT;  -- Full Color
  svc_hilite INT;  -- Highlights
  svc_balay  INT;  -- Balayage
  svc_keratin INT;
  svc_cond   INT;  -- Deep Conditioning
  svc_cmani  INT;  -- Classic Manicure
  svc_gmani  INT;  -- Gel Manicure
  svc_cpedi  INT;  -- Classic Pedicure
  svc_combo  INT;  -- Mani + Pedi Combo
  svc_facial INT;  -- Classic Facial
  svc_aging  INT;  -- Anti-Aging Facial
  svc_ebrow  INT;  -- Eyebrow Wax
  svc_lipwax INT;  -- Lip Wax

  -- staff ids
  st_jess   INT;  -- Jessica Hartley  (hair color)
  st_marco  INT;  -- Marco Rivera     (men's cuts)
  st_sophie INT;  -- Sophie Chen      (nails & waxing)
  st_olivia INT;  -- Olivia Park      (skincare)
  st_tara   INT;  -- Tara Williams    (cuts & styling)

  -- client UUIDs (inserted above)
  emma  UUID := '11111111-1111-1111-1111-000000000001';
  mchen UUID := '11111111-1111-1111-1111-000000000002';
  soph  UUID := '11111111-1111-1111-1111-000000000003';
  james UUID := '11111111-1111-1111-1111-000000000004';
  ava   UUID := '11111111-1111-1111-1111-000000000005';
  noah  UUID := '11111111-1111-1111-1111-000000000006';
  bella UUID := '11111111-1111-1111-1111-000000000007';
  liam  UUID := '11111111-1111-1111-1111-000000000008';

  b INT;  -- reusable booking id

BEGIN

  -- ── Salon ──────────────────────────────────────────────────
  salon := 2;

  -- ── Clean up any partial data from previous runs ───────────
  DELETE FROM payments
    WHERE booking_id IN (SELECT id FROM bookings WHERE salon_id = salon);
  DELETE FROM bookings   WHERE salon_id = salon;
  DELETE FROM services   WHERE salon_id = salon;
  DELETE FROM staff      WHERE salon_id = salon;  -- cascades staff_services + staff_schedules

  -- ── Categories (global, shared) ────────────────────────────
  SELECT id INTO cat_hair   FROM service_categories WHERE name = 'Hair'   LIMIT 1;
  SELECT id INTO cat_nails  FROM service_categories WHERE name = 'Nails'  LIMIT 1;
  SELECT id INTO cat_skin   FROM service_categories WHERE name = 'Skin'   LIMIT 1;
  SELECT id INTO cat_waxing FROM service_categories WHERE name = 'Waxing' LIMIT 1;

  -- ── Services ───────────────────────────────────────────────
  INSERT INTO services (salon_id, category_id, name, description, price, duration_minutes) VALUES
    (salon, cat_hair,   'Women''s Haircut & Style', 'Shampoo, precision cut, and blowout',          75.00,  60),
    (salon, cat_hair,   'Men''s Haircut',            'Precision taper and style',                    45.00,  45),
    (salon, cat_hair,   'Blowout',                   'Shampoo, blowdry, and style — no cut',         55.00,  45),
    (salon, cat_hair,   'Full Color',                'Single-process full color application',        125.00, 120),
    (salon, cat_hair,   'Highlights',                'Full foil highlights',                         155.00, 150),
    (salon, cat_hair,   'Balayage',                  'Hand-painted natural color',                   185.00, 180),
    (salon, cat_hair,   'Keratin Treatment',         'Smoothing treatment for frizz-free results',   210.00, 150),
    (salon, cat_hair,   'Deep Conditioning',         'Intensive repair mask treatment',               40.00,  30),
    (salon, cat_nails,  'Classic Manicure',          'Shape, cuticle care, and polish',               35.00,  30),
    (salon, cat_nails,  'Gel Manicure',              'Long-lasting gel polish application',           50.00,  45),
    (salon, cat_nails,  'Classic Pedicure',          'Soak, exfoliate, and polish',                   50.00,  45),
    (salon, cat_nails,  'Mani + Pedi Combo',         'Classic manicure and pedicure together',        75.00,  75),
    (salon, cat_skin,   'Classic Facial',            'Deep cleanse, steam, and hydration',            85.00,  60),
    (salon, cat_skin,   'Anti-Aging Facial',         'Targeted firming and brightening treatment',   115.00,  75),
    (salon, cat_waxing, 'Eyebrow Wax',               'Shape and define brows',                        20.00,  15),
    (salon, cat_waxing, 'Lip Wax',                   'Upper lip hair removal',                        12.00,  10);

  SELECT id INTO svc_wcut    FROM services WHERE salon_id = salon AND name = 'Women''s Haircut & Style';
  SELECT id INTO svc_mcut    FROM services WHERE salon_id = salon AND name = 'Men''s Haircut';
  SELECT id INTO svc_blowout FROM services WHERE salon_id = salon AND name = 'Blowout';
  SELECT id INTO svc_color   FROM services WHERE salon_id = salon AND name = 'Full Color';
  SELECT id INTO svc_hilite  FROM services WHERE salon_id = salon AND name = 'Highlights';
  SELECT id INTO svc_balay   FROM services WHERE salon_id = salon AND name = 'Balayage';
  SELECT id INTO svc_keratin FROM services WHERE salon_id = salon AND name = 'Keratin Treatment';
  SELECT id INTO svc_cond    FROM services WHERE salon_id = salon AND name = 'Deep Conditioning';
  SELECT id INTO svc_cmani   FROM services WHERE salon_id = salon AND name = 'Classic Manicure';
  SELECT id INTO svc_gmani   FROM services WHERE salon_id = salon AND name = 'Gel Manicure';
  SELECT id INTO svc_cpedi   FROM services WHERE salon_id = salon AND name = 'Classic Pedicure';
  SELECT id INTO svc_combo   FROM services WHERE salon_id = salon AND name = 'Mani + Pedi Combo';
  SELECT id INTO svc_facial  FROM services WHERE salon_id = salon AND name = 'Classic Facial';
  SELECT id INTO svc_aging   FROM services WHERE salon_id = salon AND name = 'Anti-Aging Facial';
  SELECT id INTO svc_ebrow   FROM services WHERE salon_id = salon AND name = 'Eyebrow Wax';
  SELECT id INTO svc_lipwax  FROM services WHERE salon_id = salon AND name = 'Lip Wax';

  -- ── Staff ──────────────────────────────────────────────────
  INSERT INTO staff (salon_id, full_name, bio, is_active) VALUES
    (salon, 'Jessica Hartley', 'Senior colorist with 14 years of experience. Trained in balayage and color correction.',  true),
    (salon, 'Marco Rivera',    'Master barber specializing in men''s fades, tapers, and precision cuts.',                  true),
    (salon, 'Sophie Chen',     'Nail technician and waxing specialist. Certified in gel and acrylic systems.',             true),
    (salon, 'Olivia Park',     'Licensed esthetician focused on anti-aging and corrective skincare treatments.',           true),
    (salon, 'Tara Williams',   'Creative stylist known for lived-in color and modern cutting techniques.',                  true);
  SELECT id INTO st_jess   FROM staff WHERE salon_id = salon AND full_name = 'Jessica Hartley';
  SELECT id INTO st_marco  FROM staff WHERE salon_id = salon AND full_name = 'Marco Rivera';
  SELECT id INTO st_sophie FROM staff WHERE salon_id = salon AND full_name = 'Sophie Chen';
  SELECT id INTO st_olivia FROM staff WHERE salon_id = salon AND full_name = 'Olivia Park';
  SELECT id INTO st_tara   FROM staff WHERE salon_id = salon AND full_name = 'Tara Williams';

  -- ── Staff ↔ Services ───────────────────────────────────────
  -- Jessica: color & full hair menu
  INSERT INTO staff_services (staff_id, service_id) VALUES
    (st_jess, svc_wcut),(st_jess, svc_blowout),(st_jess, svc_color),
    (st_jess, svc_hilite),(st_jess, svc_balay),(st_jess, svc_keratin),(st_jess, svc_cond);

  -- Marco: men's cuts + blowout
  INSERT INTO staff_services (staff_id, service_id) VALUES
    (st_marco, svc_mcut),(st_marco, svc_blowout);

  -- Sophie: nails + waxing
  INSERT INTO staff_services (staff_id, service_id) VALUES
    (st_sophie, svc_cmani),(st_sophie, svc_gmani),(st_sophie, svc_cpedi),
    (st_sophie, svc_combo),(st_sophie, svc_ebrow),(st_sophie, svc_lipwax);

  -- Olivia: skincare
  INSERT INTO staff_services (staff_id, service_id) VALUES
    (st_olivia, svc_facial),(st_olivia, svc_aging),(st_olivia, svc_ebrow);

  -- Tara: cuts & styling
  INSERT INTO staff_services (staff_id, service_id) VALUES
    (st_tara, svc_wcut),(st_tara, svc_mcut),(st_tara, svc_blowout),
    (st_tara, svc_color),(st_tara, svc_hilite),(st_tara, svc_cond);

  -- ── Staff Schedules ────────────────────────────────────────
  -- Jessica: Tue–Sat
  INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
    (st_jess,2,'09:00','18:00'),(st_jess,3,'09:00','18:00'),(st_jess,4,'09:00','18:00'),
    (st_jess,5,'09:00','18:00'),(st_jess,6,'09:00','17:00');

  -- Marco: Mon–Fri
  INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
    (st_marco,1,'08:00','16:00'),(st_marco,2,'08:00','16:00'),(st_marco,3,'08:00','16:00'),
    (st_marco,4,'08:00','16:00'),(st_marco,5,'08:00','16:00');

  -- Sophie: Mon–Sat
  INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
    (st_sophie,1,'09:00','18:00'),(st_sophie,2,'09:00','18:00'),(st_sophie,3,'09:00','18:00'),
    (st_sophie,4,'09:00','18:00'),(st_sophie,5,'09:00','18:00'),(st_sophie,6,'09:00','16:00');

  -- Olivia: Mon–Thu + Sat
  INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
    (st_olivia,1,'10:00','19:00'),(st_olivia,2,'10:00','19:00'),(st_olivia,3,'10:00','19:00'),
    (st_olivia,4,'10:00','19:00'),(st_olivia,6,'09:00','15:00');

  -- Tara: Wed–Sun
  INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
    (st_tara,3,'10:00','19:00'),(st_tara,4,'10:00','19:00'),(st_tara,5,'10:00','19:00'),
    (st_tara,6,'10:00','19:00'),(st_tara,0,'11:00','17:00');


  -- ═══════════════════════════════════════════════════════════
  -- PAST BOOKINGS (Jan – Mar 2026)
  -- ═══════════════════════════════════════════════════════════

  -- 1. Emma — Balayage — Jan 6 10am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, emma, st_jess, '2026-01-06 10:00', '2026-01-06 13:00', 'completed', 185.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_balay, 185.00, 180);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 185.00, 'card', 'paid', '2026-01-06 13:05');

  -- 2. Michael — Men's Haircut — Jan 8 9am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, mchen, st_marco, '2026-01-08 09:00', '2026-01-08 09:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-01-08 09:50');

  -- 3. Sophia — Classic Facial — Jan 10 11am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, soph, st_olivia, '2026-01-10 11:00', '2026-01-10 12:00', 'completed', 85.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_facial, 85.00, 60);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 85.00, 'card', 'paid', '2026-01-10 12:05');

  -- 4. Ava — Gel Manicure + Eyebrow Wax — Jan 12 2pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, ava, st_sophie, '2026-01-12 14:00', '2026-01-12 15:10', 'completed', 70.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_gmani, 50.00, 45), (DEFAULT, b, svc_ebrow, 20.00, 15);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 70.00, 'card', 'paid', '2026-01-12 15:15');

  -- 5. Isabella — Women's Haircut & Style — Jan 14 3pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, bella, st_tara, '2026-01-14 15:00', '2026-01-14 16:00', 'completed', 75.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_wcut, 75.00, 60);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 75.00, 'card', 'paid', '2026-01-14 16:05');

  -- 6. Noah — Men's Haircut — Jan 15 10am — cancelled
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, noah, st_marco, '2026-01-15 10:00', '2026-01-15 10:45', 'cancelled', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);

  -- 7. Emma — Highlights + Blowout — Jan 20 10am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, emma, st_jess, '2026-01-20 10:00', '2026-01-20 12:30', 'completed', 210.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_hilite, 155.00, 150), (DEFAULT, b, svc_blowout, 55.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 210.00, 'card', 'paid', '2026-01-20 12:35');

  -- 8. Liam — Men's Haircut — Jan 22 9am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, liam, st_marco, '2026-01-22 09:00', '2026-01-22 09:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-01-22 09:50');

  -- 9. James — Men's Haircut — Jan 24 11am — no_show
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, james, st_marco, '2026-01-24 11:00', '2026-01-24 11:45', 'no_show', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);

  -- 10. Sophia — Anti-Aging Facial — Jan 28 1pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, soph, st_olivia, '2026-01-28 13:00', '2026-01-28 14:15', 'completed', 115.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_aging, 115.00, 75);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 115.00, 'card', 'paid', '2026-01-28 14:20');

  -- 11. Ava — Mani + Pedi Combo — Feb 3 10am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, ava, st_sophie, '2026-02-03 10:00', '2026-02-03 11:15', 'completed', 75.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_combo, 75.00, 75);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 75.00, 'card', 'paid', '2026-02-03 11:20');

  -- 12. Michael — Men's Haircut — Feb 5 9am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, mchen, st_marco, '2026-02-05 09:00', '2026-02-05 09:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-02-05 09:50');

  -- 13. Isabella — Full Color + Blowout — Feb 7 10am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, bella, st_tara, '2026-02-07 10:00', '2026-02-07 12:15', 'completed', 180.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_color, 125.00, 120), (DEFAULT, b, svc_blowout, 55.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 180.00, 'card', 'paid', '2026-02-07 12:20');

  -- 14. Emma — Deep Conditioning — Feb 10 2pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, emma, st_jess, '2026-02-10 14:00', '2026-02-10 14:30', 'completed', 40.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_cond, 40.00, 30);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 40.00, 'card', 'paid', '2026-02-10 14:35');

  -- 15. Liam — Men's Haircut — Feb 12 9am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, liam, st_marco, '2026-02-12 09:00', '2026-02-12 09:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-02-12 09:50');

  -- 16. Sophia — Classic Facial — Feb 14 11am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, soph, st_olivia, '2026-02-14 11:00', '2026-02-14 12:00', 'completed', 85.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_facial, 85.00, 60);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 85.00, 'card', 'paid', '2026-02-14 12:05');

  -- 17. James — Men's Haircut — Feb 18 10am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, james, st_marco, '2026-02-18 10:00', '2026-02-18 10:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-02-18 10:50');

  -- 18. Ava — Gel Manicure — Feb 20 1pm — cancelled
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, ava, st_sophie, '2026-02-20 13:00', '2026-02-20 13:45', 'cancelled', 50.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_gmani, 50.00, 45);

  -- 19. Isabella — Women's Haircut & Style — Feb 25 3pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, bella, st_tara, '2026-02-25 15:00', '2026-02-25 16:00', 'completed', 75.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_wcut, 75.00, 60);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 75.00, 'card', 'paid', '2026-02-25 16:05');

  -- 20. Noah — Men's Haircut — Feb 26 9am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, noah, st_marco, '2026-02-26 09:00', '2026-02-26 09:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-02-26 09:50');

  -- 21. Emma — Keratin Treatment — Mar 3 10am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, emma, st_jess, '2026-03-03 10:00', '2026-03-03 12:30', 'completed', 210.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_keratin, 210.00, 150);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 210.00, 'card', 'paid', '2026-03-03 12:35');

  -- 22. Michael — Men's Haircut — Mar 5 9am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, mchen, st_marco, '2026-03-05 09:00', '2026-03-05 09:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-03-05 09:50');

  -- 23. Sophia — Eyebrow Wax + Lip Wax — Mar 8 12pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, soph, st_sophie, '2026-03-08 12:00', '2026-03-08 12:25', 'completed', 32.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_ebrow, 20.00, 15), (DEFAULT, b, svc_lipwax, 12.00, 10);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 32.00, 'cash', 'paid', '2026-03-08 12:30');

  -- 24. Ava — Classic Pedicure — Mar 10 2pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, ava, st_sophie, '2026-03-10 14:00', '2026-03-10 14:45', 'completed', 50.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_cpedi, 50.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 50.00, 'card', 'paid', '2026-03-10 14:50');

  -- 25. Liam — Men's Haircut — Mar 12 9am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, liam, st_marco, '2026-03-12 09:00', '2026-03-12 09:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-03-12 09:50');

  -- 26. Isabella — Balayage — Mar 14 10am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, bella, st_jess, '2026-03-14 10:00', '2026-03-14 13:00', 'completed', 185.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_balay, 185.00, 180);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 185.00, 'card', 'paid', '2026-03-14 13:05');

  -- 27. Noah — Men's Haircut — Mar 19 10am — no_show
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, noah, st_marco, '2026-03-19 10:00', '2026-03-19 10:45', 'no_show', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);

  -- 28. Emma — Blowout — Mar 20 11am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, emma, st_tara, '2026-03-20 11:00', '2026-03-20 11:45', 'completed', 55.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_blowout, 55.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 55.00, 'card', 'paid', '2026-03-20 11:50');

  -- 29. James — Men's Haircut — Mar 24 9am — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, james, st_marco, '2026-03-24 09:00', '2026-03-24 09:45', 'completed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 45.00, 'cash', 'paid', '2026-03-24 09:50');

  -- 30. Sophia — Anti-Aging Facial — Mar 26 1pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, soph, st_olivia, '2026-03-26 13:00', '2026-03-26 14:15', 'completed', 115.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_aging, 115.00, 75);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 115.00, 'card', 'paid', '2026-03-26 14:20');

  -- 31. Ava — Gel Manicure — Mar 28 2pm — completed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, ava, st_sophie, '2026-03-28 14:00', '2026-03-28 14:45', 'completed', 50.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_gmani, 50.00, 45);
  INSERT INTO payments (booking_id, amount, method, status, paid_at) VALUES (b, 50.00, 'card', 'paid', '2026-03-28 14:50');

  -- 32. Michael — Men's Haircut — Mar 31 9am — cancelled
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, mchen, st_marco, '2026-03-31 09:00', '2026-03-31 09:45', 'cancelled', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);


  -- ═══════════════════════════════════════════════════════════
  -- UPCOMING BOOKINGS (April 2026)
  -- ═══════════════════════════════════════════════════════════

  -- 33. Emma — Highlights — Apr 4 10am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, emma, st_jess, '2026-04-04 10:00', '2026-04-04 12:30', 'confirmed', 155.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_hilite, 155.00, 150);

  -- 34. Michael — Men's Haircut — Apr 4 9am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, mchen, st_marco, '2026-04-04 09:00', '2026-04-04 09:45', 'confirmed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);

  -- 35. Ava — Mani + Pedi Combo — Apr 5 11am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, ava, st_sophie, '2026-04-05 11:00', '2026-04-05 12:15', 'confirmed', 75.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_combo, 75.00, 75);

  -- 36. Sophia — Classic Facial — Apr 7 11am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, soph, st_olivia, '2026-04-07 11:00', '2026-04-07 12:00', 'confirmed', 85.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_facial, 85.00, 60);

  -- 37. Isabella — Women's Haircut & Style — Apr 8 3pm — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, bella, st_tara, '2026-04-08 15:00', '2026-04-08 16:00', 'confirmed', 75.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_wcut, 75.00, 60);

  -- 38. Liam — Men's Haircut — Apr 9 9am — pending
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, liam, st_marco, '2026-04-09 09:00', '2026-04-09 09:45', 'pending', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);

  -- 39. James — Men's Haircut — Apr 10 10am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, james, st_marco, '2026-04-10 10:00', '2026-04-10 10:45', 'confirmed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);

  -- 40. Noah — Men's Haircut — Apr 11 9am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, noah, st_marco, '2026-04-11 09:00', '2026-04-11 09:45', 'confirmed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);

  -- 41. Emma — Blowout — Apr 14 11am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, emma, st_tara, '2026-04-14 11:00', '2026-04-14 11:45', 'confirmed', 55.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_blowout, 55.00, 45);

  -- 42. Sophia — Eyebrow Wax — Apr 15 12pm — pending
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, soph, st_sophie, '2026-04-15 12:00', '2026-04-15 12:15', 'pending', 20.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_ebrow, 20.00, 15);

  -- 43. Isabella — Full Color + Deep Conditioning — Apr 17 10am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, bella, st_jess, '2026-04-17 10:00', '2026-04-17 12:30', 'confirmed', 165.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_color, 125.00, 120), (DEFAULT, b, svc_cond, 40.00, 30);

  -- 44. Ava — Gel Manicure — Apr 19 2pm — pending
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, ava, st_sophie, '2026-04-19 14:00', '2026-04-19 14:45', 'pending', 50.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_gmani, 50.00, 45);

  -- 45. Michael — Men's Haircut — Apr 21 9am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, mchen, st_marco, '2026-04-21 09:00', '2026-04-21 09:45', 'confirmed', 45.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_mcut, 45.00, 45);

  -- 46. Emma — Balayage — Apr 24 10am — confirmed
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, emma, st_jess, '2026-04-24 10:00', '2026-04-24 13:00', 'confirmed', 185.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_balay, 185.00, 180);

  -- 47. Sophia — Anti-Aging Facial — Apr 28 1pm — pending
  INSERT INTO bookings (salon_id, customer_id, staff_id, starts_at, ends_at, status, total_price)
  VALUES (salon, soph, st_olivia, '2026-04-28 13:00', '2026-04-28 14:15', 'pending', 115.00)
  RETURNING id INTO b;
  INSERT INTO booking_services VALUES (DEFAULT, b, svc_aging, 115.00, 75);

  RAISE NOTICE 'Carol Martin salon seed data inserted successfully.';
END;
$$;
