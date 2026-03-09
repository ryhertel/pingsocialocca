
## Plan: Add GitHub link to footer brand section

**File:** `src/components/landing/LandingFooter.tsx`

Add a GitHub icon link directly below the "Made with ♥ by socialocca.io" line in the brand column. Import the `Github` icon from `lucide-react` and add an `<a>` tag pointing to the Ping GitHub repo.

**What changes:**
- Import `Github` from `lucide-react` (alongside existing `ExternalLink`)
- After the socialocca link in the brand `<div>`, add a new `<a>` with the GitHub icon + "GitHub" label, linking to the repo URL
- Style consistently with the existing socialocca link

I'll need to know the GitHub repo URL — I'll use a placeholder `https://github.com/socialocca/ping` that can be updated once confirmed. If the user has a specific URL they want, they can tell me — otherwise I'll use that pattern.

**Single edit to `src/components/landing/LandingFooter.tsx`:** lines 2 and 48–56 (import + brand section).
