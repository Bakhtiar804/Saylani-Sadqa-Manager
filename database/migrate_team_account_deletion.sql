BEGIN;

-- Soft deletion keeps operational and audit foreign keys intact.
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMIT;
