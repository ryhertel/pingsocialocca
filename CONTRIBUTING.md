# Contributing to Ping

Thanks for your interest in contributing! Here's how to get started.

## Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct. Please be respectful, inclusive, and constructive in all interactions — issues, PRs, and discussions alike.

## Getting Started

1. **Fork** the repo and clone your fork
2. Install dependencies: `npm install`
3. Create a branch (see [Branching Strategy](#branching-strategy) below)
4. Make your changes
5. Run the dev server to test: `npm run dev`
6. Commit and push your branch
7. Open a **Pull Request** against `main`

## Branching Strategy

Use descriptive prefixes so reviewers can tell the intent at a glance:

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New functionality | `feature/webhook-retry` |
| `bugfix/` | Bug fixes | `bugfix/event-timestamp` |
| `docs/` | Documentation only | `docs/update-readme` |
| `refactor/` | Code cleanup / restructure | `refactor/store-split` |

Always branch from the latest `main`.

## Development

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (also type-checks)
npm run build:dev  # Dev build (skips tsc)
npm run lint       # Run ESLint
npm run test       # Run Vitest once
npm run test:watch # Run Vitest in watch mode
```

### Running Edge Functions Locally

Backend functions live in `supabase/functions/`. Each folder is an independent Deno edge function that deploys automatically when merged.

### Tests

- Unit / integration tests use **Vitest** and live alongside source files or in `src/test/`.
- Run `npm run test` before submitting a PR to catch regressions.

## Architecture Overview

A quick tour of the codebase to help you find your way:

```
src/
├── components/
│   ├── landing/    # Marketing / landing page sections
│   ├── ping/       # Core app UI (chat, composer, panels, etc.)
│   └── ui/         # Shared shadcn/ui primitives
├── hooks/          # Custom React hooks (mobile detection, analytics, shortcuts)
├── lib/
│   ├── connectors/ # Connector definitions & types
│   ├── ingest/     # Event ingestion pipeline (routing, reactions, redaction)
│   ├── themes.ts   # Theme configuration
│   └── types.ts    # Shared TypeScript types
├── pages/          # Route-level page components
├── stores/         # Zustand state stores
└── integrations/   # Auto-generated backend client (do not edit)

supabase/
└── functions/      # Deno edge functions (ingest, analytics, etc.)
```

### Key Conventions

- **Design tokens** — always use Tailwind semantic tokens from `index.css`; never hardcode colours.
- **State management** — Zustand stores in `src/stores/`.
- **Components** — small, focused, one responsibility per file.

## Guidelines

- **Keep PRs focused** — one feature or fix per PR
- **Follow existing patterns** — match the code style and component structure already in place
- **Use design tokens** — reference Tailwind semantic tokens from `index.css`, never hardcode colors
- **TypeScript** — all new code should be fully typed
- **Test your changes** — make sure `npm run build` and `npm run test` pass before submitting

## Reporting Bugs

Open an [issue](https://github.com/ryhertel/pingsocialocca/issues) with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser / OS info

## Feature Requests

Open an [issue](https://github.com/ryhertel/pingsocialocca/issues) and describe the use case. We'd love to hear your ideas.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
