# API Contract

Read from the route files and models, not from the spec. Where the spec and the
code disagree, the code wins — it is what is deployed.

Base URL is the gateway. Every request sends `credentials: "include"`.

## Auth — `/api/auth`

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| POST | `/register` | — | `{ username, email, password, fullName: { firstName, lastName }, role }` |
| POST | `/login` | — | `{ email? , username?, password }` — either identifier |
| GET | `/me` | any | hydrates the auth slice on boot |
| **GET** | `/logout` | — | **GET, not POST** |
| GET | `/users/me/addresses` | any | |
| POST | `/users/me/addresses` | any | see the pincode trap below |
| DELETE | `/users/me/addresses/:addressId` | any | |

### The pincode/zip trap

The request field and the response field have different names:

```
POST { street, city, state, pincode, country, isDefault }
GET  [{ street, city, state, zip,     country, isDefault, _id }]
```

`addUserAddress` writes `zip: pincode`. Send `pincode`, read `zip`, and never
let the two names meet in a component. The address form maps at the boundary in
`auth.api.ts`.

`pincode` must also match `/^\d{4,}$/` — at least four digits, as a string.

## Product — `/api/products`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/` | public |
| GET | `/:id` | public |
| GET | `/seller` | seller |
| POST | `/` | seller, admin — `multipart/form-data`, up to 5 images |
| PATCH | `/:id` | seller (owner) |
| DELETE | `/:id` | seller (owner) |

Query parameters on `GET /`: `q`, `minprice`, `maxprice`, `skip`, `limit`, and
`ids` for bulk fetch. The cart uses `ids` to resolve its line items in one
request instead of N.

`GET /seller` is registered **before** `GET /:id`, so it resolves correctly
rather than being swallowed as an id. Do not reorder those routes.

`POST /` is multipart — `FormData`, not JSON. Do not set `Content-Type`
manually; the browser must set the boundary.

Two internal routes exist — `/internal/stock/reserve` and `/release`. They are
guarded by `x-internal-key` and are for the order service. **The frontend must
never call them.**

## Cart — `/api/cart` (role: user)

| Method | Path |
| --- | --- |
| GET | `/` |
| POST | `/items` — `{ productId, qty }` |
| PATCH | `/items/:productId` |
| DELETE | `/items/:productId` |
| DELETE | `/` |

The cart stores only `{ productId, quantity }`. It holds **no prices**. Totals
are computed by resolving products through `GET /api/products?ids=`, which is
what stops a stale client-side price from reaching checkout.

## Order — `/api/orders` (role: user)

| Method | Path |
| --- | --- |
| POST | `/` |
| GET | `/me` |
| GET | `/:id` |
| POST | `/:id/cancel` |
| PATCH | `/:id/address` |

Status is `PENDING | CONFIRMED | CANCELLED | SHIPPED | DELIVERED`.

`POST /` reserves stock atomically. **It returns 409 when stock is
insufficient** — the frontend must render that as a real message naming the
product, not a generic failure. This is the single most likely error a user
meets, because it fires whenever someone else buys the last unit first.

## Payment — `/api/payments`

| Method | Path | Role |
| --- | --- | --- |
| POST | `/create/:orderId` | user |
| POST | `/verify` | user |
| POST | `/webhook` | Razorpay only — signed |

**Currency:** amounts are stored and returned in **rupees**. The conversion to
paise happens server-side at the Razorpay boundary. The frontend displays what
it receives and never multiplies by 100 — doing so is the bug that once charged
₹40 for a ₹4000 order.

`/verify` takes the `razorpay_payment_id`, `razorpay_order_id` and
`razorpay_signature` handed back by Razorpay Checkout.

The webhook is the source of truth for order confirmation. `/verify` gives the
user an immediate answer; the webhook is what actually moves the order to
`CONFIRMED`. The success page must therefore tolerate an order that is still
`PENDING` for a few seconds and poll rather than assert failure.

## Seller Dashboard — `/api/seller/dashboard` (role: seller)

| Method | Path |
| --- | --- |
| GET | `/metrics` |
| GET | `/orders` |
| GET | `/products` |

This is a CQRS read model built from RabbitMQ events. On Render's free tier the
service sleeps, so its projection can lag. It drains the backlog on wake, which
means the dashboard is correct by the time it renders — but a metric can be
seconds stale immediately after an order.

## AI Buddy — `/api/socket`

socket.io, not REST. The handshake reads the auth cookie and verifies the JWT
itself, then passes the token to the agent's tools so they act as the signed-in
user. Events are `message` in both directions.

Connection is rejected with `Token not provided` or `Invalid token`. The client
must reconnect on disconnect, because the service can spin down under an idle
open socket.

## In the spec but not built

Do not design against these:

| Spec | Reality |
| --- | --- |
| `PATCH /auth/users/me` | Not implemented — the account page cannot edit a profile |
| Google OAuth (Passport) | Not implemented |
| Refresh + access token pair | One access token in a cookie |
| CSRF double-submit | Not implemented |
| `GET /payments/:id` | Not implemented |
| Review entity | Not implemented |
| Password reset | Not implemented — the login checklist wants this link |

Two of these have visible consequences: the account page can show a profile but
not edit it, and the login page cannot offer "forgot password."

`PATCH /auth/users/me` is roughly thirty lines and would make the account page
whole. Worth adding before the frontend, if you want it.

## The `admin` role does not exist

`user.model.js` declares `role: { enum: ["user", "seller"] }`. But
`product.routes.js` guards `POST /` with `["admin", "seller"]` and
`order.routes.js` guards `GET /:id` with `["user", "admin"]`.

No account can ever hold `admin`, so those clauses are unreachable. Harmless,
but there is no admin surface to build and no way to create one.

## Types to mirror

```ts
type Role = "user" | "seller";
type Money = { amount: number; currency: "INR" | "USD" };
type Image = { url: string; thumbnail: string; id: string };

type User    = { _id, username, email, fullName: { firstName, lastName }, role, addresses: Address[] };
type Address = { _id, street, city, state, zip, country, isDefault };
type Product = { _id, title, description?, price: Money, seller, images: Image[], stock };
type Cart    = { _id, user, items: { productId, quantity }[] };
type Order   = { _id, user, items: { product, quantity, price: Money }[], status, totalPrice: Money, shippingAddress };
type Payment = { _id, order, paymentId?, razorpayOrderId, status, price: Money };
```

Note `Cart.items[].productId` but `Order.items[].product` — the two services
name the same reference differently. Normalise in `services/`, not in
components.
