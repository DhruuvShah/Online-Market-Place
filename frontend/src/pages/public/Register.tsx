import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { useLoginMutation, useRegisterMutation } from "@/services/auth.api";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";
import type { Role } from "@/types";

const schema = z.object({
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  username: z.string().trim().min(3, "At least 3 characters"),
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

const roles: { value: Role; icon: typeof Store; title: string; body: string }[] =
  [
    {
      value: "user",
      icon: ShoppingBag,
      title: "I want to buy",
      body: "Browse the catalog, build a cart, and check out.",
    },
    {
      value: "seller",
      icon: Store,
      title: "I want to sell",
      body: "List products, manage stock, and track your orders.",
    },
  ];

export default function Register() {
  const navigate = useNavigate();
  const [createAccount, { isLoading: isRegistering }] = useRegisterMutation();
  const [login, { isLoading: isSigningIn }] = useLoginMutation();
  const [role, setRole] = useState<Role>("user");
  const [alert, setAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const isBusy = isRegistering || isSigningIn;

  const onSubmit = async (values: FormValues) => {
    setAlert(null);

    try {
      await createAccount({
        username: values.username,
        email: values.email,
        password: values.password,
        fullName: { firstName: values.firstName, lastName: values.lastName },
        role,
      }).unwrap();

      await login({ email: values.email, password: values.password }).unwrap();
      navigate(role === "seller" ? "/seller" : "/discover", { replace: true });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      for (const [path, message] of Object.entries(fieldErrors)) {
        if (path in schema.shape) {
          setError(path as keyof FormValues, { message });
        }
      }

      setAlert(
        getErrorMessage(error, "Could not create your account. Try again."),
      );
    }
  };

  return (
    <div>
      <h1 className="font-display text-4xl">Create your account</h1>
      <p className="mt-3 text-[15px] text-[var(--ink-muted)]">
        One account, either side of the marketplace.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-9 flex flex-col gap-5">
        <FormAlert message={alert} />

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-[13px] font-medium">
            How will you use HiveMind?
          </legend>

          {roles.map((option) => {
            const selected = role === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer gap-3 rounded-[var(--radius-md)] border p-3.5 transition-colors ${
                  selected
                    ? "border-[var(--ink)] bg-[var(--raised)]"
                    : "border-[var(--border-strong)] hover:border-[var(--ink-subtle)]"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={selected}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <option.icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    selected ? "text-[var(--accent)]" : "text-[var(--ink-subtle)]"
                  }`}
                  strokeWidth={1.75}
                />
                <span>
                  <span className="block text-[14px] font-medium">
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-[var(--ink-muted)]">
                    {option.body}
                  </span>
                </span>
              </label>
            );
          })}

          <p className="text-[13px] text-[var(--ink-subtle)]">
            This cannot be changed later.
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="First name"
            htmlFor="firstName"
            error={errors.firstName?.message}
          >
            <Input
              id="firstName"
              autoComplete="given-name"
              invalid={Boolean(errors.firstName)}
              {...register("firstName")}
            />
          </Field>

          <Field
            label="Last name"
            htmlFor="lastName"
            error={errors.lastName?.message}
          >
            <Input
              id="lastName"
              autoComplete="family-name"
              invalid={Boolean(errors.lastName)}
              {...register("lastName")}
            />
          </Field>
        </div>

        <Field
          label="Username"
          htmlFor="username"
          error={errors.username?.message}
        >
          <Input
            id="username"
            autoComplete="username"
            invalid={Boolean(errors.username)}
            {...register("username")}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 6 characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isBusy} className="mt-1 w-full">
          {isBusy ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-[13px] leading-relaxed text-[var(--ink-subtle)]">
          By creating an account you agree to our{" "}
          <Link to="/terms" className="underline underline-offset-2">
            terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-8 text-[14px] text-[var(--ink-muted)]">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-[var(--ink)] underline underline-offset-4 hover:text-[var(--accent)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
