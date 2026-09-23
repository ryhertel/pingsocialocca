<div align="center">

# Ping

**Open-source notification visualizer**

[![CI](https://github.com/ryhertel/pingsocialocca/actions/workflows/ci.yml/badge.svg)](https://github.com/ryhertel/pingsocialocca/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/ryhertel/pingsocialocca?style=social)](https://github.com/ryhertel/pingsocialocca)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Live Demo](https://pingsocialocca.lovable.app) · [Report Bug](https://github.com/ryhertel/pingsocialocca/issues) · [Request Feature](https://github.com/ryhertel/pingsocialocca/issues)

</div>

---

## What is Ping?

Ping gives your notifications a face. Point a webhook at it — a deploy, a payment, an
alert, a line of text — and a pair of eyes reacts with an expression, a sound and a
burst of colour.

GitHub, Stripe and Vercel work by pasting a URL: Ping maps their payloads server-side, so
there is no Zapier step in between. Anything else that can POST JSON works too, and the
only required field is a title.

## Features

- 👀 **Expressive face** — a canvas of eyes that emotes, with synthesized sound and particle spectacles
- 🔌 **Direct webhooks** — GitHub, Stripe and Vercel payloads are adapted server-side; no middleware
- 🔑 **No account** — one click mints a channel and a webhook URL you can paste anywhere
- 📡 **Real-time event feed** — searchable, filterable, streamed over SSE
- 🎚️ **Severity as intensity** — 0 is ambient and stays quiet, 3 wakes you up
- 💬 **Docked chat** — conversational interface with markdown support
- 🎨 **Themeable** — multiple built-in themes with full customisation
- 📱 **Mobile-first** — responsive PWA with haptics and pull-to-refresh
- ⌨️ **Keyboard shortcuts** — power-user friendly

## Tech Stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Zustand](https://zustand-demo.pmnd.rs/)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/ryhertel/pingsocialocca.git
cd pingsocialocca

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:8080`. It starts reacting immediately in
demo mode — no account, no configuration.

## Sending events

Click **Make it mine** to get a webhook URL, then:

```bash
curl -X POST "<your webhook URL>" \
  -H "content-type: application/json" \
  -d '{"title":"Invoice #204 paid"}'
```

Ping reads the title for keywords, so that one reacts with a ka-ching and a coin shower
without any further configuration. For GitHub, Stripe or Vercel, paste the same URL into
their webhook settings — their raw payloads are understood as they come.


### Email it instead

Some things can send email but not webhooks. Every channel gets its own inbound
address, so you can forward to it or point an alert at it and Ping reacts the same
way. The subject becomes the title.

Requires a one-time Cloudflare setup — see [cloudflare/README.md](cloudflare/README.md).

See [/docs](https://pingsocialocca.lovable.app/docs) for the full schema and per-connector
setup.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  A product by <a href="https://socialocca.com">Socialocca</a>
</div>
