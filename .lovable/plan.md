

## Add GitHub Star Badge to LandingNav

**File:** `src/components/landing/LandingNav.tsx`

**Changes:**
1. Import `Github` from `lucide-react`
2. Add a GitHub star badge link between the theme toggle and "Launch App" button (desktop only), styled as a small inline-flex anchor with the shields.io badge
3. Also add it in the mobile sheet menu

**Desktop (after theme toggle, before Launch App button ~line 156-157):**
```tsx
<a
  href="https://github.com/socialocca/ping"
  target="_blank"
  rel="noopener noreferrer"
  className="hidden sm:inline-flex items-center"
>
  <img 
    src="https://img.shields.io/github/stars/socialocca/ping?style=social" 
    alt="GitHub stars" 
    className="h-5"
  />
</a>
```

**Mobile sheet:** Add a similar link in the nav items section.

