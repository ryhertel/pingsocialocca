# Email-in

An inbound email address per channel. Send mail to it and Ping reacts.

## Why this exists

Adapters only help sources that can already send a webhook. That covers most
developer and infrastructure tooling and almost no consumer software — but
nearly everything can email you. One address reaches the entire second category,
which no number of adapters can.

## How it fits together

```
someone@example.com
        │  sends mail to  a1b2c3…@in.yourdomain.com
        ▼
Cloudflare Email Routing  (MX records, catch-all)
        ▼
email-worker.js           extracts alias, subject, first real line of text
        │  POST /ingest?source=email&alias=a1b2c3…
        │  x-ping-email-secret: <shared secret>
        ▼
ingest                    alias → channel, emailAdapter → event
        ▼
the eyes react
```

Routing and authorization are deliberately separate. The **alias** says which
channel the message belongs to. The **shared secret** says the request came from
our relay. An email address is not a secret in practice — it ends up in
forwarding rules, address books and other people's inboxes — so it can route but
it cannot authorize.

## Setup

You need a domain on Cloudflare. Roughly ten minutes.

**1. Enable Email Routing.** Cloudflare dashboard → your domain → Email → Email
Routing. Cloudflare adds the MX records itself. A subdomain like
`in.yourdomain.com` keeps this away from your real mail.

**2. Create the Worker.** Workers & Pages → Create → Worker. Paste
[`email-worker.js`](./email-worker.js).

**3. Set the Worker's variables** (Settings → Variables):

| Name | Value |
|---|---|
| `PING_INGEST_URL` | `https://<project>.supabase.co/functions/v1/ingest` |
| `PING_EMAIL_SECRET` | a long random string — mark it **encrypted** |

**4. Set the same secret on Supabase**, as an edge function secret named
`PING_EMAIL_SECRET`. The two must match exactly or every message 401s.

```bash
openssl rand -hex 32
```

**5. Route mail to the Worker.** Email Routing → Routing rules → **Catch-all** →
Send to a Worker → pick the Worker. Catch-all is required: every channel gets its
own alias, so there is no fixed list of addresses.

**6. Tell the app the domain.** In `.env`:

```
VITE_PING_EMAIL_DOMAIN="in.yourdomain.com"
```

Without it the app hides the email section entirely, rather than showing an
address that cannot receive anything.

## Verifying

Claim a channel, copy the address, and send it a message. Within a couple of
seconds the eyes should react and the event should appear in the feed with
source `email`.

If nothing arrives, in order:

- **Worker logs** (Cloudflare → Workers → your worker → Logs). `ingest returned
  401` means the two secrets disagree. `ingest returned 400` means the alias did
  not match `^[0-9a-f]{24}$`.
- **No log line at all** means Email Routing never invoked the Worker — check the
  catch-all rule and that the MX records resolve.
- **A 401 with no Worker error** usually means the channel row has no
  `email_alias`; channels claimed before this feature shipped do not have one.
  Rotating the address from the app backfills it.

## What it does with a message

- **Subject** becomes the title. No subject: the first real line of the body is
  promoted instead.
- **Body** is reduced to the first line or two of actual content. Quoted replies,
  signatures after `-- `, and boilerplate like "Sent from my iPhone" are dropped,
  and hard-wrapped lines are joined back together.
- **Sender domain** becomes a tag, so you can filter by who sent it.
- **Message-ID** becomes the dedupe key, so a redelivery does not double up.
- Attachments are ignored. The body is read up to 256KB and then truncated.
- Everything is redacted server-side as usual — URLs, tokens and code blocks are
  stripped before storage.

## Known limits

- **Spam.** A live address attracts it. The address is unguessable, so this only
  matters once it leaks — which is why rotation is one click in the app. The
  Worker does no SPF/DKIM checking of its own yet; Cloudflare's own filtering sits
  in front.
- **No threading.** Each message is a separate event.
- **Plain text only.** HTML mail is stripped to text, which is lossy for anything
  heavily formatted.
