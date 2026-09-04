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
        className="text-[13px] font-medium text-[var(--ink)]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--accent)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-[var(--ink-subtle)]">{hint}</p>
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
      className={`h-11 w-full rounded-[var(--radius-sm)] border bg-[var(--raised)] px-3.5 text-[15px] text-[var(--ink)] transition-colors placeholder:text-[var(--ink-subtle)] focus:outline-none focus-visible:border-[var(--ink)] ${
        invalid ? "border-[var(--accent)]" : "border-[var(--border-strong)]"
      } ${className}`}
      {...props}
    />
  ),
);

Input.displayName = "Input";
