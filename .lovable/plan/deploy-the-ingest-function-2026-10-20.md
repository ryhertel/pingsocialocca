# Deploy the ingest function

## Steps
1. Deploy `ingest` from the current repo code with the deploy tool. No code changes.
2. Run the existing email adapter tests (`src/test/emailAdapter.test.ts`) to confirm the Gmail forwarding-confirmation handling passes.
3. Verify the live function: POST a ~5KB JSON body to `/functions/v1/ingest?key=0123456789abcdef0123456789abcdef` and expect 401 (not 413), so the deploy did not regress.
4. Report the results.
