# Phase 5 — Media storage & DB (Supabase SQL Editor)

## 1. Storage bucket + RLS

Run **once**. If policies already exist, drop them first:

```sql
DROP POLICY IF EXISTS "Athletes can upload their own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view media they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Athletes can delete their own media" ON storage.objects;
```

Then:

```sql
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
```

## 2. `feedback_read` on `media_uploads`

`001_initial.sql` may already include this. If not:

```sql
ALTER TABLE media_uploads
ADD COLUMN IF NOT EXISTS feedback_read boolean DEFAULT false;
```
