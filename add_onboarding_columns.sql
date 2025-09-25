-- Add onboarding columns to existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS sizes JSONB,
ADD COLUMN IF NOT EXISTS budget_band TEXT CHECK (budget_band IN ('low', 'mid', 'high')),
ADD COLUMN IF NOT EXISTS vibes TEXT[],
ADD COLUMN IF NOT EXISTS palette TEXT[],
ADD COLUMN IF NOT EXISTS climate TEXT DEFAULT 'temperate',
ADD COLUMN IF NOT EXISTS brands TEXT[];
