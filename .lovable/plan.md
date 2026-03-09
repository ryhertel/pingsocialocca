

## Plan: Add GitHub Star Count Badge

**File:** `src/components/landing/LandingFooter.tsx`

Add a shields.io star count badge next to the "Star us on GitHub" link in the footer brand section.

**Implementation:**
1. Add an `<img>` tag after the GitHub link text displaying the shields.io badge
2. Use the URL: `https://img.shields.io/github/stars/socialocca/ping?style=social`
3. Style the badge to align with the existing link (small, subtle)

**Code change (lines 57-65):**
```tsx
<a
  href="https://github.com/socialocca/ping"
  target="_blank"
  rel="noopener noreferrer"
  className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
>
  <Github className="h-3.5 w-3.5" />
  Star us on GitHub
  <img 
    src="https://img.shields.io/github/stars/socialocca/ping?style=social" 
    alt="GitHub stars" 
    className="h-5"
  />
</a>
```

**Notes:**
- shields.io badges auto-update and are cached, so no API key needed
- The `style=social` variant shows star icon + count in a clean format
- If the repo doesn't exist yet, the badge will show "0" or a placeholder

