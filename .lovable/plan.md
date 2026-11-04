## Apply usage-protections migration, then deploy ingest and issue-read-token

No code changes.

1. Apply `supabase/migrations/20261104120000_usage_protections.sql` byte-for-byte:
   - shared rate-limit table `ping_rate_limits` + atomic `ping_rate_hit()` (service role only)
   - index on `ping_events.created_at`
   - `prune_ping_data()` (30 days / 5,000 per channel for events, 180 days analytics, 2 days counters), scheduled nightly at 03:17 UTC via pg_cron if available
2. Confirm it landed: table, both functions, index, and whether the `ping-prune` cron job was created (if pg_cron is missing, report it rather than change SQL).
3. Deploy `ingest` and `issue-read-token` from current code.
4. Verify:
   - ~5KB POST to `ingest?key=0123…cdef` still returns 401, not 413
   - `ingest` calls to `ping_rate_hit` work (check function logs for RPC errors)
   - `issue-read-token` responds normally (no 500)

### Notes
- The table has no explicit GRANT; access goes only through the SECURITY DEFINER function, so this is fine as written. If the functions touch the table directly and hit a permission error, I'll stop and report rather than edit the migration.
