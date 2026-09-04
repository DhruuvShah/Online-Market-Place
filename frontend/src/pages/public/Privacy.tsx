import { LegalPage } from "./LegalPage";

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      updated="September 2026"
      intro="HiveMind collects the minimum needed to run a marketplace: enough to identify your account, deliver your order, and take payment. This page states exactly what is stored, who processes it, and how to have it deleted."
      sections={[
        {
          heading: "What we collect",
          body: (
            <>
              <p>
                When you create an account we store your name, username, email
                address and a hashed password. Passwords are hashed with bcrypt
                and are never stored or transmitted in readable form.
              </p>
              <p>
                When you place an order we store the shipping address you
                provide, the items and quantities ordered, and the amount
                charged.
              </p>
              <p>
                Sellers additionally have the products they list stored,
                including titles, descriptions, prices, stock levels and images.
              </p>
            </>
          ),
        },
        {
          heading: "What we never collect",
          body: (
            <p>
              We do not store card numbers, CVVs or any payment instrument
              details. Payment information is entered directly into Razorpay's
              own checkout and never passes through HiveMind's systems. We do not
              sell data, run advertising, or share personal data with third
              parties for marketing.
            </p>
          ),
        },
        {
          heading: "Who processes your data",
          body: (
            <>
              <p>
                <strong>Razorpay</strong> processes payments and receives your
                name, email and the order amount.
              </p>
              <p>
                <strong>MongoDB Atlas</strong> stores account, product, cart and
                order data.
              </p>
              <p>
                <strong>ImageKit</strong> stores product images uploaded by
                sellers.
              </p>
              <p>
                <strong>Google Gemini</strong> receives the text of messages you
                send to the shopping assistant so it can answer them.
              </p>
            </>
          ),
        },
        {
          heading: "Cookies",
          body: (
            <p>
              We set one cookie: an authentication token, marked httpOnly and
              secure, which keeps you signed in. It is not used for tracking or
              analytics. Signing out invalidates it.
            </p>
          ),
        },
        {
          heading: "Retention and deletion",
          body: (
            <p>
              Account and order data is retained while your account is active.
              To have your account and its data deleted, email the address below
              from the address on the account. Order records may be retained
              where required for financial record-keeping.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              You can view and correct your profile and addresses at any time
              from your account page. You may request a copy of your data or its
              deletion by writing to us.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about this policy can be sent to{" "}
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
