# Deploy edge functions from current repo code

## Steps
1. Deploy `ingest`, `issue-read-token`, `events-read`, `events-stream` directly with the deploy tool. No logic changes.
2. Only if a direct deploy fails: add a one-line comment at the top of each `index.ts` and redeploy.
3. Verify:
   - POST a ~5KB JSON body to `/functions/v1/ingest?key=0123456789abcdef0123456789abcdef`. Expect 401, not 413.
   - OPTIONS preflight on `ingest` should list `x-ping-write-token` in its allowed headers.
   - Call `issue-read-token` with the `claim` action. It should no longer return the old 401 for an unknown action.
4. Report the status codes I get back.
