# Deployment

Frontend on Vercel, backend on Render, managed infrastructure elsewhere
(MongoDB Atlas, CloudAMQP, Redis Cloud, ImageKit, Razorpay, Google Gemini).

## Services

| Service | Port | Public path | Needs Mongo | Needs RabbitMQ | Long-running consumer |
| --- | --- | --- | --- | --- | --- |
| gateway | 8080 | all `/api/*` | no | no | no |
| auth | 3000 | `/api/auth` | yes | yes (publisher) | no |
| product | 3001 | `/api/products` | yes | yes (publisher) | no |
| cart | 3002 | `/api/cart` | yes | no | no |
| order | 3003 | `/api/orders` | yes | yes | **yes** |
| payment | 3004 | `/api/payments` | yes | yes (publisher) | no |
| ai-buddy | 3005 | `/api/socket` | no | no | no |
| notification | 3006 | none | no | yes | **yes** |
| seller-dashboard | 3007 | `/api/seller/dashboard` | yes | yes | **yes** |

The three marked **yes** hold RabbitMQ subscriptions. They must stay awake to
do their job — see "Free tier constraint" below.

## Deploying with the Blueprint

`render.yaml` declares all nine services. In Render: **New → Blueprint**, point
it at this repository. Every secret is declared `sync: false`, so Render will
prompt for the values rather than reading them from the repo.

Deploy in this order so the service URLs exist before the services that
reference them:

1. `hivemind-auth`, `hivemind-product`, `hivemind-cart` (no cross-service deps)
2. `hivemind-order` (needs cart + product URLs)
3. `hivemind-payment` (needs order URL)
4. `hivemind-ai-buddy` (needs product + cart URLs)
5. `hivemind-notification`, `hivemind-seller-dashboard`
6. `hivemind-gateway` (needs all of the above)

## Environment variables

Shared by every service that has them:

- `JWT_SECRET` — must be **byte-identical everywhere**, or cross-service auth breaks
- `CORS_ORIGIN` — your Vercel URL, e.g. `https://hivemind.vercel.app`
- `MONGO_URI` — one database per service (`HiveMindAuth`, `HiveMindProduct`, ...)
- `RABBIT_URL` — the same CloudAMQP URL for all six broker users

Service-specific:

| Service | Additional variables |
| --- | --- |
| auth | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` |
| product | `INTERNAL_API_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` |
| cart | `PRODUCT_SERVICE_URL` |
| order | `INTERNAL_API_KEY`, `CART_SERVICE_URL`, `PRODUCT_SERVICE_URL` |
| payment | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ORDER_SERVICE_URL` |
| ai-buddy | `GOOGLE_API_KEY`, `PRODUCT_SERVICE_URL`, `CART_SERVICE_URL` |
| notification | `APP_URL`, `EMAIL_USER`, `EMAIL_FROM`, and either `EMAIL_APP_PASSWORD` (simpler) or `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REFRESH_TOKEN` |
| gateway | `AUTH_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `CART_SERVICE_URL`, `ORDER_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `AI_BUDDY_SERVICE_URL`, `SELLER_DASHBOARD_SERVICE_URL` |

`INTERNAL_API_KEY` must match between **product** and **order** — it guards the
internal stock reservation endpoints.

All `*_SERVICE_URL` values must include the scheme and no trailing slash:

```
https://hivemind-product.onrender.com
```

`PORT` is injected by Render; do not set it.

## Cookies across origins

Vercel and Render are different sites, so the auth cookie only survives with:

```
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

`sameSite=none` without `secure` is rejected by browsers, so the code forces
`secure` on whenever `sameSite` is `none`. The frontend must send
`credentials: "include"` on every request.

## Razorpay webhook

Register only after the payment service has a public URL.

1. Razorpay Dashboard (Test Mode) → **Settings → Webhooks → Add New Webhook**
2. URL: `https://hivemind-payment.onrender.com/api/payments/webhook`
3. Secret: the value of `RAZORPAY_WEBHOOK_SECRET`
4. Active events: `payment.captured` and `payment.failed` only

The endpoint verifies the HMAC signature against the raw request body and
ignores unsigned or tampered requests. It is idempotent, so Razorpay's retries
are safe.

## Free tier constraint

Render free web services sleep after a period without HTTP traffic and cold
start on the next request. That is fine for request/response services, but
**a sleeping service cannot consume from RabbitMQ**. While `notification`,
`order` and `seller-dashboard` are asleep:

- welcome and payment emails are not sent
- orders are not moved to `CONFIRMED` after payment
- the seller dashboard stops receiving projection updates

Messages are not lost — they queue durably in CloudAMQP and are consumed when
the service wakes — but they are delayed for as long as the service sleeps.

Options:

- Put those three services on a paid instance type so they never sleep
- Host the three consumers somewhere with an always-on free allowance
- Accept the delay for a portfolio demo and warm the services before showing it

Also check your account's free instance-hour allowance before assuming nine
always-on services fit within it.

## Health checks

Every service exposes `GET /health`, returning its name and uptime. Render is
configured to use it via `healthCheckPath`.

## Graceful shutdown

Render sends `SIGTERM` before replacing an instance. Each service stops
accepting new connections, finishes in-flight requests, closes its Mongo
connection, and exits — with a 10 second cap before forcing exit.

## Local development

```bash
docker compose up -d                          # local Mongo + Redis + RabbitMQ
docker compose -f docker-compose.yml up -d    # against cloud infrastructure
```

The gateway is at `http://localhost:8080`; point the frontend there and send
`credentials: "include"`.
