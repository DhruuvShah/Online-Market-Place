import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-medium text-ink"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-accent">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = ComponentPropsWithoutRef<"input"> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`h-11 w-full rounded-sm border bg-raised px-3.5 text-[15px] text-ink transition-colors placeholder:text-ink-subtle focus:outline-none focus-visible:border-ink ${
        invalid ? "border-accent" : "border-line-strong"
      } ${className}`}
      {...props}
    />
  ),
);

Input.displayName = "Input";
