-- Room-labeled photo sections (e.g. "Living Room", "Kitchen") for the
-- Zillow-style sectioned gallery on the property page. Kept alongside the
-- existing flat `images` column (which stays in sync, flattened, for
-- every other place in the app that just shows images[0] as a thumbnail —
-- browse cards, agent listing carousels, recently-viewed, etc. — so none
-- of that code needs to change).
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS image_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS lot_size_sqm NUMERIC;
