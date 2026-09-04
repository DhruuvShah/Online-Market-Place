import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { LogOut, ShoppingCart, User } from "lucide-react";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Footer } from "./Footer";
import { useCartQuery } from "@/services/cart.api";
import { useLogoutMutation } from "@/services/auth.api";
import { spring } from "../motion/springs";

const links = [
  { to: "/discover", label: "Discover" },
  { to: "/orders", label: "Orders" },
];

function CartBadge() {
  const { data } = useCartQuery();
  const reduced = useReducedMotion();
  const count = data?.totals.totalQuantity ?? 0;

  return (
    <NavLink
      to="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--ink)]"
    >
      <ShoppingCart className="h-4 w-4" strokeWidth={1.75} />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={reduced ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={spring.momentum}
            className="tnum absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--accent-contrast)]"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  );
}

export function ShopLayout() {
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const signOut = async () => {
    await logout().unwrap().catch(() => undefined);
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--canvas)_80%,transparent)] backdrop-blur-xl">
        <nav className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/discover" aria-label="HiveMind" className="shrink-0">
              <Logo className="[&_span:last-child]:hidden sm:[&_span:last-child]:inline" />
            </Link>

            <div className="flex items-center gap-6">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `text-[14px] transition-colors ${
                      isActive
                        ? "text-[var(--ink)]"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <CartBadge />
            <NavLink
              to="/account"
              aria-label="Account"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--ink)]"
            >
              <User className="h-4 w-4" strokeWidth={1.75} />
            </NavLink>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--ink)]"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
