BEGIN;

CREATE TABLE IF NOT EXISTS activity_audit_log (
  audit_id CHAR(32) PRIMARY KEY,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(40) NOT NULL,
  action VARCHAR(40) NOT NULL,
  actor_team_id VARCHAR(40) NOT NULL REFERENCES team_members(team_id),
  before_data JSONB,
  after_data JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS activity_audit_entity_idx
  ON activity_audit_log (entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_audit_actor_idx
  ON activity_audit_log (actor_team_id, occurred_at DESC);

COMMIT;
