-- ============================================================
-- STORAGE MIGRATION — Salon Logos Bucket
-- Run in Supabase SQL Editor
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-logos', 'salon-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "salon logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'salon-logos');

CREATE POLICY "salon logos: auth upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'salon-logos' AND auth.role() = 'authenticated');

CREATE POLICY "salon logos: auth update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'salon-logos' AND auth.role() = 'authenticated');

CREATE POLICY "salon logos: auth delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'salon-logos' AND auth.role() = 'authenticated');
