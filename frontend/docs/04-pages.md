# Pages

21 pages. Every checklist item below is quoted from checklist.design, with the
source checklist named. Items marked **N/A** are deliberately excluded, with the
reason — an unmet item should be a decision, not an oversight.

---

## Public

### 1. Landing — `/`

*checklist.design → website/landing-page*

- [ ] Headline
- [ ] Subheadline
- [ ] Hero visual
- [ ] Primary CTA
- [ ] Social proof
- [ ] Key benefits
- [ ] Objection handling
- [ ] Repeated CTA

Two CTAs, because there are two roles: **Start shopping** and **Sell on
HiveMind**. Objection handling for a marketplace means answering "is my payment
safe" and "who are these sellers" — Razorpay's mark and a plain sentence about
escrowed confirmation.

Social proof is the one item that cannot be honest yet: there are no real users.
Use live counts from the catalog ("142 products across 8 categories") rather
than inventing testimonials. **Fabricated testimonials on a portfolio project
are the fastest way to lose a reviewer's trust.**

### 2. Register — `/register`

*website/sign-up*

- [ ] Logo
- [ ] Title
- [ ] Description
- [ ] Account identification — `username` **and** `email`, both required and unique
- [ ] Setting a password
- [ ] Link to login
- [ ] Testimonial or social proof
- [ ] **N/A** Sign up via third party — Google OAuth is not implemented
- [ ] **N/A** Current active customer count — would be dishonest
- [ ] **N/A** Billing plans — sellers are free
- [ ] Role selection — **not on the checklist, required by this product**

The role toggle is the most consequential control on the page and the checklist
has no item for it. Make it a segmented control with a one-line consequence
under each choice, not a dropdown. Changing role after registration is
impossible in the current backend, so this decision is permanent — say so.

Also collects `fullName.firstName` and `fullName.lastName`, both required.

### 3. Login — `/login`

*website/login*

- [ ] Logo
- [ ] Title
- [ ] Account identification — accepts email **or** username
- [ ] Password
- [ ] Link to sign up
- [ ] **N/A** Link to reset password — no endpoint exists
- [ ] **N/A** Login via third party
- [ ] **N/A** Testimonial / Blog post / New feature — noise on a login page

The missing password reset is a real gap. If a reviewer creates an account and
forgets the password, they are locked out. Consider seeding a demo account with
visible credentials on the login page instead.

### 4. Privacy — `/privacy`
### 5. Terms — `/terms`

*website/privacy*

Not decoration: **Google's OAuth consent screen refuses to publish without a
homepage, privacy policy and terms URL.** These three pages unblock the Gmail
work. They must state what data is collected (email, name, addresses, order
history), that Razorpay processes payments, and how to request deletion.

### 6. 404 — `*`

*website/404*

- [ ] Logo
- [ ] Title
- [ ] Description
- [ ] Link to homepage
- [ ] Search bar
- [ ] Illustrations, patterns, visual flair
- [ ] **N/A** Contact link — no contact endpoint

---

## Shopper

### 7. Discover — `/discover`

*web-app/search-results + flows/filtering-items + website/search*

- [ ] Search input — debounced, maps to `?q=`
- [ ] Result count
- [ ] Result items
- [ ] Filters — price range via `minprice`/`maxprice`
- [ ] Show active filters clearly when applied
- [ ] Provide easy filter removal
- [ ] Ordering of search results
- [ ] No results state — distinct from zero state
- [ ] Search progress
- [ ] Highlighting keywords
- [ ] **N/A** Recent searches — no persistence layer
- [ ] **N/A** Categories — the product model has no category field

**The product model has no `category`.** The spec's entity doc lists one; the
schema does not. Filter by price and text only, or add the field to the backend
first. Do not build a category UI against a field that does not exist.

### 8. Product Detail — `/products/:id`

*web-app/single-item-detail + flows/adding-to-cart*

- [ ] Clear title or identifier
- [ ] Status indicator — in stock / low stock / out of stock from `stock`
- [ ] Key details section — price, description, seller
- [ ] Breadcrumb or back navigation
- [ ] Primary action on product page is add to cart
- [ ] Feedback once added
- [ ] Link to cart view
- [ ] **N/A** Item variations — the model has no variants
- [ ] **N/A** Edit / destructive actions — seller-only, lives in the seller tree

Image gallery for up to 5 images. `thumbnail` for the strip, `url` for the main
view.

### 9. Cart — `/cart`

*website/cart*

- [ ] Item name and image
- [ ] Update or remove item
- [ ] Checkout button
- [ ] Link to support
- [ ] Accepted payment methods
- [ ] Empty state
- [ ] **N/A** Item variations
- [ ] **N/A** Promo or discount code — no backend support
- [ ] **N/A** Suggested add-ons — no recommendation engine

Line items resolve through `GET /api/products?ids=` in a single request. A
product deleted since it was added must render as unavailable rather than
crashing the row.

### 10. Checkout — `/checkout`

*web-app/checkout + web-app/multi-step-form*

- [ ] Progress indicator — Address → Review → Pay
- [ ] Step heading and context
- [ ] Field grouping
- [ ] Step-level validation
- [ ] Back navigation without losing progress
- [ ] Final review step
- [ ] Order summary
- [ ] Total cost
- [ ] Payment method
- [ ] Shipping address
- [ ] Security indicators
- [ ] **N/A** Promo code
- [ ] **N/A** Billing address — the order model has one address
- [ ] **N/A** Save and resume

Three steps, not one page. The review step must show the **server's** total
from `POST /api/orders`, never a client-computed figure.

**The 409 case belongs here.** If stock ran out between cart and checkout, the
order fails with 409. Name the product, offer to remove it, keep everything
else. A generic "something went wrong" here loses the sale and looks amateur.

### 11. Payment — within `/checkout`

*flows/making-a-payment*

- [ ] Offer payment methods
- [ ] Request card details — Razorpay's own modal
- [ ] Submit payment
- [ ] Show payment processing
- [ ] Confirmation payment processed successfully
- [ ] Outline next steps

Razorpay Checkout owns the card fields — we never touch them, which is the
whole point of using it. Our job is the handoff and the return.

### 12. Order Success — `/orders/:id/success`

The celebratory moment. See `05-motion.md`.

Must tolerate a `PENDING` order: `/verify` returns before the webhook lands.
Poll `GET /api/orders/:id` for a few seconds, showing "confirming your payment"
rather than declaring failure.

### 13. My Orders — `/orders`

*web-app/data-table + web-app/empty-state*

- [ ] Sortable columns
- [ ] Search and filter — by status
- [ ] Pagination
- [ ] Empty and loading states
- [ ] Row actions
- [ ] **N/A** Bulk actions, column visibility, frozen columns, export

Cards on mobile, table on desktop. A five-column table on a phone is unusable.

### 14. Order Detail — `/orders/:id`

*web-app/single-item-detail*

- [ ] Clear title or identifier
- [ ] Status indicator — the five-state timeline
- [ ] Key details section
- [ ] Related items or activity
- [ ] Breadcrumb or back navigation
- [ ] Destructive actions — cancel, confirmed, only while cancellable
- [ ] Edit action — change address, only before payment

### 15. Account — `/account`

- [ ] Profile display
- [ ] Address list, add, delete, default
- [ ] **N/A** Edit profile — `PATCH /auth/users/me` does not exist

Watch the `pincode` → `zip` asymmetry in the address form.

### 16. AI Buddy — drawer, all shop pages

*web-app/chat*

Not a page. A drawer over the catalog, so a suggested product can be opened
without losing the conversation. Handles socket disconnects silently and
reconnects — the service sleeps.

---

## Seller

### 17. Overview — `/seller`

*web-app/dashboard*

- [ ] Welcome state
- [ ] Key metrics — sales, revenue, top products
- [ ] Recent activity
- [ ] Needs attention — low stock
- [ ] Quick actions — add product
- [ ] Empty state — a new seller has nothing; this is the first screen they see

### 18. Products — `/seller/products`

*web-app/data-table*

- [ ] Sortable columns, search, pagination
- [ ] Row actions on hover — edit, delete
- [ ] Empty and loading states
- [ ] Low stock alerts

### 19. New Product — `/seller/products/new`
### 20. Edit Product — `/seller/products/:id/edit`

*flows/submitting-a-form + flows/uploading-media*

- [ ] Show button to submit
- [ ] Show loading state after submission
- [ ] Show success message
- [ ] Show error message on failure
- [ ] Upload progress, preview, remove — up to 5 images

Multipart upload. Images go to ImageKit through the product service.

### 21. Orders — `/seller/orders`

*web-app/data-table*

Read-only. Sellers cannot change order status — no endpoint exists.

---

## Cross-cutting

*flows/showing-input-error* — applies to every form:

- [ ] Keep the input in default state
- [ ] Allow the user to enter information
- [ ] **Signal error after loss of focus** — never while typing
- [ ] Return to default state upon reattempt

*website/footer* — every layout:

- [ ] Logo, content links, legal links, social, back to top, accepted payment methods

*web-app/empty-state* — every list:

- [ ] Illustration, heading, description, primary action
- [ ] Zero state distinct from no-results state
- [ ] Error state variant

That last distinction is the one most often missed. "You have no orders yet"
and "No orders match this filter" are different screens with different actions.
