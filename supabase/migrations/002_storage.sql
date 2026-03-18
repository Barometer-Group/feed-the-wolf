-- Workout media bucket (run after 001; policies use get_my_role() from 001)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-media', 'workout-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Athletes can upload their own media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workout-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view media they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'workout-media' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR get_my_role() IN ('trainer', 'admin')
  )
);

CREATE POLICY "Athletes can delete their own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workout-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
