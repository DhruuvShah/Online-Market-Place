# Stack

Every choice below is justified against the backend that already exists, not
against general preference.

## The stack

| Layer | Choice | Version |
| --- | --- | --- |
| Build | Vite | 7 |
| UI | React | 19 |
| Language | TypeScript | 5.9 |
| Data | Redux Toolkit + RTK Query | 2.x |
| Routing | React Router | 7 (declarative) |
| Styling | Tailwind CSS | 4 |
| Motion | Motion (`motion/react`) | 12 |
| Realtime | socket.io-client | 4 |
| Icons | lucide-react | latest |
| Forms | react-hook-form + zod | |
| Payments | Razorpay Checkout (script tag) | |

## Why Vite and not Next.js

The backend is a separate API behind a gateway, and authentication is a
`httpOnly` cookie with `SameSite=None; Secure`. Server-side rendering would
mean forwarding that cookie from the Next server to the gateway on every
request, for an application where all but three pages are behind a login. The
SEO benefit applies only to the landing page and the catalog.

The cost is real complexity in the auth path — the part most likely to break
in a demo. The benefit is marginal. A SPA on Vercel's CDN serves the landing
page fast enough without it.

The assignment spec also names Vite explicitly, and deviating from a spec you
were given is a question you have to answer rather than a decision you get to
make silently.

## Why RTK Query and not TanStack Query

The spec names RTK Query. Beyond that, this application has a specific need:
stock changes when an order is placed, and the cart, the product detail page
and the catalog all display stock. RTK Query's tag invalidation expresses that
as a property of the mutation rather than as manual cache surgery at each call
site.

```ts
createOrder: builder.mutation({
  invalidatesTags: ["Cart", "Product", "Order"],
})
```

TanStack Query is the better library in isolation. It is not the better choice
here, because the spec asks for the other one and the gap is small.

## Why TypeScript when the backend is JavaScript

The frontend consumes six independently deployed services whose responses are
untyped. A typo in `res.data.product.price.amount` is a runtime crash the
compiler could have caught. Types at the network boundary are worth most
exactly where the other side has none.

This does not mean porting the backend. It means `src/types/` mirrors the
backend models by hand, and `03-api-contract.md` is the source those types are
written from.

## Deployment

**Vercel.** Vite builds to static assets; Vercel serves them from its CDN with
no cold start. That matters more than usual here, because the Render backend
does cold-start — the frontend must be instantly available so it can render a
waking state while the API comes up.

SPA routing needs a rewrite, or a refresh on `/orders/abc` returns 404:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Environment variables are baked in at build time, so a change to `VITE_API_URL`
requires a redeploy, not just a restart. This is unlike the backend services.

## Docker

A `dockerfile` is included for parity with the other nine services and so the
frontend can join `docker-compose` for full-stack local runs. It is **not**
used by Vercel.

Multi-stage: `node:22-alpine` builds, `nginx:alpine` serves. The nginx config
needs the same SPA fallback as the Vercel rewrite.

## CI

Add `frontend` to the existing matrix in `.github/workflows/ci.yml`. Unlike the
backend services, the meaningful check is `tsc --noEmit` and `vite build` — a
type error or a failed build is the failure mode that matters. Vitest is added
for the cart-total and price-formatting logic, which is where a silent bug
would cost real money.

The backend's Ubuntu-24.04 lesson applies: verify in CI, not only on Windows.

## Deliberately excluded

| Not using | Reason |
| --- | --- |
| A component library (MUI, Chakra) | The apple-design skill specifies motion and materials that fight a prescriptive library's defaults. Build a small `ui/` set instead. |
| Redux for server state | RTK Query owns it. Slices hold only UI state — the AI drawer, the filter panel, toasts. |
| A CSS-in-JS runtime | Tailwind v4 compiles at build time; runtime styling costs frames during animation. |
| Lottie as a dependency | See `06-assets.md` — only one moment justifies it, and even that has a lighter alternative. |
