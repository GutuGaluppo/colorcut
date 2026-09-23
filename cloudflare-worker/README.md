# ColorCut Photoroom proxy

Cloudflare Worker for ADR-014 (`docs/DECISIONS.md`). Holds the real Photoroom
API key server-side and validates a license code + credit balance in KV
before forwarding an image to Photoroom. See `src/index.ts` for the exact
request/response contract — it must stay in sync with
`src-tauri/src/services/photoroom_removal_service.rs`.

## 1. Photoroom: get a production API key

The sandbox key (`sandbox_sk_pr_...`) always watermarks results — it's fine
for testing, not for real customers.

1. Sign in (or create an account) at <https://app.photoroom.com/api-dashboard>.
   Consider a generic email (e.g. `admin@yourcompany.com`) rather than a
   personal one, so account access isn't tied to one person.
2. Add a payment method on the account — a production key requires billing
   to be enabled (the Basic plan is pay-as-you-go: $0.02/image past the first
   10 free calls, per `docs/DECISIONS.md` ADR-014's pricing section, current
   as of 2026-09-23; reconfirm on the pricing page since it can change).
3. Generate a key from the same dashboard. A production key does **not**
   start with `sandbox_sk_pr_`.
4. Look for a spend cap / budget alert / usage limit setting on that key or
   account. Photoroom's public docs don't describe this feature in enough
   detail to give exact click-by-click steps — check the dashboard directly
   once logged in, since this is the main defense-in-depth mitigation ADR-014
   relies on against the Worker's key being abused.
5. Copy the key. It goes **only** into the Worker's secret (step 2.4 below) —
   never into the ColorCut app, its `.env`, or any committed file.

## 2. Cloudflare: deploy the Worker

Requires a free Cloudflare account (Workers' free tier easily covers this
product's plausible volume).

```bash
cd cloudflare-worker
npm install
npx wrangler login
```

### 2.1 Create the KV namespace for license/credit records

```bash
npx wrangler kv namespace create LICENSES
```

This prints an `id`. Paste it into `wrangler.toml`'s `[[kv_namespaces]]`
block, replacing `REPLACE_WITH_KV_NAMESPACE_ID`.

### 2.2 Set the Photoroom key as a secret (never in wrangler.toml)

```bash
npx wrangler secret put PHOTOROOM_API_KEY
```

Paste the production key from step 1 when prompted.

### 2.3 Issue a license manually (MVP flow — no payment-platform integration yet)

Until a checkout/payment platform is wired up, credit packs are fulfilled by
hand: whenever a customer pays (through whatever link you use — Gumroad,
PayPal, a Lemonsqueezy product, etc.), generate them a random code and store
it. **Do not reuse any example code shown in this file verbatim** — an
example string that appears in a doc (public or not) is guessable. Generate
one for real each time:

```bash
openssl rand -hex 16 | tr '[:lower:]' '[:upper:]'
# e.g. 9F2D1C7A4E3B8065D1A2F6C9B7E0334A — this is just this run's example output, generate your own
```

The Worker uppercases whatever the app sends before the KV lookup, so store
every code in KV as uppercase too:

```bash
npx wrangler kv key put --binding=LICENSES --remote "CC-PRO-9F2D1C7A4E3B8065D1A2F6C9B7E0334A" '{"credits":100}'
```

The customer pastes this exact string into ColorCut's "ColorCut Pro license"
field (case doesn't matter on their end — the Worker normalizes it). To check
or adjust a balance later:

```bash
npx wrangler kv key get --binding=LICENSES --remote "CC-PRO-9F2D1C7A4E3B8065D1A2F6C9B7E0334A"
npx wrangler kv key put --binding=LICENSES --remote "CC-PRO-9F2D1C7A4E3B8065D1A2F6C9B7E0334A" '{"credits":50}'
```

To replace a code entirely (KV has no rename), delete the old one and put a
new one:

```bash
npx wrangler kv key delete --binding=LICENSES --remote "CC-PRO-OLDCODE"
npx wrangler kv key put --binding=LICENSES --remote "CC-PRO-NEWCODE" '{"credits":100}'
```

This is manual by design for now — automating issuance from a real
payment-platform webhook (e.g. Lemonsqueezy, which has a license API) is a
follow-up, not required to start selling.

### 2.4 Deploy

```bash
npx wrangler deploy
```

Note the printed URL (`https://colorcut-photoroom-proxy.<your-subdomain>.workers.dev`).

### 2.5 Point ColorCut at the real Worker

Update `PHOTOROOM_PROXY_URL` in `src-tauri/src/lib.rs` (currently a
placeholder pointing at `*.example.workers.dev`) to the URL from step 2.4,
then rebuild the app.

### 2.6 Smoke-test before wiring the app

```bash
curl -i -X POST "https://colorcut-photoroom-proxy.<your-subdomain>.workers.dev" \
  -F "license_code=CC-PRO-9F2D1C7A4E3B8065D1A2F6C9B7E0334A" \
  -F "image_file=@/path/to/a/test/image.jpg"
```

Expect: `200` with PNG bytes for a valid code with credit, `401` for a wrong
code, `402` once credits hit 0 (put the balance to `0` and retry to check).

## Known limitations (see ADR-014)

- Credit decrement is a plain KV read-then-write, not atomic — two
  simultaneous requests on the same license code could both pass the
  credit check before either write lands. Not a practical problem at low
  volume; a Durable Object per license would be the real fix if it ever is.
- License issuance is manual. Fine for a slow trickle of early sales: does
  not scale to self-serve checkout without adding a payment-platform
  integration later.
