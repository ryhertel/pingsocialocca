

## Plan: Add Social Sharing Section to Landing Page

### What
A visually striking "Share Ping" section placed between `DemoCtaSection` and `FinalCtaSection` with social media sharing buttons (Twitter/X, LinkedIn, Reddit, Facebook) and an animated, eye-catching design.

### Design
- Dark card with a radial gradient glow background (using the primary/glow colors)
- Heading like "Spread the word" with a subheading encouraging sharing
- Row of social platform buttons styled as glass-morphic cards with hover animations (scale + glow)
- Each button opens a pre-filled share URL in a new tab with a message like "Check out Ping — give your AI agents a face!"
- Framer Motion stagger animation on the social icons as they scroll into view
- A subtle sparkle/share icon accent

### New File
`src/components/landing/ShareSection.tsx`
- Exports `ShareSection` component
- Contains share URL generators for Twitter, LinkedIn, Reddit, Facebook (using `https://pingsocialocca.lovable.app` as the shared URL)
- Each platform rendered as an icon button with platform name, using lucide `Share2` + custom SVG or text labels
- Uses `motion.div` with `whileInView` stagger for entrance animation

### Modified Files
`src/pages/Landing.tsx`
- Import `ShareSection`
- Place `<ShareSection />` between `<DemoCtaSection />` and `<FinalCtaSection />`

