BEGIN;

DROP INDEX IF EXISTS collections_rider_task_id_unique;
CREATE UNIQUE INDEX collections_rider_task_id_unique ON collections(rider_task_id)
WHERE rider_task_id IS NOT NULL AND collection_status<>'Voided';

CREATE OR REPLACE FUNCTION rider_cash_total(counts JSONB) RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item RECORD; denomination NUMERIC; quantity NUMERIC; total NUMERIC:=0;
BEGIN
  IF counts IS NULL OR jsonb_typeof(counts)<>'object' THEN
    RAISE EXCEPTION 'A note and coin count is required.' USING ERRCODE='23514';
  END IF;
  FOR item IN SELECT key,value FROM jsonb_each(counts) LOOP
    denomination:=CASE item.key
      WHEN 'coin_1' THEN 1 WHEN 'coin_2' THEN 2 WHEN 'coin_5' THEN 5 WHEN 'coin_10' THEN 10
      WHEN 'note_10' THEN 10 WHEN 'note_20' THEN 20 WHEN 'note_50' THEN 50 WHEN 'note_100' THEN 100
      WHEN 'note_500' THEN 500 WHEN 'note_1000' THEN 1000 WHEN 'note_5000' THEN 5000 ELSE NULL END;
    IF denomination IS NULL OR jsonb_typeof(item.value)<>'number' THEN
      RAISE EXCEPTION 'Unsupported denomination or invalid quantity.' USING ERRCODE='23514';
    END IF;
    quantity:=(item.value::text)::numeric;
    IF quantity<0 OR quantity<>trunc(quantity) OR quantity>100000000 THEN
      RAISE EXCEPTION 'Cash quantities must be nonnegative whole numbers.' USING ERRCODE='23514';
    END IF;
    total:=total+denomination*quantity;
  END LOOP;
  IF total<=0 OR total>100000000 THEN
    RAISE EXCEPTION 'Cash count total must be positive and within the collection limit.' USING ERRCODE='23514';
  END IF;
  RETURN total;
END $$;

CREATE OR REPLACE FUNCTION guard_rider_collection_insert() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE task RECORD;
BEGIN
  IF NEW.is_demo_record OR current_setting('saylani.workflow_recovery',true)='on' THEN RETURN NEW; END IF;
  SELECT * INTO task FROM rider_tasks WHERE task_id=NEW.rider_task_id FOR UPDATE;
  IF NOT FOUND OR task.task_type<>'Scheduled Collection' OR task.task_status<>'In Progress'
    OR task.workflow_stage<>'counting' OR task.box_id<>NEW.box_id OR task.rider_id<>NEW.rider_id THEN
    RAISE EXCEPTION 'Cash can only be submitted for its assigned task after departure, arrival and counting.' USING ERRCODE='23514';
  END IF;
  IF rider_cash_total(NEW.cash_breakdown)<>NEW.collection_amount_pkr THEN
    RAISE EXCEPTION 'Collection amount must equal its denomination count.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rider_collection_insert_guard ON collections;
CREATE TRIGGER rider_collection_insert_guard BEFORE INSERT ON collections
FOR EACH ROW EXECUTE FUNCTION guard_rider_collection_insert();

CREATE OR REPLACE FUNCTION guard_rider_task_transition() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE allowed_stage TEXT;
BEGIN
  IF NEW.task_type<>'Scheduled Collection' OR current_setting('saylani.workflow_recovery',true)='on'
    OR (NEW.task_status IS NOT DISTINCT FROM OLD.task_status AND NEW.workflow_stage IS NOT DISTINCT FROM OLD.workflow_stage) THEN RETURN NEW; END IF;
  IF OLD.task_status IN ('Completed','Cancelled') THEN
    RAISE EXCEPTION 'A closed task cannot be reopened by a progress update.' USING ERRCODE='23514';
  END IF;
  IF NEW.task_status='Completed' OR NEW.workflow_stage IN ('submitted','completed') THEN
    IF OLD.task_status<>'In Progress' OR OLD.workflow_stage<>'counting'
      OR NEW.task_status<>'Completed' OR NEW.workflow_stage<>'submitted' THEN
      RAISE EXCEPTION 'Departure cannot complete a collection task. Complete each collection step first.' USING ERRCODE='23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM collections c JOIN field_collection_logs log
      ON log.task_id=NEW.task_id AND log.box_id=c.box_id AND log.rider_id=c.rider_id
        AND log.total_cash_counted_pkr=c.collection_amount_pkr
      WHERE c.rider_task_id=NEW.task_id AND c.box_id=NEW.box_id AND c.rider_id=NEW.rider_id
        AND c.collection_status<>'Voided' AND rider_cash_total(c.cash_breakdown)=c.collection_amount_pkr) THEN
      RAISE EXCEPTION 'A completed task requires its saved denomination count, collection and field visit.' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage THEN
    allowed_stage:=CASE OLD.workflow_stage WHEN 'assigned' THEN 'departed' WHEN 'departed' THEN 'arrived' WHEN 'arrived' THEN 'counting' ELSE NULL END;
    IF NEW.workflow_stage IS DISTINCT FROM allowed_stage OR allowed_stage IS NULL
      OR NEW.task_status<>'In Progress' OR OLD.task_status NOT IN ('Assigned','In Progress') THEN
      RAISE EXCEPTION 'Collection steps must proceed in order.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rider_task_transition_guard ON rider_tasks;
CREATE TRIGGER rider_task_transition_guard BEFORE UPDATE OF task_status,workflow_stage ON rider_tasks
FOR EACH ROW EXECUTE FUNCTION guard_rider_task_transition();
COMMIT;
