import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="shell flex min-h-[70dvh] flex-col justify-center py-24">
      <p className="text-eyebrow text-[var(--ink-subtle)]">Error 404</p>

      <h1 className="text-display mt-6 max-w-[14ch]">
        This page is not on the shelf
      </h1>

      <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[var(--ink-muted)]">
        The link may be old, or the product may have been removed by its seller.
        Everything still for sale is in the catalog.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/discover">
          <Button size="lg">
            <Search className="h-4 w-4" />
            Browse the catalog
          </Button>
        </Link>
        <Link to="/">
          <Button size="lg" variant="secondary">
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
