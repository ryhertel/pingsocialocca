
## Plan: Expand the Landing Footer

Replace the minimal single-row footer with a proper multi-column footer that includes:

### Layout (3 columns + brand row)

```text
┌──────────────────────────────────────────────────────────┐
│  [Ping Logo]   Open-source presence UI for AI agents.    │
│                Made by socialocca.io                     │
├────────────────┬───────────────────┬─────────────────────┤
│   Product      │   Docs            │   Resources         │
│   Launch App   │   Integration     │   Event Schema      │
│   Connectors   │   Guide           │   Troubleshooting   │
│   How It Works │   Event Schema    │   GitHub / Open Src │
│   Features     │   Troubleshooting │                     │
│   Integrations │   Connectors      │                     │
├────────────────┴───────────────────┴─────────────────────┤
│  © 2025 Ping · Made by socialocca.io                     │
└──────────────────────────────────────────────────────────┘
```

### Columns
- **Product**: Launch App, Connectors, How It Works (anchor), Features (anchor), Integrations (anchor)
- **Docs**: Integration Guide (`/docs`), Event Schema (`/docs#schema`), Troubleshooting (`/docs#troubleshooting`)
- **Connect**: Each connector template as a link to `/docs#<connector-id>` (dynamically from `connectorTemplates`)

### Brand / Credit section
- Ping logo + tagline: "Open-source presence UI for AI agents"
- "Made with ♥ by [socialocca.io](https://socialocca.io)" as an external `<a>` link

### Bottom bar
- © year Ping · Made by [socialocca.io](https://socialocca.io)

### File to change
- **`src/components/landing/LandingFooter.tsx`** — full rewrite with multi-column grid layout

### Em dash removal
- Also fix the pending `index.html` em dash removal from the approved plan in the same pass (title and meta tags use `—` → `-`)
