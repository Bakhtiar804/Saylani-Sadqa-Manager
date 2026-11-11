-- Preserve installations where users was renamed to team_members, including
-- its id/user_id columns. This simple view is automatically updatable: account
-- reads, inserts, updates and soft deletion all use the existing table rows.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    IF to_regclass('public.team_members') IS NULL THEN
      RAISE EXCEPTION 'Neither users nor team_members exists; restore the account schema before continuing.';
    END IF;
    EXECUTE $view$
      CREATE VIEW public.users WITH (security_invoker = true) AS
      SELECT team_record_id AS id, team_id AS user_id, full_name, email, phone,
        city_id, role_id, identity_type, account_status, password_hash,
        deleted_at, created_at
      FROM public.team_members
    $view$;
  END IF;
END $$;
COMMIT;
