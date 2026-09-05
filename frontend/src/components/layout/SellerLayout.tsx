import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut, Package, ReceiptText, User } from "lucide-react";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useLogoutMutation } from "@/services/auth.api";

const links = [
  { to: "/seller", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/seller/products", label: "Products", icon: Package, end: false },
  { to: "/seller/orders", label: "Orders", icon: ReceiptText, end: false },
];

export function SellerLayout() {
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const signOut = async () => {
    await logout().unwrap().catch(() => undefined);
    void navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <header className="sticky top-0 z-50 border-b border-line bg-[color-mix(in_srgb,var(--color-canvas)_80%,transparent)] backdrop-blur-xl">
        {/* Mirrors the shopper header: controls left, mark right, section tabs
            gathered just ahead of the mark. */}
        <nav className="shell flex h-16 items-center gap-4">
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <NavLink
              to="/seller/account"
              aria-label="Account"
              className="text-ink-muted hover:bg-raised hover:text-ink inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            >
              <User className="h-4 w-4" strokeWidth={1.75} />
            </NavLink>
            <button
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="text-ink-muted hover:bg-raised hover:text-ink inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-4 sm:gap-8">
            <div className="hidden items-center gap-1 md:flex">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[14px] leading-none transition-colors ${
                      isActive
                        ? "bg-sunken text-ink"
                        : "text-ink-muted hover:text-ink"
                    }`
                  }
                >
                  <link.icon className="h-4 w-4" strokeWidth={1.75} />
                  {link.label}
                </NavLink>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <span className="text-eyebrow border-line-strong text-ink-muted hidden rounded-full border px-2 py-0.5 sm:inline-block">
                Seller
              </span>
              <Link
                to="/seller"
                aria-label="HiveMind"
                className="flex shrink-0 items-center"
              >
                <Logo className="[&_span:last-child]:hidden sm:[&_span:last-child]:inline" />
              </Link>
            </div>
          </div>
        </nav>

        {/* Below md the tabs need the full width, so they drop to their own row
            rather than being crushed against the mark. */}
        <div className="shell border-line flex gap-1 overflow-x-auto border-t md:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[14px] transition-colors ${
                  isActive
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`
              }
            >
              <link.icon className="h-4 w-4" strokeWidth={1.75} />
              {link.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
