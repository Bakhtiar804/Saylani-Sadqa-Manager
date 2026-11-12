BEGIN;

ALTER TABLE rider_tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(32) NOT NULL DEFAULT 'assigned',
  ADD COLUMN IF NOT EXISTS workflow_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE rider_tasks
SET workflow_stage = CASE task_status
  WHEN 'Assigned' THEN 'assigned'
  WHEN 'In Progress' THEN 'in_progress'
  WHEN 'Skipped' THEN 'skipped'
  WHEN 'Completed' THEN 'completed'
  WHEN 'Cancelled' THEN 'cancelled'
  ELSE LOWER(REPLACE(task_status, ' ', '_'))
END
WHERE workflow_stage IS DISTINCT FROM CASE task_status
  WHEN 'Assigned' THEN 'assigned'
  WHEN 'In Progress' THEN 'in_progress'
  WHEN 'Skipped' THEN 'skipped'
  WHEN 'Completed' THEN 'completed'
  WHEN 'Cancelled' THEN 'cancelled'
  ELSE LOWER(REPLACE(task_status, ' ', '_'))
END;

CREATE INDEX IF NOT EXISTS rider_tasks_completed_at_idx ON rider_tasks (completed_at DESC);
CREATE INDEX IF NOT EXISTS rider_tasks_workflow_stage_idx ON rider_tasks (workflow_stage, task_date);

COMMIT;
