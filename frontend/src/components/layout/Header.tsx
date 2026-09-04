import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--canvas)_72%,transparent)] backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent"
      }`}
    >
      <nav className="shell flex h-16 items-center justify-between gap-3">
        <Link to="/" aria-label="HiveMind home" className="shrink-0">
          <Logo className="[&_span:last-child]:hidden min-[380px]:[&_span:last-child]:inline" />
        </Link>

        <div className="hidden items-center gap-8 text-sm text-[var(--ink-muted)] lg:flex">
          <a href="#benefits" className="transition-colors hover:text-[var(--ink)]">
            Why HiveMind
          </a>
          <a href="#how" className="transition-colors hover:text-[var(--ink)]">
            How it works
          </a>
          <a href="#trust" className="transition-colors hover:text-[var(--ink)]">
            Trust
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary">Get started</Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
