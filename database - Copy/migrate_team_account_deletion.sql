BEGIN;

-- Soft deletion keeps operational and audit foreign keys intact.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMIT;
