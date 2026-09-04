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
        <nav className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/seller" aria-label="HiveMind" className="shrink-0">
              <Logo className="[&_span:last-child]:hidden sm:[&_span:last-child]:inline" />
            </Link>
            <span className="text-eyebrow hidden rounded-full border border-line-strong px-2 py-0.5 text-ink-muted sm:inline-block">
              Seller
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <NavLink
              to="/seller/account"
              aria-label="Account"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <User className="h-4 w-4" strokeWidth={1.75} />
            </NavLink>
            <button
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </nav>

        <div className="shell -mt-px flex gap-1 overflow-x-auto pb-0">
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
