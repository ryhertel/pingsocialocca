

## Plan: Copy Link Button + Scroll Animations

### 1. Add "Copy Link" button to ShareSection

**File:** `src/components/landing/ShareSection.tsx`

- Import `useState` from React, `Copy` and `Check` icons from lucide-react
- Add a "Copy Link" button alongside the social platform buttons in the same flex container
- On click, use `navigator.clipboard.writeText(SHARE_URL)` and show a temporary "Copied!" state (swap icon from `Copy` to `Check` for ~2 seconds using local state)
- Style it consistently with the existing social buttons but with a slightly distinct look (e.g. dashed border) to differentiate it as a utility action

### 2. Add scroll-triggered entrance animations to all landing sections

Sections that **already have** framer-motion `whileInView` animations (no changes needed):
- `FeaturesSection` - each feature card animates in
- `IntegrationsSection` - each integration card animates in
- `HowItWorksSection` - each step animates in
- `ShareSection` - heading and buttons animate in

Sections that **need** scroll animations added:

**`src/components/landing/SchemaSection.tsx`**
- Import `motion` from framer-motion
- Wrap the heading/subheading block in a `motion.div` with `whileInView` fade-up
- Wrap the code block in a `motion.div` with a slight delay

**`src/components/landing/CtaSections.tsx`**
- Import `motion` from framer-motion
- In both `DemoCtaSection` and `FinalCtaSection`, wrap the content in `motion.div` with `initial={{ opacity: 0, y: 24 }}`, `whileInView={{ opacity: 1, y: 0 }}`, `viewport={{ once: true }}`

All animations will use consistent parameters: `duration: 0.5`, `ease: [0.16, 1, 0.3, 1]`, `viewport: { once: true, margin: '-60px' }` to match existing patterns in FeaturesSection/HowItWorksSection.

