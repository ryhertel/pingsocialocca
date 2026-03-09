

## Add CI Workflow and Security Policy

### Files to create:

1. **`.github/workflows/ci.yml`** — GitHub Actions workflow triggered on pull requests to `main`:
   - Checkout, setup Node 20, install deps (`npm ci`), run `npm run lint`, run `npm run build`

2. **`SECURITY.md`** — Responsible disclosure policy:
   - Contact: `security@socialocca.io`
   - Guidelines for reporting vulnerabilities privately
   - Expected response timeline (48h acknowledgment)
   - Scope and out-of-scope items

No application code changes needed.

