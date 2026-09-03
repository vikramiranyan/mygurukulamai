-- Store the optional backend user's Drive authorization state with the parent row.
-- The hosted GitHub Pages application remains Drive-first and does not use this API.
ALTER TABLE parents
ADD COLUMN IF NOT EXISTS drive_access BOOLEAN NOT NULL DEFAULT FALSE;
