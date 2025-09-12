Lemon Squeezy Setup CLI (MVP)

This script uses the Lemon Squeezy API to:
- Create products + variants for: One‑time reports, Personal subscriptions, Firm tiers
- Create a webhook to your callback URL
- Print checkout links and variant IDs to paste into .env

Usage

1) Set env vars (test/live keys work):

   export LEMON_API_KEY="<your_key>"
   export LEMON_STORE_ID="221727"                        # your store id
   export LEMON_WEBHOOK_URL="https://travelcheck.xyz/api/billing/lemonsqueezy"
   export LEMON_WEBHOOK_SECRET="<choose_a_secret>"        # used to verify signatures
   
   # Optional overrides
   export DRY_RUN="0"                                     # 1 to simulate only

2) Run:

   node scripts/lemon/setup.js

3) Copy the printed env lines into frontend/.env.local.

Notes
- The script is idempotent: it looks up existing products/variants by name before creating.
- Prices are in USD and match the app pricing.
- No trials are configured.
- Webhook subscribes to order/subscription events.

