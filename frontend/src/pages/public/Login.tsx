import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { useLoginMutation } from "@/services/auth.api";
import { getErrorMessage } from "@/lib/errors";

const schema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const [alert, setAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const onSubmit = async (values: FormValues) => {
    setAlert(null);

    const identifier = values.identifier.includes("@")
      ? { email: values.identifier }
      : { username: values.identifier };

    try {
      const { user } = await login({
        ...identifier,
        password: values.password,
      }).unwrap();

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? (user.role === "seller" ? "/seller" : "/discover"), {
        replace: true,
      });
    } catch (error) {
      setAlert(getErrorMessage(error, "Could not sign you in. Try again."));
    }
  };

  return (
    <div>
      <h1 className="font-display text-4xl">Welcome back</h1>
      <p className="mt-3 text-[15px] text-[var(--ink-muted)]">
        Sign in to keep shopping, or to manage your storefront.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-9 flex flex-col gap-5">
        <FormAlert message={alert} />

        <Field
          label="Email or username"
          htmlFor="identifier"
          error={errors.identifier?.message}
        >
          <Input
            id="identifier"
            autoComplete="username"
            autoFocus
            invalid={Boolean(errors.identifier)}
            placeholder="you@example.com"
            {...register("identifier")}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            placeholder="••••••••"
            {...register("password")}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isLoading} className="mt-1 w-full">
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-[14px] text-[var(--ink-muted)]">
        New to HiveMind?{" "}
        <Link
          to="/register"
          className="font-medium text-[var(--ink)] underline underline-offset-4 hover:text-[var(--accent)]"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
