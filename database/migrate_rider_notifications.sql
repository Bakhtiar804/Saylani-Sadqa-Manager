BEGIN;
ALTER TABLE rider_tasks ADD COLUMN IF NOT EXISTS notification_read_at TIMESTAMPTZ;
-- Historical tasks have no invented assignment timestamp.
ALTER TABLE rider_tasks ADD COLUMN IF NOT EXISTS notification_created_at TIMESTAMPTZ;
ALTER TABLE rider_tasks ALTER COLUMN notification_created_at SET DEFAULT CURRENT_TIMESTAMP;
COMMIT;
