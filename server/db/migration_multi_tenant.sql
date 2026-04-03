-- ============================================================
-- MULTI-TENANT MIGRATION
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Salons ───────────────────────────────────────────────────
CREATE TABLE salons (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  logo_url    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_salons_updated_at
  BEFORE UPDATE ON salons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Salon Memberships ────────────────────────────────────────
-- Replaces the global profiles.role for admin/staff.
-- A person can be owner of salon A and staff at salon B.
CREATE TABLE salon_memberships (
  id         SERIAL PRIMARY KEY,
  salon_id   INT  NOT NULL REFERENCES salons(id)  ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (salon_id, profile_id)
);

CREATE INDEX idx_salon_memberships_profile ON salon_memberships(profile_id);
CREATE INDEX idx_salon_memberships_salon   ON salon_memberships(salon_id);

-- ── Add salon_id to existing tables ─────────────────────────
ALTER TABLE staff    ADD COLUMN salon_id INT REFERENCES salons(id) ON DELETE CASCADE;
ALTER TABLE services ADD COLUMN salon_id INT REFERENCES salons(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD COLUMN salon_id INT REFERENCES salons(id) ON DELETE CASCADE;

CREATE INDEX idx_staff_salon    ON staff(salon_id);
CREATE INDEX idx_services_salon ON services(salon_id);
CREATE INDEX idx_bookings_salon ON bookings(salon_id);

-- ── Backfill existing data ───────────────────────────────────
INSERT INTO salons (name, slug, description)
VALUES ('My Salon', 'my-salon', 'Default salon');

UPDATE staff    SET salon_id = (SELECT id FROM salons WHERE slug = 'my-salon');
UPDATE services SET salon_id = (SELECT id FROM salons WHERE slug = 'my-salon');
UPDATE bookings SET salon_id = (SELECT id FROM salons WHERE slug = 'my-salon');

-- Promote existing admin/staff profiles to salon_memberships
INSERT INTO salon_memberships (salon_id, profile_id, role)
SELECT (SELECT id FROM salons WHERE slug = 'my-salon'), id, 'admin'
FROM profiles WHERE role = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO salon_memberships (salon_id, profile_id, role)
SELECT (SELECT id FROM salons WHERE slug = 'my-salon'), id, 'staff'
FROM profiles WHERE role = 'staff'
ON CONFLICT DO NOTHING;

-- ── NOT NULL after backfill ──────────────────────────────────
ALTER TABLE staff    ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE services ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN salon_id SET NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE salons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salons: public read"
  ON salons FOR SELECT USING (is_active = true);

CREATE POLICY "salons: service role all"
  ON salons FOR ALL USING (true);

CREATE POLICY "memberships: own read"
  ON salon_memberships FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "memberships: service role all"
  ON salon_memberships FOR ALL USING (true);
