-- ============================================================
-- SEED DATA
-- Run this in Supabase SQL Editor after schema.sql
-- ============================================================

-- Clear existing data (preserve categories)
TRUNCATE staff_services, staff_schedules, staff, booking_services, bookings, payments, reviews RESTART IDENTITY CASCADE;
DELETE FROM services;
DELETE FROM service_categories;
ALTER SEQUENCE services_id_seq RESTART WITH 1;
ALTER SEQUENCE service_categories_id_seq RESTART WITH 1;

-- ── Categories ──────────────────────────────────────────────
INSERT INTO service_categories (name, description, display_order) VALUES
  ('Hair',    'Cuts, color, and styling',           1),
  ('Nails',   'Manicure and pedicure services',     2),
  ('Skin',    'Facials and skincare treatments',    3),
  ('Massage', 'Relaxation and therapeutic massage', 4),
  ('Waxing',  'Body and facial waxing',             5);

-- ── Services ────────────────────────────────────────────────
INSERT INTO services (category_id, name, description, price, duration_minutes) VALUES
  -- Hair (1)
  (1, 'Women''s Haircut',       'Shampoo, cut, and blowout',                          65.00,  60),
  (1, 'Men''s Haircut',         'Precision cut and style',                            40.00,  30),
  (1, 'Children''s Haircut',    'Cut for kids 12 and under',                          30.00,  30),
  (1, 'Single Process Color',   'Full color application',                            120.00,  90),
  (1, 'Highlights',             'Partial or full foil highlights',                   145.00, 120),
  (1, 'Balayage',               'Hand-painted, sun-kissed color',                    175.00, 150),
  (1, 'Blowout',                'Shampoo, blowdry, and style',                        50.00,  45),
  (1, 'Deep Conditioning',      'Intensive moisture treatment',                       35.00,  30),
  (1, 'Keratin Treatment',      'Smoothing treatment for frizz-free hair',           200.00, 120),
  -- Nails (2)
  (2, 'Classic Manicure',       'Shape, cuticle care, and polish',                    35.00,  45),
  (2, 'Gel Manicure',           'Long-lasting gel polish',                            50.00,  60),
  (2, 'Classic Pedicure',       'Soak, exfoliate, and polish',                        45.00,  60),
  (2, 'Gel Pedicure',           'Gel polish pedicure',                                60.00,  75),
  (2, 'Mani + Pedi Combo',      'Classic manicure and pedicure together',             70.00,  90),
  (2, 'Nail Art',               'Custom nail art designs (per nail)',                  5.00,  15),
  -- Skin (3)
  (3, 'Classic Facial',         'Deep cleanse, exfoliate, and hydrate',               80.00,  60),
  (3, 'Anti-Aging Facial',      'Targeted treatment for fine lines',                 110.00,  75),
  (3, 'Acne Treatment Facial',  'Clarifying treatment for breakout-prone skin',       95.00,  60),
  (3, 'Microdermabrasion',      'Resurfacing treatment for brighter skin',           120.00,  60),
  (3, 'Chemical Peel',          'Light peel for smoother texture',                   100.00,  45),
  -- Massage (4)
  (4, 'Swedish Massage 60min',  'Relaxing full-body massage',                         90.00,  60),
  (4, 'Swedish Massage 90min',  'Extended relaxing full-body massage',               130.00,  90),
  (4, 'Deep Tissue Massage',    'Targeted relief for muscle tension',                105.00,  60),
  (4, 'Hot Stone Massage',      'Heated basalt stones for deep relaxation',          120.00,  75),
  (4, 'Couples Massage',        'Side-by-side massage for two',                      190.00,  60),
  -- Waxing (5)
  (5, 'Eyebrow Wax',            'Shape and define brows',                             18.00,  15),
  (5, 'Lip Wax',                'Upper lip hair removal',                             12.00,  10),
  (5, 'Full Leg Wax',           'Smooth legs from ankle to hip',                      70.00,  45),
  (5, 'Bikini Wax',             'Classic bikini line wax',                            40.00,  30),
  (5, 'Back Wax',               'Full back hair removal',                             60.00,  30);

-- ── Staff ───────────────────────────────────────────────────
INSERT INTO staff (full_name, bio, is_active) VALUES
  ('Sarah Mitchell',  'Senior stylist with 12 years of experience specializing in color and balayage.',          true),
  ('James Kowalski',  'Men''s grooming expert and precision cut specialist. Formerly with Rudy''s Barbershop.',  true),
  ('Priya Landers',   'Licensed esthetician focused on skin health and anti-aging treatments.',                   true),
  ('Marcus Webb',     'Certified massage therapist specializing in deep tissue and sports recovery.',             true),
  ('Ling Chen',       'Nail technician and nail art specialist with a background in fine arts.',                  true),
  ('Olivia Torres',   'Color specialist and balayage expert trained in Paris.',                                   true);

-- ── Staff Services ──────────────────────────────────────────
-- Sarah: Hair
INSERT INTO staff_services (staff_id, service_id)
SELECT 1, id FROM services WHERE category_id = 1;

-- James: Hair (cuts + blowout only)
INSERT INTO staff_services (staff_id, service_id)
SELECT 2, id FROM services WHERE name IN ('Women''s Haircut','Men''s Haircut','Children''s Haircut','Blowout');

-- Priya: Skin + Waxing
INSERT INTO staff_services (staff_id, service_id)
SELECT 3, id FROM services WHERE category_id IN (3, 5);

-- Marcus: Massage
INSERT INTO staff_services (staff_id, service_id)
SELECT 4, id FROM services WHERE category_id = 4;

-- Ling: Nails
INSERT INTO staff_services (staff_id, service_id)
SELECT 5, id FROM services WHERE category_id = 2;

-- Olivia: Hair (color-focused)
INSERT INTO staff_services (staff_id, service_id)
SELECT 6, id FROM services WHERE name IN (
  'Women''s Haircut','Single Process Color','Highlights','Balayage','Blowout','Deep Conditioning','Keratin Treatment'
);

-- ── Staff Schedules ─────────────────────────────────────────
-- Sarah: Tue–Sat
INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
  (1,2,'09:00','18:00'),(1,3,'09:00','18:00'),(1,4,'09:00','18:00'),(1,5,'09:00','18:00'),(1,6,'09:00','17:00');

-- James: Mon–Fri
INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
  (2,1,'08:00','16:00'),(2,2,'08:00','16:00'),(2,3,'08:00','16:00'),(2,4,'08:00','16:00'),(2,5,'08:00','16:00');

-- Priya: Mon–Thu + Sat
INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
  (3,1,'10:00','19:00'),(3,2,'10:00','19:00'),(3,3,'10:00','19:00'),(3,4,'10:00','19:00'),(3,6,'09:00','15:00');

-- Marcus: Wed–Sun
INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
  (4,3,'10:00','18:00'),(4,4,'10:00','18:00'),(4,5,'10:00','18:00'),(4,6,'10:00','18:00'),(4,0,'11:00','17:00');

-- Ling: Mon–Sat
INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
  (5,1,'09:00','18:00'),(5,2,'09:00','18:00'),(5,3,'09:00','18:00'),(5,4,'09:00','18:00'),(5,5,'09:00','18:00'),(5,6,'09:00','16:00');

-- Olivia: Thu–Mon
INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time) VALUES
  (6,4,'10:00','19:00'),(6,5,'10:00','19:00'),(6,6,'10:00','19:00'),(6,0,'10:00','17:00'),(6,1,'10:00','19:00');
