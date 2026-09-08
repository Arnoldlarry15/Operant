-- Creates a dedicated, least-privilege application role for the Operant app
-- to connect as via RDS IAM authentication, instead of the Aurora master
-- user ("postgres"). The master user has full superuser-equivalent rights;
-- this role can only touch the app's own tables.
--
-- Safe to re-run: every statement is idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'operant_app') THEN
    CREATE ROLE operant_app WITH LOGIN;
  END IF;
END
$$;

-- Enables RDS IAM token authentication for this role (no password needed,
-- the IAM auth token from lib/db.ts is presented in place of a password).
GRANT rds_iam TO operant_app;

GRANT CONNECT ON DATABASE postgres TO operant_app;
GRANT USAGE ON SCHEMA public TO operant_app;

-- Row-level access on exactly the tables the app reads/writes today.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users,
  companions,
  conversations,
  companion_skills,
  orders,
  pending_skills,
  user_milestones,
  rate_limits,
  archived_free_agents
TO operant_app;

-- Needed for any serial/identity columns; harmless no-op for tables that
-- only use gen_random_uuid() and have no sequences.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO operant_app;

-- No DDL rights, no ability to alter/drop tables, no access to roles or
-- other system catalogs beyond the standard read-only defaults, and
-- explicitly no ownership of any object.

-- Make sure future tables created by the migration runner (which connects
-- as the master user) automatically extend the same grants to operant_app,
-- so this doesn't quietly go stale the next time a table is added.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO operant_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO operant_app;
