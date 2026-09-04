import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { Logo } from "../ui/Logo";

const columns = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse products", to: "/discover" },
      { label: "Sell on HiveMind", to: "/register" },
      { label: "Sign in", to: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", to: "/privacy" },
      { label: "Terms of service", to: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--sunken)]">
      <div className="shell py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-[var(--ink-muted)]">
              A marketplace where independent sellers list their work and buyers
              find it. Built as nine services that each do one job.
            </p>
          </div>

          <div className="flex flex-wrap gap-10 sm:gap-14">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--ink-muted)]">
            © {new Date().getFullYear()} HiveMind. Payments processed by
            Razorpay.
          </p>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            Back to top
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
