-- ============================================================
-- SALON APP SCHEMA
-- ============================================================

-- Drop existing tables if rebuilding (order matters for FK deps)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS booking_services CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS staff_schedules CASCADE;
DROP TABLE IF EXISTS staff_services CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;


-- ============================================================
-- PROFILES
-- Extends Supabase auth.users (1:1)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- SERVICE CATEGORIES
-- e.g. Hair, Nails, Skin, Massage
-- ============================================================
CREATE TABLE service_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0
);


-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- STAFF <-> SERVICES  (which staff can perform which services)
-- ============================================================
CREATE TABLE staff_services (
  staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
  service_id INT REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);


-- ============================================================
-- STAFF SCHEDULES  (weekly recurring availability)
-- day_of_week: 0 = Sunday, 6 = Saturday
-- ============================================================
CREATE TABLE staff_schedules (
  id SERIAL PRIMARY KEY,
  staff_id INT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (staff_id, day_of_week)
);


-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  notes TEXT,
  total_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- BOOKING SERVICES  (a booking can include multiple services)
-- ============================================================
CREATE TABLE booking_services (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id INT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price_at_booking NUMERIC(10,2) NOT NULL,
  duration_at_booking INT NOT NULL
);


-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT CHECK (method IN ('card', 'cash', 'online')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_bookings_customer    ON bookings(customer_id);
CREATE INDEX idx_bookings_staff       ON bookings(staff_id);
CREATE INDEX idx_bookings_starts_at   ON bookings(starts_at);
CREATE INDEX idx_bookings_status      ON bookings(status);
CREATE INDEX idx_booking_services_booking ON booking_services(booking_id);
CREATE INDEX idx_payments_booking     ON payments(booking_id);
CREATE INDEX idx_reviews_staff        ON reviews(staff_id);
CREATE INDEX idx_services_category    ON services(category_id);
CREATE INDEX idx_staff_schedules_staff ON staff_schedules(staff_id);


-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews         ENABLE ROW LEVEL SECURITY;
-- services, staff, categories are public read — no RLS needed

-- Profiles: users can read/update their own
CREATE POLICY "profiles: own read"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: own update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Bookings: customers see their own; staff/admin see all (handled in app layer via service role)
CREATE POLICY "bookings: own read"   ON bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "bookings: own insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "bookings: own update" ON bookings FOR UPDATE USING (auth.uid() = customer_id);

-- Booking services: follow booking access
CREATE POLICY "booking_services: own read" ON booking_services FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()
  ));

-- Payments: own only
CREATE POLICY "payments: own read" ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()
  ));

-- Reviews: anyone can read, owner can insert/update
CREATE POLICY "reviews: public read"  ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews: own insert"   ON reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "reviews: own update"   ON reviews FOR UPDATE USING (auth.uid() = customer_id);


-- ============================================================
-- SEED: service categories
-- ============================================================
INSERT INTO service_categories (name, description, display_order) VALUES
  ('Hair',    'Cuts, color, and styling',          1),
  ('Nails',   'Manicure and pedicure services',    2),
  ('Skin',    'Facials and skincare treatments',   3),
  ('Massage', 'Relaxation and therapeutic massage',4),
  ('Waxing',  'Body and facial waxing',            5);
