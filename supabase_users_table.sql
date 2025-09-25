-- Create users table to store user information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  -- Onboarding fields
  sizes JSONB, -- {top: "M", bottom: "32", shoe: "9"}
  budget_band TEXT CHECK (budget_band IN ('low', 'mid', 'high')),
  vibes TEXT[], -- ['minimal', 'tailored', 'street-lite']
  palette TEXT[], -- ['black', 'cream', 'navy', 'camel']
  climate TEXT DEFAULT 'temperate',
  brands TEXT[], -- ['Zara', 'Uniqlo', 'Everlane']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own data
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow users to insert their own data
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile when someone signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at when user data changes
CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- CLOSET ITEMS TABLE
-- ==============================================

-- Create closet_items table for user wardrobe
CREATE TABLE IF NOT EXISTS public.closet_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL, -- top, bottom, dress, outerwear, shoes, bag, accessory
  subcategory TEXT, -- tee, blouse, sweater, blazer; jeans, trousers, skirt
  color TEXT NOT NULL, -- black, white, cream, navy, etc.
  silhouette TEXT NOT NULL, -- fitted, straight, relaxed, oversized, wide-leg, tapered
  season TEXT DEFAULT 'all-season', -- all-season, warm, cool
  notes TEXT,
  wear_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for closet_items
ALTER TABLE public.closet_items ENABLE ROW LEVEL SECURITY;

-- Policies for closet_items
CREATE POLICY "Users can view own closet items" ON public.closet_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own closet items" ON public.closet_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own closet items" ON public.closet_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own closet items" ON public.closet_items
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- CAPSULES TABLE
-- ==============================================

-- Create capsules table for wardrobe capsules
CREATE TABLE IF NOT EXISTS public.capsules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  owned_item_ids UUID[] NOT NULL, -- up to 20 items from closet_items
  gap_specs JSONB[] NOT NULL, -- [{category:"jeans", color:"dark indigo", silhouette:"straight"}]
  reasons JSONB NOT NULL, -- map of gap -> reason string
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for capsules
ALTER TABLE public.capsules ENABLE ROW LEVEL SECURITY;

-- Policies for capsules
CREATE POLICY "Users can view own capsules" ON public.capsules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capsules" ON public.capsules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capsules" ON public.capsules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own capsules" ON public.capsules
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- OUTFITS TABLE
-- ==============================================

-- Create outfits table for generated looks
CREATE TABLE IF NOT EXISTS public.outfits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  item_ids UUID[] NOT NULL, -- uses closet_items IDs
  gap_specs JSONB[], -- for gaps, store spec objects in metadata
  occasion TEXT NOT NULL, -- work, casual, evening
  score INTEGER DEFAULT 0, -- outfit quality score
  saved BOOLEAN DEFAULT FALSE,
  worn BOOLEAN DEFAULT FALSE,
  worn_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB, -- rule flags, colors used, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for outfits
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

-- Policies for outfits
CREATE POLICY "Users can view own outfits" ON public.outfits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outfits" ON public.outfits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outfits" ON public.outfits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outfits" ON public.outfits
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- SUGGESTIONS TABLE
-- ==============================================

-- Create suggestions table for gap shopping
CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  gap_spec JSONB NOT NULL, -- normalized spec for the gap
  options JSONB[] NOT NULL, -- [{title, price, url, image, tier}]
  source TEXT DEFAULT 'manual', -- manual, affiliate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for suggestions
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Policies for suggestions
CREATE POLICY "Users can view own suggestions" ON public.suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions" ON public.suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON public.suggestions
  FOR UPDATE USING (auth.uid() = user_id);

-- ==============================================
-- EVENTS TABLE
-- ==============================================

-- Create events table for analytics
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- view_page, upload_item, confirm_tag, generate_capsule, etc.
  entity_id UUID, -- reference to related entity (closet_item, outfit, etc.)
  metadata JSONB, -- additional event data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies for events
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- UPDATE TRIGGERS
-- ==============================================

-- Add update triggers for all tables
CREATE OR REPLACE TRIGGER update_closet_items_updated_at
  BEFORE UPDATE ON public.closet_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_capsules_updated_at
  BEFORE UPDATE ON public.capsules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_outfits_updated_at
  BEFORE UPDATE ON public.outfits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
