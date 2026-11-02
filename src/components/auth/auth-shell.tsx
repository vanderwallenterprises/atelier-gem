import type { ReactNode } from "react";
import { FacetDiagram } from "@/components/brand/facet-diagram";
import { Notice, Skeleton } from "@/components/ui/primitives";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Two-panel layout for account pages: the form on ivory, and on wide screens an olive panel
 * with the facet drawing, the one decorative element on these pages.
 */
export function AuthShell({ title, lede, children, aside }: { title: string; lede?: ReactNode; children: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_minmax(0,34rem)]">
      <section className="flex items-center px-4 py-12 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-4xl">{title}</h1>
          {lede && <p className="mt-3 text-ink-soft">{lede}</p>}
          {!isSupabaseConfigured && (
            <Notice tone="warning" title="Accounts aren't connected yet" className="mt-6">
              The marketplace database hasn&rsquo;t been set up, so signing in and creating accounts don&rsquo;t work yet. You can still
              browse every public page.
            </Notice>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-olive text-on-olive lg:flex lg:flex-col lg:justify-end lg:p-14">
        <FacetDiagram
          className="pointer-events-none absolute -right-24 -top-16 w-[38rem] opacity-60"
          stroke="var(--color-brass)"
          strokeWidth={0.5}
        />
        <div className="relative max-w-sm font-serif text-2xl leading-snug">{aside}</div>
      </aside>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div role="status" aria-label="Loading form" className="grid gap-5">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-13" />
    </div>
  );
}
