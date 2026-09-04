import { Link, Outlet } from "react-router-dom";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";

const marks = [
  "Stock reserved at checkout, not after payment",
  "Every amount computed server-side",
  "Card details never touch our systems",
];

export function AuthLayout() {
  return (
    <div className="min-h-dvh overflow-x-clip lg:grid lg:grid-cols-[1fr_minmax(28rem,38%)]">
      <aside className="hidden flex-col justify-between bg-[var(--ink)] p-12 lg:flex">
        <Link to="/" aria-label="HiveMind home">
          <Logo className="text-[var(--canvas)]" />
        </Link>

        <div>
          <p className="font-display max-w-[16ch] text-4xl leading-[1.05] text-[var(--canvas)]">
            A marketplace built by many hands
          </p>
          <ul className="mt-10 space-y-3">
            {marks.map((mark) => (
              <li
                key={mark}
                className="flex items-start gap-3 text-[14px] text-[var(--ink-subtle)]"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                {mark}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-eyebrow text-[var(--ink-subtle)]">
          Independent sellers · One marketplace
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between px-6 py-6 lg:justify-end">
          <Link to="/" className="lg:hidden" aria-label="HiveMind home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[26rem]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
