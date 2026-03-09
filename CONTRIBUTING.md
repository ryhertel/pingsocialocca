# Contributing to Ping

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. **Fork** the repo and clone your fork
2. Install dependencies: `npm install`
3. Create a branch: `git checkout -b my-feature`
4. Make your changes
5. Run the dev server to test: `npm run dev`
6. Commit and push your branch
7. Open a **Pull Request** against `main`

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
npm run test      # Run tests
```

## Guidelines

- **Keep PRs focused** — one feature or fix per PR
- **Follow existing patterns** — match the code style and component structure already in place
- **Use design tokens** — reference Tailwind semantic tokens from `index.css`, never hardcode colors
- **TypeScript** — all new code should be fully typed
- **Test your changes** — make sure `npm run build` passes before submitting

## Reporting Bugs

Open an [issue](https://github.com/ryhertel/pingsocialocca/issues) with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser / OS info

## Feature Requests

Open an [issue](https://github.com/ryhertel/pingsocialocca/issues) and describe the use case. We'd love to hear your ideas.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
