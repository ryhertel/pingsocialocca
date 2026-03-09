

## Update GitHub Repository URL

The current codebase references `socialocca/ping` but your actual repository is `ryhertel/pingsocialocca`. We need to update all GitHub URLs and shields.io badge references.

**Files to update:**

1. **`src/components/landing/LandingNav.tsx`** — Update 2 occurrences (desktop + mobile):
   - GitHub link: `https://github.com/ryhertel/pingsocialocca`
   - Badge: `https://img.shields.io/github/stars/ryhertel/pingsocialocca?style=social`

2. **`src/components/landing/LandingFooter.tsx`** — Update 1 occurrence:
   - GitHub link: `https://github.com/ryhertel/pingsocialocca`
   - Badge: `https://img.shields.io/github/stars/ryhertel/pingsocialocca?style=social`

**Note:** The repository needs to be **public** on GitHub for the shields.io star badges to display correctly. If it's currently private, the badges will show an error state.

