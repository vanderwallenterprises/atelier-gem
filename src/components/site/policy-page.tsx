import Link from "next/link";
import { brand } from "@/config/brand";
import { Container, Notice } from "@/components/ui/primitives";
import { policies, type Policy } from "@/content/policies";

export function PolicyPage({ policy }: { policy: Policy }) {
  return (
    <Container className="grid gap-12 py-14 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="Policies" className="order-2 lg:order-1">
        <ul className="grid gap-1 text-sm lg:sticky lg:top-24">
          {Object.values(policies).map((p) => (
            <li key={p.slug}>
              <Link
                href={p.slug === "terms" || p.slug === "privacy" ? `/${p.slug}` : `/policies/${p.slug}`}
                aria-current={p.slug === policy.slug ? "page" : undefined}
                className="block rounded-md px-3 py-1.5 text-ink-soft hover:bg-vellum hover:text-ink aria-[current=page]:bg-vellum aria-[current=page]:text-ink"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose-policy order-1 max-w-[68ch] lg:order-2">
        <h1 className="text-4xl sm:text-5xl">{policy.title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{policy.summary}</p>
        {!brand.policiesReviewed && (
          <Notice tone="warning" className="mt-6" title="Draft, not yet legally reviewed">
            This page describes how the marketplace currently works. It has not been reviewed by a lawyer and isn&rsquo;t
            final.
          </Notice>
        )}
        {policy.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
            {s.list && (
              <ul>
                {s.list.map((li, i) => <li key={i}>{li}</li>)}
              </ul>
            )}
          </section>
        ))}
      </article>
    </Container>
  );
}
