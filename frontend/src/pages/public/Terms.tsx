import { LegalPage } from "./LegalPage";

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of service"
      updated="September 2026"
      intro="These terms cover using HiveMind as a buyer or as a seller. Creating an account means you accept them."
      sections={[
        {
          heading: "Accounts",
          body: (
            <>
              <p>
                You choose a role when you register: buyer or seller. The role
                cannot be changed afterwards, so pick the one you need. Sellers
                cannot purchase, and buyers cannot list products.
              </p>
              <p>
                You are responsible for keeping your password secure and for
                activity on your account. Provide accurate details; accounts
                using another person's identity may be removed.
              </p>
            </>
          ),
        },
        {
          heading: "Buying",
          body: (
            <>
              <p>
                Adding an item to your cart does not reserve it. Stock is
                reserved only when you place the order. If an item sells out
                first, checkout will tell you before payment is taken.
              </p>
              <p>
                Prices shown are calculated on the server and are the amount you
                will be charged. An order is confirmed once payment clears.
              </p>
              <p>
                You may cancel an order while it is awaiting payment or
                confirmed. Reserved stock is returned to the catalog when you do.
              </p>
            </>
          ),
        },
        {
          heading: "Selling",
          body: (
            <>
              <p>
                You are responsible for the accuracy of your listings, including
                title, description, price, stock and images, and for fulfilling
                orders placed against them.
              </p>
              <p>
                Do not list counterfeit, illegal or unsafe goods, and only upload
                images you have the right to use. Listings breaking these rules
                may be removed.
              </p>
            </>
          ),
        },
        {
          heading: "Payments",
          body: (
            <p>
              Payments are processed by Razorpay under their own terms. HiveMind
              does not handle or store card details. Refunds and chargebacks
              follow Razorpay's process.
            </p>
          ),
        },
        {
          heading: "The shopping assistant",
          body: (
            <p>
              The assistant is powered by a language model and can be wrong.
              Check product details on the product page before buying. It can
              add items to your cart, but it never completes a purchase on your
              behalf.
            </p>
          ),
        },
        {
          heading: "Availability",
          body: (
            <p>
              HiveMind is offered as-is, without a guarantee of uptime. Services
              may be slow to respond after a period of inactivity, and may be
              interrupted for maintenance.
            </p>
          ),
        },
        {
          heading: "Changes and contact",
          body: (
            <p>
              These terms may be updated; the date above shows the latest
              revision. Questions can be sent to{" "}
              <a
                href="mailto:dhruv27shah@gmail.com"
                className="text-ink underline underline-offset-4"
              >
                dhruv27shah@gmail.com
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
