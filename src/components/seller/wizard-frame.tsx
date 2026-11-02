import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { stepIndex, WIZARD_STEPS, type WizardStep } from "@/lib/domain/listing-wizard";

/**
 * Wizard layout: the steps in order down the side (a real sequence, so numbered), the
 * current step's form beside them. Steps only link once the draft exists.
 */
export function WizardFrame({ title, current, listingId, status, children }: {
  title: string;
  current: WizardStep;
  listingId?: string;
  status?: ReactNode;
  children: ReactNode;
}) {
  const at = stepIndex(current);
  return (
    <Container className="py-12">
      <Link href="/seller" className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
        Your listings
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {status}
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Listing steps">
          <ol className="flex gap-1 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0">
            {WIZARD_STEPS.map((s, i) => {
              const isCurrent = i === at;
              const label = (
                <>
                  <span className={cn("font-serif text-lg tabular-nums", isCurrent ? "text-brass" : "text-ink-muted")}>{i + 1}</span>
                  <span className="whitespace-nowrap">{s.title}</span>
                </>
              );
              const cls = cn(
                "flex items-baseline gap-3 rounded-md px-3 py-2 text-sm",
                isCurrent ? "bg-paper font-medium text-ink shadow-[inset_2px_0_0_var(--color-brass)]" : "text-ink-soft",
              );
              return (
                <li key={s.key}>
                  {listingId && !isCurrent ? (
                    <Link href={`/seller/listings/${listingId}?step=${s.key}`} className={cn(cls, "hover:bg-paper hover:text-ink")}>
                      {label}
                    </Link>
                  ) : (
                    <span className={cls} aria-current={isCurrent ? "step" : undefined}>
                      {label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <section aria-labelledby="step-heading" className="min-w-0 max-w-3xl">
          <h2 id="step-heading" className="text-3xl">{WIZARD_STEPS[at].title}</h2>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </Container>
  );
}
