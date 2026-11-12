-- Run after schema.sql and seed_demo.sql.
-- Copies legacy admin logins to team_members without changing app_admins.
-- If the legacy table is absent, this migration safely does nothing.
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.app_admins') IS NULL THEN
    RAISE NOTICE 'public.app_admins not found; no legacy accounts to migrate.';
  ELSE
    EXECUTE 'ALTER TABLE public.app_admins
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT ''admin''';

    EXECUTE $migration$
      INSERT INTO team_members (
        team_id,
        full_name,
        email,
        phone,
        city_id,
        role_id,
        identity_type,
        account_status,
        password_hash,
        created_at
      )
      SELECT
        'DBA-' || admin.id::TEXT,
        admin.full_name,
        admin.email,
        NULL,
        NULL,
        CASE
          WHEN LOWER(admin.role) IN ('super_admin', 'super admin') THEN 1
          ELSE 2
        END,
        'login_account',
        'active',
        admin.password_hash,
        admin.created_at
      FROM public.app_admins AS admin
      ON CONFLICT DO NOTHING
    $migration$;
  END IF;
END $$;

COMMIT;
