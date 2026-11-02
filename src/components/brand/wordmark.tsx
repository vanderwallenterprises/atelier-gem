import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";
import { FacetDiagram } from "./facet-diagram";

export function Wordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "on-olive" }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap font-serif text-[1.4rem] leading-none tracking-[-0.01em]",
        tone === "on-olive" ? "text-on-olive" : "text-ink",
        className,
      )}
      aria-label={`${brand.name} home`}
    >
      <FacetDiagram className="size-6 shrink-0" strokeWidth={1.6} />
      <span>
        {brand.wordmark.primary} {brand.wordmark.secondary}
      </span>
    </Link>
  );
}
