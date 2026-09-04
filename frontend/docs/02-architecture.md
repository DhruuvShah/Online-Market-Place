# Architecture

## Conventions carried over from the backend

The backend has a consistent shape. The frontend keeps it rather than inventing
a second one.

| Backend | Frontend |
| --- | --- |
| `product.controller.js`, `auth.routes.js` | `product.api.ts`, `auth.slice.ts` — `<domain>.<layer>.<ext>` |
| `src/app.js` builds the app, `server.js` starts it | `src/App.tsx` builds the tree, `src/main.tsx` mounts it |
| `createAuthMiddleware(["seller"])` | `<RequireRole roles={["seller"]}>` — same factory shape |
| One folder per concern (`controllers/`, `models/`) | One folder per concern (`services/`, `features/`) |
| No comments; names carry the meaning | Same |
| `.env` + `.env.example`, gitignored `.env` | Same, with the `VITE_` prefix |
| 2-space indent, double quotes, semicolons | Same, enforced by Prettier |

Comments appear only where the backend uses them: to explain a decision that
the code cannot state, such as why a workaround exists.

## Folder structure

```
frontend/
├── public/
│   ├── brand/                     logo.svg, logo-dark.svg, favicon.svg
│   └── illustrations/             empty-*.svg, placeholder-product.svg
├── src/
│   ├── main.tsx                   mount only
│   ├── App.tsx                    providers + router
│   │
│   ├── app/
│   │   ├── store.ts               configureStore, middleware
│   │   ├── hooks.ts               typed useAppDispatch / useAppSelector
│   │   ├── router.tsx             route tree, lazy boundaries
│   │   └── guards.tsx             RequireAuth, RequireRole, RedirectIfAuthed
│   │
│   ├── services/                  ONE FILE PER BACKEND SERVICE
│   │   ├── base.api.ts            fetchBaseQuery, credentials: "include"
│   │   ├── auth.api.ts            → hivemind-auth
│   │   ├── product.api.ts         → hivemind-product
│   │   ├── cart.api.ts            → hivemind-cart
│   │   ├── order.api.ts           → hivemind-order
│   │   ├── payment.api.ts         → hivemind-payment
│   │   ├── seller.api.ts          → hivemind-seller-dashboard
│   │   └── aiBuddy.socket.ts      → hivemind-ai-buddy (socket.io)
│   │
│   ├── features/                  domain UI + local state
│   │   ├── auth/{components,hooks,auth.slice.ts}
│   │   ├── products/{components,hooks}
│   │   ├── cart/{components,hooks,cart.slice.ts}
│   │   ├── orders/{components,hooks}
│   │   ├── payment/{components,hooks}
│   │   ├── seller/{components,hooks}
│   │   └── ai-buddy/{components,hooks,aiBuddy.slice.ts}
│   │
│   ├── pages/                     route endpoints, one file per route
│   │   ├── public/                Landing, Login, Register, Privacy, Terms, NotFound
│   │   ├── shop/                  Discover, ProductDetail, Cart, Checkout,
│   │   │                          OrderSuccess, Orders, OrderDetail, Account
│   │   └── seller/                Overview, Products, ProductNew, ProductEdit, Orders
│   │
│   ├── components/
│   │   ├── ui/                    Button, Input, Select, Card, Badge, Modal,
│   │   │                          Drawer, Toast, Skeleton, EmptyState, Stepper
│   │   ├── layout/                PublicLayout, ShopLayout, SellerLayout,
│   │   │                          Header, Footer, SellerSidebar
│   │   └── motion/                springs.ts, ScrollReveal, Stagger, NumberTicker,
│   │                              FlyToCart, SuccessCheck
│   │
│   ├── hooks/                     useMediaQuery, useReducedMotion, useDebounce
│   ├── lib/                       cn.ts, format.ts, razorpay.ts, warmup.ts
│   ├── styles/                    index.css (Tailwind v4 theme tokens)
│   └── types/                     user.ts, product.ts, cart.ts, order.ts, payment.ts
│
├── .env.example
├── dockerfile
├── nginx.conf
├── vercel.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## The rule that makes `services/` worth having

`services/` maps one-to-one onto the deployed backend. When `hivemind-product`
changes its response shape, exactly one frontend file changes. Nothing outside
`services/` calls `fetch` — components consume generated hooks.

That boundary is what lets a nine-service backend stay comprehensible from the
frontend.

## `features/` versus `pages/`

- **`pages/`** owns routing, layout and data fetching. A page composes.
- **`features/`** owns domain UI. A feature knows nothing about routes.

`ProductCard` lives in `features/products/components/` because the catalog, the
seller inventory and the AI buddy results all render it. `DiscoverPage` lives in
`pages/shop/` because only one URL renders it.

When a component is used by exactly one page and will never move, it can start
inside that page's folder and graduate to `features/` when a second caller
appears.

## Route tree

```
/                          PublicLayout
├── /                      Landing
├── /login                 RedirectIfAuthed
├── /register              RedirectIfAuthed
├── /privacy               required before Google OAuth publishing
├── /terms                 required before Google OAuth publishing
└── *                      NotFound

/                          ShopLayout      RequireRole ["user"]
├── /discover              catalog, search, filters
├── /products/:id          detail
├── /cart
├── /checkout              address → review → pay
├── /orders/:id/success    the celebratory moment
├── /orders
├── /orders/:id
└── /account               profile + addresses

/seller                    SellerLayout    RequireRole ["seller"]
├── /seller                overview + metrics
├── /seller/products
├── /seller/products/new
├── /seller/products/:id/edit
└── /seller/orders
```

A seller hitting `/cart` is redirected to `/seller`, and a user hitting
`/seller` is redirected to `/discover`. Sellers cannot purchase — that is
enforced by the backend's `createAuthMiddleware(["user"])` on every cart and
order route, and the frontend simply never shows the path.

## State ownership

| State | Owner |
| --- | --- |
| Server data (products, cart, orders, metrics) | RTK Query cache |
| Current user | `auth.slice` — hydrated once from `GET /auth/me` |
| AI chat transcript | `aiBuddy.slice` — socket messages, not HTTP |
| Drawer/modal/toast/filter-panel open state | feature slices |
| Form state | react-hook-form, local |

Nothing that RTK Query owns is copied into a slice. Duplicating server data
into Redux is how cart totals drift out of sync with what the server charges.

## Cold-start handling

Render free services sleep. `lib/warmup.ts` fires `/health` at all seven
services in parallel on app mount, so they cold-start concurrently instead of
serially on the user's first click.

The gateway's own `/health` returns no CORS headers, so warm-up targets each
service URL directly. Each backend's `/health` sits above its routes and passes
through `applySecurity`, so those do carry CORS headers.

A request that takes longer than 2s shows a "waking up the marketplace" state
rather than a spinner, because a spinner that runs for 50 seconds reads as
broken.
