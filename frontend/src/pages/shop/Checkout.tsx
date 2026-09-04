import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { useCartQuery } from "@/services/cart.api";
import { useCreateOrderMutation } from "@/services/order.api";
import {
  useCreatePaymentMutation,
  useVerifyPaymentMutation,
} from "@/services/payment.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { formatMoney } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { loadRazorpay } from "@/lib/razorpay";
import type { ShippingAddressInput } from "@/types";

const schema = z.object({
  street: z.string().trim().min(1, "Required"),
  city: z.string().trim().min(1, "Required"),
  state: z.string().trim().min(1, "Required"),
  pincode: z.string().regex(/^\d{4,}$/, "At least 4 digits"),
  country: z.string().trim().min(1, "Required"),
});

const steps = ["Address", "Review", "Pay"] as const;

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cart, isLoading } = useCartQuery();
  const [createOrder] = useCreateOrderMutation();
  const [createPayment] = useCreatePaymentMutation();
  const [verifyPayment] = useVerifyPaymentMutation();

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<ShippingAddressInput | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingAddressInput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { country: "India" },
  });

  if (isLoading) {
    return (
      <div className="shell py-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-8 h-64 w-full" />
      </div>
    );
  }

  if (!cart || cart.cart.items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const totals = cart.totals;

  const submitAddress = (values: ShippingAddressInput) => {
    setAddress(values);
    setAlert(null);
    setStep(1);
  };

  const placeAndPay = async () => {
    if (!address) return;
    setAlert(null);
    setIsPaying(true);

    try {
      const order = await createOrder({ shippingAddress: address }).unwrap();
      setStep(2);

      const payment = await createPayment(order._id).unwrap();

      const ready = await loadRazorpay();
      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!ready || !window.Razorpay || !key) {
        setAlert(
          "Order placed, but the payment window could not open. Open it again from your orders.",
        );
        navigate(`/orders/${order._id}`, { replace: true });
        return;
      }

      const checkout = new window.Razorpay({
        key,
        amount: Math.round(payment.price.amount * 100),
        currency: payment.price.currency,
        name: "HiveMind",
        description: `Order ${order._id.slice(-8)}`,
        order_id: payment.razorpayOrderId,
        prefill: {
          name: user ? `${user.fullName.firstName} ${user.fullName.lastName}` : undefined,
          email: user?.email,
        },
        handler: async (response) => {
          try {
            await verifyPayment(response).unwrap();
          } catch {
            // The webhook remains the source of truth; the success page polls.
          }
          navigate(`/orders/${order._id}/success`, { replace: true });
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
            setStep(1);
            setAlert(
              "Payment was cancelled. Your order is saved and can be paid from your orders.",
            );
          },
        },
      });

      checkout.open();
    } catch (error) {
      setIsPaying(false);
      setStep(1);
      setAlert(getErrorMessage(error, "Could not place your order."));
    }
  };

  return (
    <div className="shell py-12 sm:py-16">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cart
      </Link>

      <h1 className="text-section mt-6">Checkout</h1>

      <ol className="mt-8 flex items-center gap-3">
        {steps.map((label, index) => (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 text-[13px] ${
                index === step
                  ? "text-[var(--ink)]"
                  : index < step
                    ? "text-[var(--ink-muted)]"
                    : "text-[var(--ink-subtle)]"
              }`}
            >
              <span
                className={`tnum grid h-6 w-6 place-items-center rounded-full border text-[11px] ${
                  index < step
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : index === step
                      ? "border-[var(--ink)]"
                      : "border-[var(--border-strong)]"
                }`}
              >
                {index < step ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {label}
            </span>
            {index < steps.length - 1 && (
              <span className="h-px w-6 bg-[var(--border-strong)]" />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
        <div>
          {alert && (
            <div className="mb-6">
              <FormAlert message={alert} />
            </div>
          )}

          {step === 0 && (
            <form
              onSubmit={handleSubmit(submitAddress)}
              className="flex flex-col gap-5"
            >
              <h2 className="text-title text-lg font-medium">
                Where should this go?
              </h2>

              <Field label="Street" htmlFor="street" error={errors.street?.message}>
                <Input
                  id="street"
                  autoComplete="street-address"
                  invalid={Boolean(errors.street)}
                  {...register("street")}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="City" htmlFor="city" error={errors.city?.message}>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    invalid={Boolean(errors.city)}
                    {...register("city")}
                  />
                </Field>
                <Field label="State" htmlFor="state" error={errors.state?.message}>
                  <Input
                    id="state"
                    autoComplete="address-level1"
                    invalid={Boolean(errors.state)}
                    {...register("state")}
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Pincode"
                  htmlFor="pincode"
                  error={errors.pincode?.message}
                >
                  <Input
                    id="pincode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    invalid={Boolean(errors.pincode)}
                    {...register("pincode")}
                  />
                </Field>
                <Field
                  label="Country"
                  htmlFor="country"
                  error={errors.country?.message}
                >
                  <Input
                    id="country"
                    autoComplete="country-name"
                    invalid={Boolean(errors.country)}
                    {...register("country")}
                  />
                </Field>
              </div>

              <Button type="submit" size="lg" className="mt-2 self-start px-10">
                Continue to review
              </Button>
            </form>
          )}

          {step > 0 && address && (
            <div>
              <h2 className="text-title text-lg font-medium">Review</h2>

              <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] text-[var(--ink-muted)]">
                      Shipping to
                    </p>
                    <address className="mt-1.5 text-[14px] not-italic leading-relaxed">
                      {address.street}
                      <br />
                      {address.city}, {address.state} {address.pincode}
                      <br />
                      {address.country}
                    </address>
                  </div>
                  <button
                    onClick={() => setStep(0)}
                    disabled={isPaying}
                    className="text-[13px] underline underline-offset-4 disabled:opacity-40"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <ul className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {cart.cart.items.map((line) => (
                  <li
                    key={line.productId}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <span className="text-[14px]">
                      {line.title ?? "Unavailable"}
                      <span className="tnum ml-2 text-[var(--ink-muted)]">
                        ×{line.quantity}
                      </span>
                    </span>
                    <span className="tnum text-[14px]">
                      {line.lineTotal === null
                        ? "—"
                        : formatMoney(line.lineTotal, totals.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                onClick={placeAndPay}
                disabled={isPaying}
                className="mt-8 px-10"
              >
                {isPaying ? <Spinner /> : <Lock className="h-4 w-4" />}
                {isPaying ? "Opening payment…" : "Place order and pay"}
              </Button>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--raised)] p-6">
            <h2 className="text-title font-medium">Order total</h2>

            <dl className="mt-5 flex flex-col gap-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">
                  Subtotal ({totals.totalQuantity})
                </dt>
                <dd className="tnum">
                  {formatMoney(totals.subtotal, totals.currency)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex justify-between border-t border-[var(--border)] pt-5">
              <span className="font-medium">Total</span>
              <span className="tnum text-lg">
                {formatMoney(totals.subtotal, totals.currency)}
              </span>
            </div>

            <p className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-[var(--ink-subtle)]">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" />
              Card details go directly to Razorpay. We never see them.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
