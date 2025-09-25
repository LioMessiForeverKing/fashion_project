-- ==============================================
-- SUPABASE STORAGE BUCKET AND POLICIES
-- ==============================================

-- Create storage bucket for closet item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'closet-images',
  'closet-images',
  false, -- private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own closet images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own closet images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own closet images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own closet images" ON storage.objects;

-- Policy 1: Users can upload images to their own folder
CREATE POLICY "Users can upload own closet images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'closet-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy 2: Users can view their own images
CREATE POLICY "Users can view own closet images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'closet-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy 3: Users can update their own images
CREATE POLICY "Users can update own closet images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'closet-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy 4: Users can delete their own images
CREATE POLICY "Users can delete own closet images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'closet-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
