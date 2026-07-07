-- Add an "Agent" role, functionally identical to "Commissioner" (can post and
-- manage property listings, log sales) but stored as its own enum value so
-- public profiles can show "Agent" vs "Commissioner" distinctly.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';
