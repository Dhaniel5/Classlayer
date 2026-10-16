# Access-rule tests

These run the migration on a throw-away local Postgres (with a stub of Supabase's `auth` schema)
and check, per user, exactly what they can read and write.

    createdb cltest
    psql -d cltest -f supabase_auth_stub.sql -f ../migrations/001_init.sql
    psql -d cltest -f rls_test.sql

Read the `expect:` notes next to each result. Re-run after any change to the migration.
