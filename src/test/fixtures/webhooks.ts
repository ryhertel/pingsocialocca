/**
 * Webhook fixtures, trimmed from real provider deliveries.
 *
 * These are .ts modules rather than .json on purpose: tsconfig.app.json does not
 * set resolveJsonModule, so a JSON import would break under `tsc --noEmit`.
 */

export const githubPush = {
  ref: 'refs/heads/main',
  deleted: false,
  repository: { full_name: 'ryhertel/pingsocialocca' },
  pusher: { name: 'ryhertel' },
  commits: [{ id: 'a1b2c3d' }, { id: 'd4e5f6a' }],
  head_commit: { id: 'a1b2c3d', message: 'feat(ingest): add provider adapters\n\nLong body here.' },
};

export const githubPing = {
  zen: 'Non-blocking is better than blocking.',
  hook_id: 1,
  repository: { full_name: 'ryhertel/pingsocialocca' },
};

export const githubWorkflowRunFailed = {
  action: 'completed',
  repository: { full_name: 'ryhertel/pingsocialocca' },
  workflow_run: { name: 'CI', conclusion: 'failure', head_branch: 'main' },
};

export const githubIssueOpenedBug = {
  action: 'opened',
  repository: { full_name: 'ryhertel/pingsocialocca' },
  issue: {
    number: 42,
    title: 'Ingest returns 400 for raw webhooks',
    user: { login: 'someone' },
    labels: [{ name: 'bug' }],
  },
};

export const githubIssueLabeled = {
  action: 'labeled',
  repository: { full_name: 'ryhertel/pingsocialocca' },
  issue: { number: 7, title: 'Tidy up', user: { login: 'someone' }, labels: [] },
};

export const stripePaymentSucceeded = {
  id: 'evt_1PabcdEFGHijkl',
  type: 'payment_intent.succeeded',
  data: { object: { amount: 4999, currency: 'usd' } },
};

export const stripeChargeFailed = {
  id: 'evt_1PzyxwVUTSRqpo',
  type: 'charge.failed',
  data: { object: { amount: 2500, currency: 'eur' } },
};

export const vercelDeploymentError = {
  id: 'jZbLmNoPqRsTuV',
  type: 'deployment.error',
  payload: { project: { name: 'ping' }, target: 'production' },
};

export const vercelDeploymentSucceeded = {
  id: 'kAbCdEfGhIjKlM',
  type: 'deployment.succeeded',
  payload: { project: { name: 'ping' }, target: 'production' },
};

export const nativePayload = {
  source: 'curl',
  eventType: 'success',
  title: 'Hello from Ping',
};

export const unknownPayload = {
  weird: { nested: true },
  values: [1, 2, 3],
};

/** Every fixture paired with the headers that would carry it. */
export const ALL_FIXTURES: Array<{ name: string; headers: Record<string, string>; body: unknown }> = [
  { name: 'githubPush', headers: { 'x-github-event': 'push', 'x-github-delivery': 'abc-123' }, body: githubPush },
  { name: 'githubPing', headers: { 'x-github-event': 'ping' }, body: githubPing },
  { name: 'githubWorkflowRunFailed', headers: { 'x-github-event': 'workflow_run' }, body: githubWorkflowRunFailed },
  { name: 'githubIssueOpenedBug', headers: { 'x-github-event': 'issues' }, body: githubIssueOpenedBug },
  { name: 'githubIssueLabeled', headers: { 'x-github-event': 'issues' }, body: githubIssueLabeled },
  { name: 'stripePaymentSucceeded', headers: { 'stripe-signature': 't=1,v1=deadbeef' }, body: stripePaymentSucceeded },
  { name: 'stripeChargeFailed', headers: { 'stripe-signature': 't=1,v1=deadbeef' }, body: stripeChargeFailed },
  { name: 'vercelDeploymentError', headers: { 'x-vercel-signature': 'deadbeef' }, body: vercelDeploymentError },
  { name: 'vercelDeploymentSucceeded', headers: { 'x-vercel-signature': 'deadbeef' }, body: vercelDeploymentSucceeded },
];
