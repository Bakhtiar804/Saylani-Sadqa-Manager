-- Canonical account table name. RENAME preserves rows, credentials, indexes,
-- stable account-ID values and all existing foreign keys without copying accounts.
BEGIN;
DO $$
DECLARE source_kind "char"; target_kind "char"; item RECORD;
BEGIN
  SELECT relkind INTO source_kind FROM pg_class WHERE oid=to_regclass('public.users');
  SELECT relkind INTO target_kind FROM pg_class WHERE oid=to_regclass('public.team_members');
  IF target_kind IS NULL AND source_kind='r' THEN
    ALTER TABLE public.users RENAME TO team_members;
  ELSIF target_kind='r' AND source_kind IS NULL THEN
    NULL; -- Already migrated.
  ELSE
    RAISE EXCEPTION 'Expected one physical account table: users before migration or team_members after migration. No data was changed.';
  END IF;
  FOR item IN SELECT * FROM (VALUES
    ('team_members','id','team_record_id'),
    ('team_members','user_id','team_id'),
    ('riders','user_id','team_id'),
    ('activity_audit_log','actor_user_id','actor_team_id'),
    ('box_inspections','inspected_by_user_id','inspected_by_team_id'),
    ('box_status_history','changed_by_user_id','changed_by_team_id'),
    ('cash_handover_deposits','received_by_user_id','received_by_team_id'),
    ('cash_handover_deposits','reconciled_by_user_id','reconciled_by_team_id'),
    ('collections','counted_by_user_id','counted_by_team_id'),
    ('collections','custodian_user_id','custodian_team_id'),
    ('collections','recorded_by_user_id','recorded_by_team_id'),
    ('collections','verified_by_user_id','verified_by_team_id'),
    ('donation_boxes','custodian_user_id','custodian_team_id'),
    ('field_collection_logs','counted_by_user_id','counted_by_team_id'),
    ('field_collection_logs','custodian_user_id','custodian_team_id'),
    ('field_collection_logs','verified_by_user_id','verified_by_team_id'),
    ('report_import_batches','actor_user_id','actor_team_id'),
    ('security_incidents','reported_by_user_id','reported_by_team_id')
  ) AS names(table_name,old_name,new_name) LOOP
    IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=item.table_name AND c.column_name=item.old_name) THEN
      IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=item.table_name AND c.column_name=item.new_name) THEN
        RAISE EXCEPTION 'Both account-reference names exist on %; manual reconciliation required.',item.table_name;
      END IF;
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I',item.table_name,item.old_name,item.new_name);
    END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='team_members' AND column_name='team_id') THEN
    RAISE EXCEPTION 'team_members must expose its stable team_id column.';
  END IF;
END $$;
COMMIT;
