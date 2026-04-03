-- ============================================================
-- TEST LOGIN ACCOUNTS — Carol Martin Salon
-- Run in Supabase SQL Editor AFTER seed_carol_martin.sql
--
-- Password for all three accounts: TommyC24!
-- ============================================================

DO $$
DECLARE
  owner_id  UUID := 'cccc0001-0000-0000-0000-000000000001';
  client_id UUID := 'cccc0002-0000-0000-0000-000000000002';
  staff_id  UUID := 'cccc0003-0000-0000-0000-000000000003';
  pw        TEXT := crypt('TommyC24!', gen_salt('bf', 10));
BEGIN

  -- ── auth.users ─────────────────────────────────────────────
  INSERT INTO auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, created_at, updated_at,
     raw_app_meta_data, raw_user_meta_data)
  VALUES
    (owner_id, '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'tommyc2424owner@example.com', pw,
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Tommy C (Owner)"}'),

    (client_id, '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'tommyc2424client@example.com', pw,
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Tommy C (Client)"}'),

    (staff_id, '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'tommyc2424staff@example.com', pw,
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Tommy C (Staff)"}')
  ON CONFLICT (id) DO NOTHING;

  -- ── profiles ───────────────────────────────────────────────
  INSERT INTO profiles (id, full_name, phone, role) VALUES
    (owner_id,  'Tommy C (Owner)',  '(512) 555-9001', 'admin'),
    (client_id, 'Tommy C (Client)', '(512) 555-9002', 'customer'),
    (staff_id,  'Tommy C (Staff)',  '(512) 555-9003', 'staff')
  ON CONFLICT (id) DO NOTHING;

  -- ── salon memberships ──────────────────────────────────────
  -- Owner gets full admin access to Carol Martin (salon_id = 2)
  INSERT INTO salon_memberships (salon_id, profile_id, role, is_active)
  VALUES (2, owner_id, 'owner', true)
  ON CONFLICT (salon_id, profile_id) DO UPDATE SET role = 'owner', is_active = true;

  -- Staff member linked to Carol Martin
  INSERT INTO salon_memberships (salon_id, profile_id, role, is_active)
  VALUES (2, staff_id, 'staff', true)
  ON CONFLICT (salon_id, profile_id) DO UPDATE SET role = 'staff', is_active = true;

  -- Link the staff profile to Tara Williams in the staff table
  UPDATE staff SET profile_id = staff_id
  WHERE salon_id = 2 AND full_name = 'Tara Williams';

  RAISE NOTICE 'Test users created. Login with password: TommyC24!';
END;
$$;
