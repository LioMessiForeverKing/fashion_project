-- ==============================================
-- SUPABASE STORAGE SETUP
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

-- Note: Storage policies are managed through the Supabase dashboard
-- Go to Storage > Policies and create these policies manually:

-- Policy 1: Users can upload images to their own folder
-- Name: "Users can upload own closet images"
-- Operation: INSERT
-- Target roles: authenticated
-- Policy definition:
-- bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]

-- Policy 2: Users can view their own images  
-- Name: "Users can view own closet images"
-- Operation: SELECT
-- Target roles: authenticated
-- Policy definition:
-- bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]

-- Policy 3: Users can update their own images
-- Name: "Users can update own closet images" 
-- Operation: UPDATE
-- Target roles: authenticated
-- Policy definition:
-- bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]

-- Policy 4: Users can delete their own images
-- Name: "Users can delete own closet images"
-- Operation: DELETE  
-- Target roles: authenticated
-- Policy definition:
-- bucket_id = 'closet-images' AND auth.uid()::text = (storage.foldername(name))[1]

-- ==============================================
-- SEED DATA FOR TAGGING VOCAB
-- ==============================================

-- Create a reference table for clothing categories
CREATE TABLE IF NOT EXISTS public.clothing_categories (
  id SERIAL PRIMARY KEY,
  category TEXT UNIQUE NOT NULL,
  subcategories TEXT[] NOT NULL
);

-- Insert category data
INSERT INTO public.clothing_categories (category, subcategories) VALUES
  ('top', ARRAY['tee', 'blouse', 'sweater', 'tank', 'polo', 'henley', 'cardigan']),
  ('bottom', ARRAY['jeans', 'trousers', 'shorts', 'skirt', 'leggings', 'pants']),
  ('dress', ARRAY['midi', 'mini', 'maxi', 'shirt-dress', 'wrap', 'slip']),
  ('outerwear', ARRAY['blazer', 'jacket', 'coat', 'vest', 'hoodie', 'cardigan']),
  ('shoes', ARRAY['sneakers', 'loafers', 'boots', 'heels', 'flats', 'sandals']),
  ('bag', ARRAY['tote', 'crossbody', 'clutch', 'backpack', 'shoulder', 'belt-bag']),
  ('accessory', ARRAY['belt', 'scarf', 'hat', 'jewelry', 'watch', 'sunglasses'])
ON CONFLICT (category) DO NOTHING;

-- Create a reference table for colors
CREATE TABLE IF NOT EXISTS public.color_palette (
  id SERIAL PRIMARY KEY,
  color TEXT UNIQUE NOT NULL,
  hex_code TEXT NOT NULL
);

-- Insert color data
INSERT INTO public.color_palette (color, hex_code) VALUES
  ('black', '#000000'),
  ('white', '#FFFFFF'),
  ('cream', '#F5F5DC'),
  ('camel', '#C19A6B'),
  ('navy', '#000080'),
  ('grey', '#808080'),
  ('blue', '#0000FF'),
  ('denim-dark', '#191970'),
  ('denim-light', '#87CEEB'),
  ('olive', '#808000'),
  ('blush', '#F5C6CB'),
  ('brown', '#8B4513'),
  ('red', '#FF0000'),
  ('green', '#008000'),
  ('yellow', '#FFFF00'),
  ('purple', '#800080')
ON CONFLICT (color) DO NOTHING;

-- Create a reference table for silhouettes
CREATE TABLE IF NOT EXISTS public.silhouette_types (
  id SERIAL PRIMARY KEY,
  silhouette TEXT UNIQUE NOT NULL
);

-- Insert silhouette data
INSERT INTO public.silhouette_types (silhouette) VALUES
  ('fitted'),
  ('straight'),
  ('relaxed'),
  ('oversized'),
  ('wide-leg'),
  ('tapered'),
  ('A-line'),
  ('bodycon'),
  ('flowy')
ON CONFLICT (silhouette) DO NOTHING;

-- Enable RLS on reference tables (read-only for all authenticated users)
ALTER TABLE public.clothing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.color_palette ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silhouette_types ENABLE ROW LEVEL SECURITY;

-- Policies for reference tables (all authenticated users can read)
CREATE POLICY "Anyone can view clothing categories" ON public.clothing_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view color palette" ON public.color_palette
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can view silhouette types" ON public.silhouette_types
  FOR SELECT TO authenticated USING (true);
