BEGIN;
ALTER TABLE rider_tasks ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(20) NOT NULL DEFAULT 'assigned';
ALTER TABLE rider_tasks ADD COLUMN IF NOT EXISTS workflow_events JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS cash_breakdown JSONB;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS rider_task_id VARCHAR(20) REFERENCES rider_tasks(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS collections_rider_task_id_unique ON collections(rider_task_id) WHERE rider_task_id IS NOT NULL;
-- Historical tasks retain their existing status; do not invent historical timestamps.
UPDATE rider_tasks SET workflow_stage = CASE WHEN task_status='Completed' THEN 'submitted' ELSE 'departed' END
WHERE workflow_stage='assigned' AND task_status IN ('Completed','In Progress');
COMMIT;
