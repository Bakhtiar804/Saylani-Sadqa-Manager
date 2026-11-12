-- Read-only analytics copilot persistence.
-- Run this once against the intended Neon development database.
BEGIN;

CREATE TABLE IF NOT EXISTS assistant_profiles (
  team_id VARCHAR(40) PRIMARY KEY REFERENCES team_members(team_id) ON DELETE CASCADE,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_threads (
  thread_id VARCHAR(80) PRIMARY KEY,
  team_id VARCHAR(40) NOT NULL REFERENCES team_members(team_id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL DEFAULT 'New analysis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE chat_threads
  ADD COLUMN IF NOT EXISTS context_summary TEXT,
  ADD COLUMN IF NOT EXISTS context_token_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS context_compacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS chat_threads_team_updated_idx
  ON chat_threads (team_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  message_id VARCHAR(80) PRIMARY KEY,
  thread_id VARCHAR(80) NOT NULL REFERENCES chat_threads(thread_id) ON DELETE CASCADE,
  team_id VARCHAR(40) NOT NULL REFERENCES team_members(team_id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_created_idx
  ON chat_messages (thread_id, created_at ASC);

INSERT INTO assistant_profiles (team_id, display_name, email)
SELECT team_id, full_name, email
FROM team_members
WHERE identity_type = 'login_account'
ON CONFLICT (team_id) DO UPDATE
SET display_name = EXCLUDED.display_name, email = EXCLUDED.email;

CREATE OR REPLACE FUNCTION ensure_assistant_profile_for_login()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.identity_type = 'login_account' THEN
    INSERT INTO assistant_profiles (team_id, display_name, email)
    VALUES (NEW.team_id, NEW.full_name, NEW.email)
    ON CONFLICT (team_id) DO UPDATE
    SET display_name = EXCLUDED.display_name, email = EXCLUDED.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_member_assistant_profile_trigger ON team_members;
CREATE TRIGGER team_member_assistant_profile_trigger
AFTER INSERT OR UPDATE OF full_name, email, identity_type ON team_members
FOR EACH ROW EXECUTE FUNCTION ensure_assistant_profile_for_login();

COMMIT;
