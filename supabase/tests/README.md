# Access-rule tests

These run the migration on a throw-away local Postgres (with a stub of Supabase's `auth` schema)
and check, per user, exactly what they can read and write.

    createdb cltest
    psql -d cltest -f supabase_auth_stub.sql -f ../migrations/001_init.sql
    psql -d cltest -f ../migrations/002_assignments_and_features.sql
    psql -d cltest -f rls_test.sql
    psql -d cltest -f rls_test_assignments.sql   # run after rls_test.sql

Read the `expect:` notes next to each result. Re-run after any change to the migration.

## Invitation function test

Needs Deno and Node. Starts the function against a fake Supabase and checks who may invite whom:

    DENO_BIN=deno node invite_function_test.mjs
