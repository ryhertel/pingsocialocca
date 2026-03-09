
Goal: Update the footer GitHub link label to “Star us on GitHub” while keeping the same URL.

Implementation plan:
1. Edit `src/components/landing/LandingFooter.tsx`.
2. In the brand section’s GitHub anchor (`href="https://github.com/socialocca/ping"`), change the visible text from `GitHub` to `Star us on GitHub`.
3. Keep the existing icon (`<Github ... />`), URL, target/rel attributes, and styling classes unchanged to preserve behavior and visual consistency.

Acceptance checks:
- Footer still links to `https://github.com/socialocca/ping`.
- Link text renders exactly as “Star us on GitHub”.
- Existing layout/spacing in the brand column remains intact.
